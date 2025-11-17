import WorkYear from '../models/workYearModel.js';
import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';
import { GoogleGenAI, createUserContent, createPartFromUri } from '@google/genai';

// Initialize Gemini AI with API key
const genAI = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY
});

// Centralized model configuration
const MODEL_NAME = 'gemini-2.5-flash';

// Rate limiting store (in-memory, replace with Redis for production)
const rateLimitStore = new Map();

// Request queue for handling RPM limits
const requestQueue = [];
let isProcessingQueue = false;

// Token usage tracking
let totalTokensToday = 0;
let totalRequestsToday = 0;
let dailyResetTime = new Date();
dailyResetTime.setHours(24, 0, 0, 0);

// Constants for rate limiting
const RATE_LIMITS = {
  requestsPerMinute: 15,
  requestsPerDay: 1500,
  maxTokensPerDay: 900000, // Leave buffer from 1M limit
  maxTokensPerRequest: 30000
};

// Reset daily counters at midnight
setInterval(() => {
  const now = new Date();
  if (now >= dailyResetTime) {
    totalTokensToday = 0;
    totalRequestsToday = 0;
    dailyResetTime = new Date();
    dailyResetTime.setHours(24, 0, 0, 0);
    console.log('🔄 Daily AI usage counters reset');
  }
}, 60000); // Check every minute

// Rate limiting middleware
const checkRateLimit = (userId) => {
  const now = Date.now();
  const userKey = userId || 'anonymous';
  
  if (!rateLimitStore.has(userKey)) {
    rateLimitStore.set(userKey, { requests: [], dailyRequests: 0 });
  }
  
  const userData = rateLimitStore.get(userKey);
  
  // Clean up requests older than 1 minute
  userData.requests = userData.requests.filter(timestamp => now - timestamp < 60000);
  
  // Check per-minute limit - return shouldQueue instead of error
  if (userData.requests.length >= RATE_LIMITS.requestsPerMinute) {
    return {
      allowed: false,
      shouldQueue: true,
      error: `Rate limit exceeded. Request queued.`
    };
  }
  
  // Check daily limit - don't queue, reject immediately
  if (userData.dailyRequests >= RATE_LIMITS.requestsPerDay) {
    return {
      allowed: false,
      shouldQueue: false,
      error: `Daily limit reached. Max ${RATE_LIMITS.requestsPerDay} requests per day.`
    };
  }
  
  // Check global daily token limit - don't queue, reject immediately
  if (totalTokensToday >= RATE_LIMITS.maxTokensPerDay) {
    return {
      allowed: false,
      shouldQueue: false,
      error: 'System token quota nearly exhausted. Please try again later.'
    };
  }
  
  // Update counters
  userData.requests.push(now);
  userData.dailyRequests++;
  totalRequestsToday++;
  
  return { allowed: true, shouldQueue: false };
};

// Sanitize data before sending to Gemini
const sanitizeData = (data) => {
  if (!data) return data;
  
  // Remove potential PII fields
  const sensitiveFields = ['email', 'phone', 'address', 'ssn', 'id', '_id', 'password'];
  
  if (typeof data === 'object') {
    const sanitized = Array.isArray(data) ? [...data] : { ...data };
    
    Object.keys(sanitized).forEach(key => {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        delete sanitized[key];
      }
    });
    
    return sanitized;
  }
  
  return data;
};

// Log token usage to console
const logUsage = (inputTokens, outputTokens, requestType) => {
  const totalTokens = inputTokens + outputTokens;
  totalTokensToday += totalTokens;
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🤖 GEMINI API USAGE LOG');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 Request Type: ${requestType}`);
  console.log(`📥 Input Tokens:  ${inputTokens.toLocaleString()}`);
  console.log(`📤 Output Tokens: ${outputTokens.toLocaleString()}`);
  console.log(`🔢 Total Tokens:  ${totalTokens.toLocaleString()}`);
  console.log('─────────────────────────────────────────────────────');
  console.log(`📈 Today's Usage:`);
  console.log(`   • Total Requests: ${totalRequestsToday.toLocaleString()}`);
  console.log(`   • Total Tokens:   ${totalTokensToday.toLocaleString()} / ${RATE_LIMITS.maxTokensPerDay.toLocaleString()}`);
  console.log(`   • Remaining:      ${(RATE_LIMITS.maxTokensPerDay - totalTokensToday).toLocaleString()} tokens`);
  console.log(`   • Usage:          ${((totalTokensToday / RATE_LIMITS.maxTokensPerDay) * 100).toFixed(2)}%`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
};

// Process queued requests
const processQueue = async () => {
  if (isProcessingQueue || requestQueue.length === 0) return;
  
  isProcessingQueue = true;
  console.log(`📬 Processing queue: ${requestQueue.length} requests pending`);
  
  while (requestQueue.length > 0) {
    const queuedRequest = requestQueue[0];
    const { userId } = queuedRequest;
    
    // Check if we can process this request now
    const rateLimitCheck = checkRateLimit(userId);
    
    if (rateLimitCheck.allowed) {
      // Remove from queue
      const request = requestQueue.shift();
      console.log(`✅ Processing queued request for user: ${userId}`);
      
      // Process the request
      try {
        await executeRequest(request);
      } catch (error) {
        console.error('❌ Error processing queued request:', error.message);
        request.reject(error);
      }
    } else if (!rateLimitCheck.shouldQueue) {
      // Daily limit reached, reject all remaining requests
      const request = requestQueue.shift();
      console.log(`❌ Rejecting queued request: ${rateLimitCheck.error}`);
      request.reject(new Error(rateLimitCheck.error));
    } else {
      // Still rate limited, wait for next cycle
      break;
    }
  }
  
  isProcessingQueue = false;
};

// Execute a single AI request
const executeRequest = async ({ query, statistics, chartConfig, csvSummary, csvData, context, resolve, reject }) => {
  try {
    const sanitizedStats = sanitizeData(statistics);
    const sanitizedCsv = sanitizeData(csvSummary);
    const geminiFileUri = context?.geminiFileUri;
    
    let result;
    console.log(`Gemini File URI: ${geminiFileUri}`);
    // Use Gemini File API if URI is available
    if (geminiFileUri) {
      console.log(`📎 Using Gemini File API: ${geminiFileUri}`);
      // Use SDK helper functions to properly format file reference
      result = await genAI.models.generateContent({
        model: MODEL_NAME,
        contents: createUserContent([
          createPartFromUri(geminiFileUri, 'text/csv'),
          buildLightweightPrompt(query, sanitizedStats, context)
        ])
      });
    } else {
      // Fallback to inline CSV
      console.log('📄 Using inline CSV (no Gemini File URI)');
      const contextPrompt = buildContextPrompt(query, sanitizedStats, chartConfig, sanitizedCsv, csvData, context);
      result = await genAI.models.generateContent({
        model: MODEL_NAME,
        contents: [{ role: 'user', parts: [{ text: contextPrompt }] }]
      });
    }
    
    // The SDK returns response directly, not wrapped
    const text = result.text;
    
    // Extract token usage
    const usageMetadata = result.usageMetadata || {};
    const inputTokens = usageMetadata.promptTokenCount || 0;
    const outputTokens = usageMetadata.candidatesTokenCount || 0;
    
    // Log usage to console
    logUsage(inputTokens, outputTokens, 'Data Analysis');
    
    resolve({
      success: true,
      response: text,
      metadata: {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        model: MODEL_NAME,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    reject(error);
  }
};

// Start queue processor - runs every 5 seconds
setInterval(() => {
  processQueue();
}, 5000);

// Main analyze endpoint
export const analyzeData = async (req, res) => {
  try {
    const { query, statistics, chartConfig, csvSummary, csvData, context } = req.body;
    console.log('Context received (analyzeData):', JSON.stringify(context, null, 2));
    console.log('CSV Data from frontend:', csvData ? `${csvData.length} characters` : 'null');
    
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Query is required' 
      });
    }
    
    // Rate limiting check
    const userId = req.body.userId || req.ip;
    const rateLimitCheck = checkRateLimit(userId);
    
    if (!rateLimitCheck.allowed) {
      if (rateLimitCheck.shouldQueue) {
        // Add to queue for per-minute limit
        console.log(`📥 Queueing request for user: ${userId}, Queue size: ${requestQueue.length + 1}`);
        
        return new Promise((resolve, reject) => {
          requestQueue.push({
            query,
            statistics,
            chartConfig,
            csvSummary,
            csvData,
            context,
            userId,
            resolve: (result) => res.json(result),
            reject: (error) => {
              console.error('❌ Queued request error:', error.message);
              if (error.message.includes('Daily limit')) {
                res.status(429).json({
                  success: false,
                  message: error.message,
                  errorType: 'RATE_LIMIT'
                });
              } else if (error.message.includes('API_KEY')) {
                res.status(500).json({
                  success: false,
                  message: 'AI service configuration error. Please contact administrator.',
                  errorType: 'CONFIG_ERROR'
                });
              } else if (error.message.includes('quota')) {
                res.status(429).json({
                  success: false,
                  message: 'AI service quota exceeded. Please try again later.',
                  errorType: 'QUOTA_EXCEEDED'
                });
              } else {
                res.status(500).json({
                  success: false,
                  message: 'Failed to analyze data. Please try again.',
                  errorType: 'SERVER_ERROR'
                });
              }
            }
          });
          
          // Trigger queue processing
          processQueue();
        });
      } else {
        // Daily limit or token limit - reject immediately
        return res.status(429).json({
          success: false,
          message: rateLimitCheck.error,
          errorType: 'RATE_LIMIT'
        });
      }
    }
    
    // Process immediately if rate limit not exceeded
    await new Promise((resolve, reject) => {
      executeRequest({ query, statistics, chartConfig, csvSummary, csvData, context, userId, resolve: (result) => { res.json(result); resolve(); }, reject });
    });
    
  } catch (error) {
    console.error('❌ AI Analysis Error:', error.message);
    
    // Handle specific Gemini API errors
    if (error.message.includes('API_KEY')) {
      return res.status(500).json({
        success: false,
        message: 'AI service configuration error. Please contact administrator.',
        errorType: 'CONFIG_ERROR'
      });
    }
    
    if (error.message.includes('quota')) {
      return res.status(429).json({
        success: false,
        message: 'AI service quota exceeded. Please try again later.',
        errorType: 'QUOTA_EXCEEDED'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to analyze data. Please try again.',
      errorType: 'SERVER_ERROR'
    });
  }
};

// Build lightweight prompt for Gemini File API (no inline CSV)
const buildLightweightPrompt = (query, statistics, context) => {
  const isSimple = query.length < 50 && /what|name|how many|which|when|where/i.test(query);
  const maxWords = query.length < 30 ? 50 : query.length < 100 ? 150 : 300;

  let prompt = `You are analyzing the CSV file that was uploaded. Answer this question concisely:\n\nQUERY: ${query}\n\n`;

  if (context) {
    prompt += `CONTEXT:\n`;
    if (context.sourceFileName) prompt += `- File: ${context.sourceFileName}\n`;
    if (context.entryName) prompt += `- Process: ${context.entryName}\n`;
    if (context.responseCount) prompt += `- Responses: ${context.responseCount}\n`;
    if (context.programName) prompt += `- Program: ${context.programName}\n`;
    if (context.organizationName) prompt += `- Organization: ${context.organizationName}\n`;
    if (context.year) prompt += `- Year: ${context.year}\n\n`;
  }

  if (statistics && Object.keys(statistics).length > 0) {
    prompt += `STATISTICS:\n${JSON.stringify(statistics, null, 2)}\n\n`;
  }

  prompt += isSimple 
    ? `Answer in 1-2 sentences. State only what was asked.\n\nYour response:`
    : `Provide focused analysis (max ${maxWords} words). Use bullets only for multiple points.\n\nYour response:`;

  return prompt;
};

// Build comprehensive context prompt for Gemini
const buildContextPrompt = (query, statistics, chartConfig, csvSummary, csvData, context) => {
  const isSimple = query.length < 50 && /what|name|how many|which|when|where/i.test(query);
  const maxWords = query.length < 30 ? 50 : query.length < 100 ? 150 : 300;

  console.log('Context received (buildContextPrompt):', JSON.stringify(context, null, 2));
  console.log('CSV Data present:', csvData ? `Yes (${csvData.length} chars)` : 'No');
  console.log('CSV Data: ', `${csvData}`);
  console.log('CSV Summary present:', csvSummary ? 'Yes' : 'No');
  
  let prompt = `You are a concise data analyst. Answer directly matching question complexity. For factual questions, give brief answers. For analysis, stay focused.

USER QUERY: ${query}

`;

  if (context) {
    prompt += `PROCESS INFO:\n`;
    if (context.sourceFileName) prompt += `- CSV File: ${context.sourceFileName}\n`;
    if (context.entryName) prompt += `- Process Name: ${context.entryName}\n`;
    if (context.processId) prompt += `- Process ID: ${context.processId}\n`;
    if (context.responseCount) prompt += `- Responses: ${context.responseCount}\n`;
    if (context.programName) prompt += `- Program: ${context.programName}\n`;
    if (context.organizationName) prompt += `- Organization: ${context.organizationName}\n`;
    if (context.year) prompt += `- Year: ${context.year}\n\n`;
  }

  /*if (csvData) {
    prompt += `SURVEY DATA:\n${csvData}\n`;
  }*/ 
  if (csvSummary) {
    prompt += `DATA: ${csvSummary.totalRows} rows, ${csvSummary.totalColumns} columns\n`;
    if (csvSummary.columns) prompt += `Columns: ${csvSummary.columns.join(', ')}\n\n`;
  }

  if (statistics && Object.keys(statistics).length > 0) {
    prompt += `STATISTICS:\n${JSON.stringify(statistics, null, 2)}\n\n`;
  }

  prompt += isSimple 
    ? `Answer in 1-2 sentences. State only what was asked. No elaboration.\n\nYour response:`
    : `Provide ${maxWords < 100 ? 'brief' : 'focused'} analysis (max ${maxWords} words). Use bullets only for multiple points. No generic advice.\n\nYour response:`;

  return prompt;
};

// Get current usage statistics
export const getUsageStats = async (req, res) => {
  try {
    const remainingTokens = RATE_LIMITS.maxTokensPerDay - totalTokensToday;
    const usagePercentage = (totalTokensToday / RATE_LIMITS.maxTokensPerDay) * 100;
    
    res.json({
      success: true,
      stats: {
        totalRequestsToday,
        totalTokensToday,
        remainingTokens,
        usagePercentage: usagePercentage.toFixed(2),
        limits: RATE_LIMITS,
        resetTime: dailyResetTime.toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve usage stats'
    });
  }
};

// Get model name
export const getModelName = (req, res) => res.json({ success: true, model: MODEL_NAME });
