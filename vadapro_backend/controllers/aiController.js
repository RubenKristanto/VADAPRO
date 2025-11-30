import { GoogleGenAI, createUserContent, createPartFromUri } from '@google/genai';

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const MODEL_NAME = 'gemini-2.5-flash';

const rateLimitStore = new Map();

const requestQueue = [];
let isProcessingQueue = false;

let totalTokensThisMinute = 0;
let totalRequestsToday = 0;

let minuteResetTime = new Date();
minuteResetTime.setMinutes(minuteResetTime.getMinutes() + 1);
minuteResetTime.setSeconds(0, 0);

let dailyResetTime = new Date();
dailyResetTime.setHours(24, 0, 0, 0);

const RATE_LIMITS = {
  requestsPerMinute: 10,
  requestsPerDay: 250,
  maxTokensPerMinute: 250000,
};

setInterval(() => {
  const now = new Date();
  if (now >= minuteResetTime) {
    totalTokensThisMinute = 0;
    minuteResetTime = new Date();
    minuteResetTime.setMinutes(minuteResetTime.getMinutes() + 1);
    minuteResetTime.setSeconds(0, 0);
    console.log('Minute AI token counters reset');
  }
  if (now >= dailyResetTime) {
    totalRequestsToday = 0;
    dailyResetTime = new Date();
    dailyResetTime.setHours(24, 0, 0, 0);
    console.log('Daily AI usage counters reset');
  }
}, 1000);

const checkRateLimit = (userId) => {
  const now = Date.now();
  const userKey = userId || 'anonymous';
  if (!rateLimitStore.has(userKey)) {
    rateLimitStore.set(userKey, { requests: [], dailyRequests: 0 });
  }
  const userData = rateLimitStore.get(userKey);
  userData.requests = userData.requests.filter(timestamp => now - timestamp < 60000);
  if (userData.requests.length >= RATE_LIMITS.requestsPerMinute) {
    return { allowed: false, shouldQueue: true, error: `Rate limit exceeded. Request queued.` };
  }
  if (userData.dailyRequests >= RATE_LIMITS.requestsPerDay) {
    return { allowed: false, shouldQueue: false, error: `Daily limit reached. Max ${RATE_LIMITS.requestsPerDay} requests per day.` };
  }
  if (totalTokensThisMinute >= RATE_LIMITS.maxTokensPerMinute) {
    return { allowed: false, shouldQueue: false, error: 'System token quota for this minute exhausted. Please try again shortly.' };
  }
  userData.requests.push(now);
  userData.dailyRequests++;
  totalRequestsToday++;
  return { allowed: true, shouldQueue: false };
};

const sanitizeData = (data) => {
  if (!data) return data;
  const sensitiveFields = ['email', 'phone', 'address', 'id', '_id', 'password'];
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

const logUsage = (inputTokens, outputTokens, requestType) => {
  const totalTokens = inputTokens + outputTokens;
  totalTokensThisMinute += totalTokens;
  console.log('🤖 GEMINI API USAGE LOG');
  console.log(`📊 Request Type: ${requestType}`);
  console.log(`📥 Input Tokens:  ${inputTokens.toLocaleString()}`);
  console.log(`📤 Output Tokens: ${outputTokens.toLocaleString()}`);
  console.log(`🔢 Total Tokens:  ${totalTokens.toLocaleString()}`);
  console.log(`📈 Today's Usage:`);
  console.log(`   • Total Requests: ${totalRequestsToday.toLocaleString()}`);
  console.log(`   • Total Tokens (this minute):   ${totalTokensThisMinute.toLocaleString()} / ${RATE_LIMITS.maxTokensPerMinute.toLocaleString()}`);
  console.log(`   • Remaining (this minute):      ${(RATE_LIMITS.maxTokensPerMinute - totalTokensThisMinute).toLocaleString()} tokens`);
  console.log(`   • Usage (this minute):          ${((totalTokensThisMinute / RATE_LIMITS.maxTokensPerMinute) * 100).toFixed(2)}%`);
};

const processQueue = async () => {
  if (isProcessingQueue || requestQueue.length === 0) return;
  isProcessingQueue = true;
  console.log(`Processing queue: ${requestQueue.length} requests pending`);
  while (requestQueue.length > 0) {
    const queuedRequest = requestQueue[0];
    const { userId } = queuedRequest;
    const rateLimitCheck = checkRateLimit(userId);
    if (rateLimitCheck.allowed) {
      const request = requestQueue.shift();
      console.log(`Processing queued request for user: ${userId}`);
      try {
        await executeRequest(request);
      } catch (error) {
        console.error('Error processing queued request:', error.message);
        request.reject(error);
      }
    } else if (!rateLimitCheck.shouldQueue) {
      const request = requestQueue.shift();
      console.log(`Rejecting queued request: ${rateLimitCheck.error}`);
      request.reject(new Error(rateLimitCheck.error));
    } else {
      break;
    }
  }
  isProcessingQueue = false;
};

const executeRequest = async ({ query, statistics, chartConfig, csvSummary, csvData, context, resolve, reject }) => {
  try {
    const sanitizedStats = sanitizeData(statistics);
    const sanitizedCsv = sanitizeData(csvSummary);
    const geminiFileUri = context?.geminiFileUri;
    let result;
    console.log(`Gemini File URI: ${geminiFileUri}`);
    if (geminiFileUri) {
      console.log(`Using Gemini File API: ${geminiFileUri}`);
      result = await genAI.models.generateContent({ // built-in function from gemini SDK to generate answer using AI
        model: MODEL_NAME,
        contents: createUserContent([
          createPartFromUri(geminiFileUri, 'text/csv'),
          buildLightweightPrompt(query, sanitizedStats, context)
        ])
      });
    } else {
      console.log('Gemini File URI missing. Using text-only mode.');
      result = await genAI.models.generateContent({
        model: MODEL_NAME,
        contents: createUserContent([
          buildContextPrompt(query, sanitizedStats, chartConfig, sanitizedCsv, csvData, context)
        ])
      });
    }
    const text = result.text;
    const usageMetadata = result.usageMetadata || {};
    const inputTokens = usageMetadata.promptTokenCount || 0;
    const outputTokens = usageMetadata.candidatesTokenCount || 0;
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

setInterval(() => {
  processQueue();
}, 5000);

export const analyzeData = async (req, res) => {
  try {
    const { query, statistics, chartConfig, csvSummary, csvData, context } = req.body;
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Query is required' });
    }
    const userId = req.body.userId || req.ip;
    const rateLimitCheck = checkRateLimit(userId);
    if (!rateLimitCheck.allowed) {
      if (rateLimitCheck.shouldQueue) {
        console.log(`Queueing request for user: ${userId}, Queue size: ${requestQueue.length + 1}`);
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
              console.error('Queued request error:', error.message);
              if (error.message.includes('Daily limit')) {
                res.status(429).json({ success: false, message: error.message, errorType: 'RATE_LIMIT' });
              } else if (error.message.includes('API_KEY')) {
                res.status(500).json({ success: false, message: 'AI service configuration error. Please contact administrator.', errorType: 'CONFIG_ERROR' });
              } else if (error.message.includes('quota')) {
                res.status(429).json({ success: false, message: 'AI service quota exceeded. Please try again later.', errorType: 'QUOTA_EXCEEDED' });
              } else {
                res.status(500).json({ success: false, message: 'Failed to analyze data. Please try again.', errorType: 'SERVER_ERROR' });
              }
            }
          });
          processQueue();
        });
      } else {
        return res.status(429).json({ success: false, message: rateLimitCheck.error, errorType: 'RATE_LIMIT' });
      }
    }
    await new Promise((resolve, reject) => {
      executeRequest({ query, statistics, chartConfig, csvSummary, csvData, context, userId, resolve: (result) => { res.json(result); resolve(); }, reject });
    });
  } catch (error) {
    console.error('AI Analysis Error:', error.message);
    if (error.message.includes('API_KEY')) {
      return res.status(500).json({ success: false, message: 'AI service configuration error. Please contact administrator.', errorType: 'CONFIG_ERROR' });
    }
    if (error.message.includes('quota')) {
      return res.status(429).json({ success: false, message: 'AI service quota exceeded. Please try again later.', errorType: 'QUOTA_EXCEEDED' });
    }
    res.status(500).json({ success: false, message: 'Failed to analyze data. Please try again.', errorType: 'SERVER_ERROR' });
  }
};

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
  prompt += isSimple ? `Answer in 1-2 sentences. State only what was asked.\n\nYour response:` : `Provide focused analysis (max ${maxWords} words). Use bullets only for multiple points.\n\nYour response:`;
  return prompt;
};

const buildContextPrompt = (query, statistics, chartConfig, csvSummary, csvData, context) => {
  const isSimple = query.length < 50 && /what|name|how many|which|when|where/i.test(query);
  const maxWords = query.length < 30 ? 50 : query.length < 100 ? 150 : 300;
  let prompt = `You are a concise data analyst. Answer directly matching question complexity. For factual questions, give brief answers. For analysis, stay focused.\n\nUSER QUERY: ${query}\n\n`;
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
  if (csvSummary) {
    prompt += `DATA: ${csvSummary.totalRows} rows, ${csvSummary.totalColumns} columns\n`;
    if (csvSummary.columns) prompt += `Columns: ${csvSummary.columns.join(', ')}\n\n`;
  }
  if (statistics && Object.keys(statistics).length > 0) {
    prompt += `STATISTICS:\n${JSON.stringify(statistics, null, 2)}\n\n`;
  }
  prompt += isSimple ? `Answer in 1-2 sentences. State only what was asked. No elaboration.\n\nYour response:` : `Provide ${maxWords < 100 ? 'brief' : 'focused'} analysis (max ${maxWords} words). Use bullets only for multiple points. No generic advice.\n\nYour response:`;
  return prompt;
};

export const getUsageStats = async (req, res) => {
  try {
    const remainingTokens = RATE_LIMITS.maxTokensPerMinute - totalTokensThisMinute;
    const usagePercentage = (totalTokensThisMinute / RATE_LIMITS.maxTokensPerMinute) * 100;
    res.json({
      success: true,
      stats: {
        totalRequestsToday,
        totalTokensThisMinute,
        remainingTokens,
        usagePercentage: usagePercentage.toFixed(2),
        limits: RATE_LIMITS,
        minuteResetTime: minuteResetTime.toISOString(),
        dailyResetTime: dailyResetTime.toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve usage stats' });
  }
};

export const getModelName = (req, res) => res.json({ success: true, model: MODEL_NAME });
    
