import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import './ProcessPage.css';
import processService from './services/processService';
import aiService from './services/aiService';
import { authService } from './services/authentication';
import workYearService from './services/workYearService';
import programService from './services/programService';
import * as dfd from 'danfojs';
import Papa from 'papaparse';
import ChartGenerator from './components/ChartGenerator';
import ComparisonChart from './components/ComparisonChart';

// Backend interface: GET /file/gridfs/:entryId returns CSV file from MongoDB GridFS

// Custom quantile function for danfojs Series
const quantile = (series, q) => {
  const sorted = series.sortValues().values;
  const pos = q * (sorted.length - 1);
  const lower = Math.floor(pos);
  const upper = Math.ceil(pos);
  const weight = pos - lower;
  return lower === upper ? sorted[lower] : sorted[lower] * (1 - weight) + sorted[upper] * weight;
};

const skew = (series) => {
  const values = series.values;
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const std = Math.sqrt(values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n);
  return values.reduce((a, b) => a + Math.pow((b - mean) / std, 3), 0) / n;
};

const kurt = (series) => {
  const values = series.values;
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const std = Math.sqrt(values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n);
  return values.reduce((a, b) => a + Math.pow((b - mean) / std, 4), 0) / n - 3;
};

function ProcessPage({ onLogout }) {
  const { organizationId, programId, year, entryId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [entry, setEntry] = useState(location.state?.entry || null);
  const [program, setProgram] = useState(location.state?.program || null);
  const [organization, setOrganization] = useState(location.state?.organization || null);
  const currentUser = authService.getCurrentUser();
  const [processId, setProcessId] = useState(null);
  const [processStatus, setProcessStatus] = useState('ready');
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const [chartConfigs, setChartConfigs] = useState([]);
  const [initError, setInitError] = useState(null);
  const [csvData, setCsvData] = useState(null); // DataFrame from CSV
  const [rawCsvText, setRawCsvText] = useState(null); // Raw CSV text for AI analysis
  
  // Handler to clear current process and go back
  const handleBack = () => {
    navigate(`/organizations/${organizationId}/programs/${programId}/year/${year}/data`);
  };
  
  // Statistical parameters state
  const [selectedStats, setSelectedStats] = useState([]);
  const [statisticsData, setStatisticsData] = useState({});
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Chat interface state for Gemini AI
  const [chatMessages, setChatMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [modelName, setModelName] = useState('AI');
  
  // Comparison state
  const [comparisons, setComparisons] = useState([]);
  const [currentComparisonIndex, setCurrentComparisonIndex] = useState(0);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [availableWorkYears, setAvailableWorkYears] = useState([]);
  const [selectedCurrentQuestion, setSelectedCurrentQuestion] = useState('');
  const [selectedTargetYear, setSelectedTargetYear] = useState('');
  const [selectedTargetEntry, setSelectedTargetEntry] = useState('');
  const [selectedTargetQuestion, setSelectedTargetQuestion] = useState('');
  const [targetEntries, setTargetEntries] = useState([]);
  const [targetQuestions, setTargetQuestions] = useState([]);
  // New state for multiple work year selections
  const [selectedWorkYearEntries, setSelectedWorkYearEntries] = useState([]);
  
  // Comprehensive list of statistical parameters available in danfo.js
  // Organized by category for better UX
  const availableStats = {
    'central-tendency': {
      label: 'Central Tendency',
      icon: '📊',
      stats: [
        { id: 'mean', label: 'Mean (Average)', icon: '📊', description: 'Arithmetic mean of values' },
        { id: 'median', label: 'Median', icon: '📈', description: 'Middle value when sorted' },
        { id: 'mode', label: 'Mode', icon: '📉', description: 'Most frequently occurring value' },
      ]
    },
    'dispersion': {
      label: 'Dispersion & Spread',
      icon: '📏',
      stats: [
        { id: 'std', label: 'Standard Deviation', icon: '📐', description: 'Measure of data spread' },
        { id: 'variance', label: 'Variance', icon: '📏', description: 'Average squared deviation' },
        { id: 'range', label: 'Range', icon: '↔️', description: 'Difference between max and min' },
      ]
    },
    'bounds': {
      label: 'Bounds & Extremes',
      icon: '⬆️',
      stats: [
        { id: 'min', label: 'Minimum', icon: '⬇️', description: 'Smallest value in dataset' },
        { id: 'max', label: 'Maximum', icon: '⬆️', description: 'Largest value in dataset' },
        { id: 'count', label: 'Count', icon: '🔢', description: 'Number of non-null values' },
      ]
    },
    'quantiles': {
      label: 'Quantiles & Percentiles',
      icon: '📌',
      stats: [
        { id: 'q1', label: '1st Quartile (Q1)', icon: '📌', description: '25th percentile' },
        { id: 'q2', label: '2nd Quartile (Q2/Median)', icon: '📍', description: '50th percentile' },
        { id: 'q3', label: '3rd Quartile (Q3)', icon: '📍', description: '75th percentile' },
        { id: 'iqr', label: 'Interquartile Range (IQR)', icon: '📊', description: 'Q3 - Q1' },
        { id: 'p10', label: '10th Percentile', icon: '📊', description: '10% of data below this' },
        { id: 'p90', label: '90th Percentile', icon: '📊', description: '90% of data below this' },
        { id: 'p95', label: '95th Percentile', icon: '📊', description: '95% of data below this' },
        { id: 'p99', label: '99th Percentile', icon: '📊', description: '99% of data below this' },
      ]
    },
    'shape': {
      label: 'Distribution Shape',
      icon: '📐',
      stats: [
        { id: 'skew', label: 'Skewness', icon: '⚖️', description: 'Measure of asymmetry' },
        { id: 'kurtosis', label: 'Kurtosis', icon: '🔺', description: 'Measure of tailedness' },
      ]
    },
    'cumulative': {
      label: 'Cumulative Statistics',
      icon: '📈',
      stats: [
        { id: 'sum', label: 'Sum', icon: '➕', description: 'Total sum of all values' },
        { id: 'cumsum', label: 'Cumulative Sum', icon: '📈', description: 'Running total' },
        { id: 'cumprod', label: 'Cumulative Product', icon: '✖️', description: 'Running product' },
        { id: 'cummax', label: 'Cumulative Maximum', icon: '⬆️', description: 'Running maximum' },
        { id: 'cummin', label: 'Cumulative Minimum', icon: '⬇️', description: 'Running minimum' },
      ]
    },
    'other': {
      label: 'Other Statistics',
      icon: '�',
      stats: [
        { id: 'nunique', label: 'Unique Count', icon: '🎯', description: 'Number of unique values' },
        { id: 'abs_sum', label: 'Absolute Sum', icon: '|➕|', description: 'Sum of absolute values' },
        { id: 'abs_mean', label: 'Absolute Mean', icon: '|📊|', description: 'Mean of absolute values' },
      ]
    }
  };

  // Flatten all stats for easier access
  const getAllStats = () => {
    const allStats = [];
    Object.entries(availableStats).forEach(([categoryKey, category]) => {
      category.stats.forEach(stat => {
        allStats.push({ ...stat, category: categoryKey, categoryLabel: category.label });
      });
    });
    return allStats;
  };

  // Filter stats based on search query and category
  const getFilteredStats = () => {
    const allStats = getAllStats();
    return allStats.filter(stat => {
      const matchesSearch = searchQuery === '' || 
        stat.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stat.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || stat.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  };

  // Fetch model name and set initial message
  useEffect(() => {
    aiService.getModelName().then(data => {
      if (data.success) setModelName(data.model);
    });
    setChatMessages([{
      id: 1,
      type: 'ai',
      content: 'Hello! How can I help you today?',
      timestamp: new Date()
    }]);
  }, []);

  useEffect(() => {
    const loadEntry = async () => {
      if (!entry && entryId && programId) {
        try {
          const resp = await programService.getOrganizationPrograms(organizationId);
          if (resp.success) {
            const prog = resp.programs.find(p => p._id === programId);
            if (prog) {
              setProgram(prog);
              const wyResp = await workYearService.getProgramWorkYears(programId);
              if (wyResp.success) {
                const wy = wyResp.workYears.find(w => w.year === parseInt(year, 10));
                if (wy) {
                  const wyDetail = await workYearService.getWorkYearById(wy._id);
                  if (wyDetail.success) {
                    const foundEntry = wyDetail.workYear.entries?.find(e => e._id === entryId);
                    if (foundEntry) setEntry(foundEntry);
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error('Failed to load entry', error);
        }
      }
    };
    loadEntry();
  }, [entryId, entry, programId, organizationId, year]);

  useEffect(() => {
    const initializeProcess = async () => {
      try {
        setInitError(null);
        
        const entryId = entry?._id || entry?.id;
        if (!entry || !entryId) {
          setInitError('Entry ID is required to create a process. Please select an entry first.');
          return;
        }
        
        const storageKey = `currentProcessId_${entryId}`;
        const storedProcessId = localStorage.getItem(storageKey);
        
        if (storedProcessId) {
          try {
            const response = await processService.getProcessById(storedProcessId);
            if (response.success) {
              const process = response.process;
              console.log(`Accessing Process - ID: ${process._id}`);
              setProcessId(process._id);
              setProcessStatus(process.processStatus || 'ready');
              setProgress(process.progress || 0);
              
              if (process.logs && process.logs.length > 0) {
                setLogs(process.logs.map(log => log.message));
              }
              
              if (process.chartConfigs && process.chartConfigs.length > 0) {
                setChartConfigs(process.chartConfigs);
              }
              
              if (process.compareChartConfigs && process.compareChartConfigs.length > 0) {
                setComparisons(process.compareChartConfigs);
              }
              
              if (process.chatMessages && process.chatMessages.length > 0) {
                setChatMessages(process.chatMessages);
              }
              
              if (process.selectedStats && process.selectedStats.length > 0) {
                setSelectedStats(process.selectedStats.map(s => s.statId));
                
                const statsData = {};
                process.selectedStats.forEach(stat => {
                  if (stat.calculatedValues) {
                    Object.entries(stat.calculatedValues).forEach(([columnName, value]) => {
                      const key = columnName === 'default' ? stat.statId : `${columnName}|${stat.statId}`;
                      statsData[key] = value;
                    });
                  }
                });
                
                setStatisticsData(statsData);
              }
              return;
            }
          } catch (fetchError) {
            localStorage.removeItem(storageKey);
          }
        }
        
        const processData = {
          name: entry.name || 'Test Process',
          sourceFileName: entry.sourceFile || '',
          responseCount: entry.responseCount || 0,
          rawData: entry.data || null,
          entryId: entryId,
          year: year || null
        };

        const response = await processService.createProcess(processData);
        if (response.success) {
          const newProcessId = response.process._id;
          console.log(`Accessing Process - ID: ${newProcessId}`);
          setProcessId(newProcessId);
          localStorage.setItem(storageKey, newProcessId);
        } else {
          setInitError(response.message || 'Failed to create process');
          console.error('Failed to create process:', response);
        }
      } catch (error) {
        console.error('Error initializing process:', error);
        setInitError(error.message || 'Failed to initialize process');
      }
    };

    initializeProcess();
  }, [organization]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Fetch CSV data from GridFS using entry ID
  useEffect(() => {
    const fetchCsvData = async () => {
      if (!entry?._id && !entry?.id) return;
      try {
        const entryId = entry._id || entry.id;
        // change this line into VITE_API_URL_DEV to use local backend
        // change /file/gridfs/ to /api/file/gridfs/ according to server.js to ensure correct routing
        const csvUrl = `${import.meta.env.VITE_API_URL_DEV}/api/file/gridfs/${entryId}`;
        console.log('Fetching CSV from:', csvUrl);
        const df = await dfd.readCSV(csvUrl);
        setCsvData(df);
        entry.responseCount = df.shape[0]; // Update response count with actual CSV row count
        console.log('CSV loaded:', df.shape, 'columns:', df.columns);
      } catch (error) {
        console.error('Error loading CSV:', error.message);
        setCsvData(null);
      }
    };
    fetchCsvData();
  }, [entry]);
  
  // Fetch raw CSV text separately for AI analysis (does not interfere with danfojs)
  useEffect(() => {
    const fetchRawCsv = async () => {
      if (!entry?._id && !entry?.id) return;
      try {
        const entryId = entry._id || entry.id;
        const csvUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/file/gridfs/${entryId}`;
        const response = await fetch(csvUrl);
        const text = await response.text();
        
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
        const formatted = Object.keys(parsed.data[0] || {}).map((header, idx) => {
          const values = parsed.data.map(row => row[header]).filter(v => v);
          return `Question ${idx + 1}: ${header}\nResponses (${values.length}): ${values.join(', ')}\n`;
        }).join('\n');
        
        setRawCsvText(formatted);
        console.log('Formatted CSV text loaded:', formatted.length, 'characters');
      } catch (error) {
        console.error('Error loading raw CSV text:', error.message);
        setRawCsvText(null);
      }
    };
    fetchRawCsv();
  }, [entry]);
  
  // ============================================
  // STATISTICAL CALCULATION USING DANFOJS
  // ============================================
  useEffect(() => {
    if (selectedStats.length === 0 || !csvData) {
      setStatisticsData({});
      return;
    }

    const calculateStats = async () => {
      const results = {};
      const numericCols = csvData.columns.filter(col => csvData[col].dtype === 'float32' || csvData[col].dtype === 'int32');
      
      console.log('Available columns:', csvData.columns);
      console.log('Numeric columns:', numericCols);
      
      if (numericCols.length === 0) {
        console.warn('No numeric columns found');
        return;
      }
      
      numericCols.forEach(colName => {
        const col = csvData[colName];
        console.log('Processing column:', colName, 'with', col.values.length, 'values');
        
        selectedStats.forEach(statId => {
          const key = numericCols.length > 1 ? `${colName}|${statId}` : statId;
          try {
            switch(statId) {
              case 'mean': results[key] = col.mean().toFixed(2); break;
              case 'median': results[key] = col.median().toFixed(2); break;
              case 'std': results[key] = col.std().toFixed(2); break;
              case 'variance': results[key] = col.var().toFixed(2); break;
              case 'min': results[key] = col.min().toFixed(2); break;
              case 'max': results[key] = col.max().toFixed(2); break;
              case 'sum': results[key] = col.sum().toFixed(2); break;
              case 'count': results[key] = col.count(); break;
              case 'nunique': results[key] = col.nUnique(); break;
              case 'range': results[key] = (col.max() - col.min()).toFixed(2); break;
              case 'q1': results[key] = quantile(col, 0.25).toFixed(2); break;
              case 'q2': results[key] = quantile(col, 0.5).toFixed(2); break;
              case 'q3': results[key] = quantile(col, 0.75).toFixed(2); break;
              case 'iqr': results[key] = (quantile(col, 0.75) - quantile(col, 0.25)).toFixed(2); break;
              case 'p10': results[key] = quantile(col, 0.1).toFixed(2); break;
              case 'p90': results[key] = quantile(col, 0.9).toFixed(2); break;
              case 'p95': results[key] = quantile(col, 0.95).toFixed(2); break;
              case 'p99': results[key] = quantile(col, 0.99).toFixed(2); break;
              case 'abs_sum': results[key] = col.abs().sum().toFixed(2); break;
              case 'abs_mean': results[key] = col.abs().mean().toFixed(2); break;
              case 'cumsum': results[key] = col.cumSum().values[col.values.length - 1].toFixed(2); break;
              case 'cummax': results[key] = col.cumMax().values[col.values.length - 1].toFixed(2); break;
              case 'cummin': results[key] = col.cumMin().values[col.values.length - 1].toFixed(2); break;
              case 'cumprod': results[key] = col.cumProd().values[col.values.length - 1].toFixed(2); break;
              case 'skew': results[key] = skew(col).toFixed(2); break;
              case 'kurtosis': results[key] = kurt(col).toFixed(2); break;
              case 'mode': {
                const valueCounts = col.valueCounts();
                results[key] = valueCounts.index[0];
                break;
              }
              default: results[key] = 'N/A';
            }
            
            if (processId && results[key] !== undefined) {
              processService.updateStatValue(processId, key, results[key]).catch(err => 
                console.error('Error updating stat:', err)
              );
            }
          } catch (e) {
            console.error(`Error calculating ${statId} for ${colName}:`, e.message);
            results[key] = 'Error';
          }
        });
      });
      
      console.log('Statistics calculated:', results);
      setStatisticsData(results);
    };
    
    calculateStats();
  }, [selectedStats, csvData, processId]);

  // Handle stat selection toggle
  const toggleStat = async (statId) => {
    const stat = getStatById(statId);
    const isCurrentlySelected = selectedStats.includes(statId);
    
    if (processId && stat) {
      try {
        if (!isCurrentlySelected) {
          // Adding stat - update backend FIRST
          await processService.addSelectedStat(processId, {
            statId: stat.id,
            label: stat.label,
            icon: stat.icon,
            category: stat.category,
            categoryLabel: stat.categoryLabel
          });
          // Then update local state
          setSelectedStats(prev => [...prev, statId]);
        } else {
          // Removing stat
          await processService.removeSelectedStat(processId, statId);
          setSelectedStats(prev => prev.filter(id => id !== statId));
        }
      } catch (error) {
        console.error('Error updating selected stat:', error);
      }
    } else {
      // No processId, just update local state
      setSelectedStats(prev => {
        if (isCurrentlySelected) {
          return prev.filter(id => id !== statId);
        } else {
          return [...prev, statId];
        }
      });
    }
  };

  // Remove a selected stat
  const removeStat = async (statId) => {
    setSelectedStats(prev => prev.filter(id => id !== statId));
    
    // Update backend
    if (processId) {
      try {
        await processService.removeSelectedStat(processId, statId);
      } catch (error) {
        console.error('Error removing selected stat:', error);
      }
    }
  };

  // Clear all selected stats
  const clearAllStats = async () => {
    if (processId && selectedStats.length > 0) {
      try {
        for (const statId of selectedStats) {
          await processService.removeSelectedStat(processId, statId);
        }
      } catch (error) {
        console.error('Error clearing stats:', error);
      }
    }
    setSelectedStats([]);
    setSearchQuery('');
  };

  // Get stat details by ID
  const getStatById = (statId) => {
    return getAllStats().find(stat => stat.id === statId);
  };

  
  // gemini API integration
  const sendMessageToGemini = async (message) => {
    try {
      const context = {
        statistics: statisticsData,
        chartConfig: { type: 'current visualization', columns: csvData?.columns || [] },
        csvSummary: csvData ? {
          totalRows: csvData.shape[0],
          totalColumns: csvData.shape[1],
          columns: csvData.columns,
          numericColumns: csvData.columns.filter(col => csvData[col].dtype === 'float32' || csvData[col].dtype === 'int32')
        } : null,
        csvData: rawCsvText,
        entryName: entry?.name,
        sourceFileName: entry?.sourceFile,
        processId: processId,
        entryId: entry?._id || entry?.id,
        geminiFileUri: entry?.geminiFileUri,
        responseCount: entry?.responseCount,
        programName: program?.name,
        organizationName: organization?.name,
        year: year,
        userId: localStorage.getItem('username'),
        queryLength: message.length
      };

      // Call AI service
      const response = await aiService.analyzeData(message, context);
      
      if (response.success) {
        console.log('✅ AI Response received:', {
          tokens: response.metadata?.totalTokens,
          model: response.metadata?.model
        });
        return response.response;
      } else {
        // Handle different error types
        if (response.errorType === 'RATE_LIMIT') {
          return '⏱️ Rate limit reached. Please wait a moment before sending another message.';
        } else if (response.errorType === 'QUOTA_EXCEEDED') {
          return '📊 Daily quota exceeded. The AI service will be available again tomorrow.';
        } else if (response.errorType === 'CONFIG_ERROR') {
          return '⚙️ AI service is not configured. Please contact the administrator.';
        } else {
          return '❌ Sorry, I encountered an error. Please try again.';
        }
      }
    } catch (error) {
      console.error('❌ AI service error:', error);
      return '❌ Unable to connect to AI service. Please check your connection and try again.';
    }
  };
  // end of gemini API integration

  // Handle sending a chat message
  const handleSendMessage = async () => {
    if (!userInput.trim() || isAiTyping || !processId) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: userInput.trim(),
      timestamp: new Date()
    };

    // Add user message to chat
    setChatMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setIsAiTyping(true);

    // Save user message to backend
    try {
      await processService.addChatMessage(processId, 'user', userMessage.content);
    } catch (error) {
      console.error('Error saving user message:', error);
    }

    try {
      // Call Gemini API
      const aiResponse = await sendMessageToGemini(userMessage.content);

      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: aiResponse,
        timestamp: new Date()
      };

      // Add AI response to chat
      setChatMessages(prev => [...prev, aiMessage]);
      
      // Save AI message to backend
      try {
        await processService.addChatMessage(processId, 'ai', aiResponse);
      } catch (error) {
        console.error('Error saving AI message:', error);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
        isError: true
      };
      setChatMessages(prev => [...prev, errorMessage]);
      
      // Save error message to backend
      try {
        await processService.addChatMessage(processId, 'ai', errorMessage.content, true);
      } catch (error) {
        console.error('Error saving error message:', error);
      }
    } finally {
      setIsAiTyping(false);
    }
  };

  // Handle Enter key press in chat input
  const handleChatKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Clear chat history
  const clearChatHistory = async () => {
    const initialMessage = {
      id: 1,
      type: 'ai',
      content: 'Hello! I\'m your AI assistant powered by Gemini 2.5 Flash. How can I help you today?',
      timestamp: new Date()
    };
    
    setChatMessages([initialMessage]);
    
    // Clear chat history on backend (backend will add its own default message)
    if (processId) {
      try {
        const response = await processService.clearChatHistory(processId);
        // Backend returns a default message, so we could use that instead
        if (response.success) {
          // Optionally refetch the chat messages to sync with backend
          // const chatResponse = await processService.getChatMessages(processId);
          // if (chatResponse.success) {
          //   setChatMessages(chatResponse.chatMessages);
          // }
        }
      } catch (error) {
        console.error('Error clearing chat history:', error);
      }
    }
  };

  // Format timestamp for chat messages
  const formatMessageTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const startProcessing = async () => {
    setProcessStatus('processing');
    setLogs(['Starting data processing...']);
    
    // Update backend status
    if (processId) {
      try {
        await processService.updateProcessStatus(processId, 'processing');
        await processService.addLog(processId, 'Starting data processing...', 'info');
      } catch (error) {
        console.error('Error updating process status:', error);
      }
    }
    
    // Simulate processing with progress updates
    let currentProgress = 0;
    const interval = setInterval(async () => {
      currentProgress += 10;
      setProgress(currentProgress);
      
      // Add log entries
      let logMessage = '';
      if (currentProgress === 20) {
        logMessage = 'Loading source data...';
        setLogs(prev => [...prev, logMessage]);
      } else if (currentProgress === 40) {
        logMessage = 'Validating data structure...';
        setLogs(prev => [...prev, logMessage]);
      } else if (currentProgress === 60) {
        logMessage = 'Processing responses...';
        setLogs(prev => [...prev, logMessage]);
      } else if (currentProgress === 80) {
        logMessage = 'Generating analysis...';
        setLogs(prev => [...prev, logMessage]);
      } else if (currentProgress === 100) {
        logMessage = 'Processing completed successfully!';
        setLogs(prev => [...prev, logMessage]);
        setProcessStatus('completed');
        clearInterval(interval);
      }
      
      // Update backend
      if (processId && logMessage) {
        try {
          await processService.updateProgress(processId, currentProgress, logMessage);
        } catch (error) {
          console.error('Error updating progress:', error);
        }
      }
    }, 800);
  };

  // Comparison feature functions
  const checkHasMean = (process) => {
    return process?.selectedStats?.some(stat => stat.statId === 'mean') || false;
  };

  const getNumericQuestions = () => {
    if (!csvData) return [];
    return csvData.columns.filter(col => 
      csvData[col].dtype === 'float32' || csvData[col].dtype === 'int32'
    );
  };

  const openComparisonModal = async () => {
    try {
      const wyResponse = await workYearService.getProgramWorkYears(programId);
      if (wyResponse.success) {
        const filteredWY = wyResponse.workYears.filter(wy => wy.year !== year);
        setAvailableWorkYears(filteredWY);
        setShowComparisonModal(true);
      }
    } catch (error) {
      console.error('Error loading work years:', error);
    }
  };

  const handleAddWorkYearEntry = async () => {
    if (!selectedTargetYear || !selectedTargetEntry || !selectedTargetQuestion) return;
    
    // Check if this entry is already added
    const alreadyExists = selectedWorkYearEntries.some(
      item => item.entryId === selectedTargetEntry && item.year === selectedTargetYear
    );
    
    if (alreadyExists) {
      alert('This work year entry has already been added.');
      return;
    }
    
    try {
      const targetProcesses = await processService.getAllProcesses();
      const targetProcess = targetProcesses.processes?.find(p => p.entry === selectedTargetEntry);
      
      if (!targetProcess || !checkHasMean(targetProcess)) {
        alert('Target entry does not have mean calculated');
        return;
      }
      
      const targetStat = targetProcess.selectedStats.find(s => s.statId === 'mean');
      
      let targetMean;
      if (targetStat?.calculatedValues) {
        const calcValues = targetStat.calculatedValues;
        targetMean = calcValues[selectedTargetQuestion] || 
                     calcValues.get?.(selectedTargetQuestion) ||
                     calcValues['default'] || 
                     calcValues.get?.('default');
      }
      
      if (!targetMean) {
        alert('Mean value not found for selected question');
        return;
      }
      
      const newEntry = {
        year: parseInt(selectedTargetYear),
        entryId: String(selectedTargetEntry),
        entryName: targetEntries.find(e => e._id === selectedTargetEntry)?.name || 'Unknown',
        question: selectedTargetQuestion,
        meanValue: parseFloat(targetMean)
      };
      
      setSelectedWorkYearEntries(prev => [...prev, newEntry]);
      
      // Reset selection fields for next entry
      setSelectedTargetYear('');
      setSelectedTargetEntry('');
      setSelectedTargetQuestion('');
      setTargetEntries([]);
      setTargetQuestions([]);
    } catch (error) {
      console.error('Error adding work year entry:', error);
      alert('Error adding work year entry');
    }
  };
  
  const handleRemoveWorkYearEntry = (index) => {
    setSelectedWorkYearEntries(prev => prev.filter((_, i) => i !== index));
  };

  const handleTargetYearChange = async (selectedYear) => {
    setSelectedTargetYear(selectedYear);
    setSelectedTargetEntry('');
    setSelectedTargetQuestion('');
    setTargetEntries([]);
    setTargetQuestions([]);
    
    // Convert selectedYear to number for comparison (comes as string from dropdown)
    const yearNum = Number(selectedYear);
    const wy = availableWorkYears.find(w => w.year === yearNum);
    console.log('=== TARGET YEAR CHANGE ===');
    console.log('Selected year:', selectedYear, 'Type:', typeof selectedYear);
    console.log('Converted to number:', yearNum);
    console.log('Available work years:', availableWorkYears.map(w => ({ year: w.year, type: typeof w.year })));
    console.log('Found WorkYear:', wy);
    if (!wy) return;
    
    try {
      const wyDetail = await workYearService.getWorkYearById(wy._id);
      console.log('WorkYear details:', wyDetail);
      
      if (wyDetail.success && wyDetail.workYear.entries) {
        console.log('Entries in WorkYear:', wyDetail.workYear.entries.length);
        
        // Fetch all processes once, outside the loop for efficiency
        const entryProcesses = await processService.getAllProcesses();
        console.log('Total processes in system:', entryProcesses.processes?.length);
        console.log('All process entry IDs:', entryProcesses.processes?.map(p => ({ id: p._id, entry: p.entry, hasStats: p.selectedStats?.length > 0 })));
        
        const entriesWithMean = [];
        for (const ent of wyDetail.workYear.entries) {
          try {
            console.log('\n--- Checking Entry ---');
            console.log('Entry name:', ent.name);
            console.log('Entry ID:', ent._id);
            console.log('Entry ID type:', typeof ent._id);
            
            // Convert both IDs to strings for comparison to handle ObjectId vs string mismatch
            const matchingProcess = entryProcesses.processes?.find(p => {
              const match = String(p.entry) === String(ent._id);
              if (match) {
                console.log('MATCH FOUND! Process ID:', p._id, 'Entry:', p.entry);
              }
              return match;
            });
            
            console.log('Found matching process:', matchingProcess ? 'YES' : 'NO');
            if (matchingProcess) {
              console.log('Process selectedStats array:', matchingProcess.selectedStats);
              console.log('selectedStats length:', matchingProcess.selectedStats?.length);
              const hasMean = checkHasMean(matchingProcess);
              console.log('Has mean stat:', hasMean);
              
              if (hasMean) {
                entriesWithMean.push(ent);
                console.log('✓ Entry added to list');
              } else {
                console.log('✗ Entry skipped - no mean stat');
              }
            } else {
              console.log('✗ No matching process found for this entry');
            }
          } catch (err) {
            console.error('Error checking entry process:', err);
          }
        }
        
        console.log('\n=== FINAL RESULT ===');
        console.log('Total entries with mean:', entriesWithMean.length);
        console.log('Entries:', entriesWithMean.map(e => e.name));
        setTargetEntries(entriesWithMean);
      }
    } catch (error) {
      console.error('Error loading target entries:', error);
    }
  };

  const handleTargetEntryChange = async (entryId) => {
    setSelectedTargetEntry(entryId);
    setSelectedTargetQuestion('');
    
    try {
      const csvUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/file/gridfs/${entryId}`;
      const df = await dfd.readCSV(csvUrl);
      const numCols = df.columns.filter(col => df[col].dtype === 'float32' || df[col].dtype === 'int32');
      setTargetQuestions(numCols);
    } catch (error) {
      console.error('Error loading target questions:', error);
    }
  };

  const handleAddComparison = async () => {
    if (!selectedCurrentQuestion || selectedWorkYearEntries.length === 0) {
      alert('Please select a question and add at least one work year entry to compare.');
      return;
    }
    
    try {
      const currentMean = statisticsData[`${selectedCurrentQuestion}|mean`] || statisticsData['mean'];
      
      if (!currentMean) {
        alert('Mean value not found for the current question');
        return;
      }
      
      // Build entries array with current entry and all selected work year entries
      const entries = [
        { year: parseInt(year), entryId: String(entry._id || entry.id), entryName: entry.name, meanValue: parseFloat(currentMean) },
        ...selectedWorkYearEntries.map(item => ({
          year: parseInt(item.year),
          entryId: String(item.entryId),
          entryName: item.entryName,
          meanValue: parseFloat(item.meanValue)
        }))
      ].sort((a, b) => a.year - b.year);
      
      const newComparison = {
        id: Date.now(),
        question: selectedCurrentQuestion,
        entries: entries
      };
      
      const updatedComparisons = [...comparisons, newComparison];
      setComparisons(updatedComparisons);
      if (processId) {
        processService.updateCompareChartConfigs(processId, updatedComparisons).catch(err => console.error('Error saving comparisons:', err));
      }
      setCurrentComparisonIndex(comparisons.length);
      setShowComparisonModal(false);
      resetComparisonModal();
    } catch (error) {
      console.error('Error adding comparison:', error);
      alert('Error adding comparison');
    }
  };

  const resetComparisonModal = () => {
    setSelectedCurrentQuestion('');
    setSelectedTargetYear('');
    setSelectedTargetEntry('');
    setSelectedTargetQuestion('');
    setTargetEntries([]);
    setTargetQuestions([]);
    setSelectedWorkYearEntries([]);
  };

  const deleteComparison = (idx) => {
    const updatedComparisons = comparisons.filter((_, i) => i !== idx);
    setComparisons(updatedComparisons);
    if (processId) {
      processService.updateCompareChartConfigs(processId, updatedComparisons).catch(err => console.error('Error saving comparisons:', err));
    }
    setCurrentComparisonIndex(prev => Math.max(0, Math.min(prev, updatedComparisons.length - 1)));
  };

  const navigateComparison = (direction) => {
    setCurrentComparisonIndex(prev => {
      if (direction === 'left') return Math.max(0, prev - 1);
      return Math.min(comparisons.length - 1, prev + 1);
    });
  };

  const resetProcess = async () => {
    setProcessStatus('ready');
    setProgress(0);
    setLogs([]);
    
    // Update backend - Note: backend doesn't support updating logs array directly
    // Instead, we update status and progress separately
    if (processId) {
      try {
        // Update status first
        await processService.updateProcessStatus(processId, 'ready');
        // Update progress
        await processService.updateProgress(processId, 0, 'Process reset');
        // Logs are managed individually via addLog, not as an array
      } catch (error) {
        console.error('Error resetting process:', error);
      }
    }
  };

  return (
    <div className="process-container">
      <header className="process-header">
        <div className="process-header-content">
          <h1>VADAPRO <span className="process-subtitle">Process{program?.name ? ` - ${program.name}` : ''}{year ? ` (${year})` : ''}</span></h1>
          <div className="process-header-actions">
            <button onClick={handleBack} className="process-back-btn">
              ← Back to Data
            </button>
            {onLogout && (
              <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                <button onClick={onLogout} className="process-logout-btn">Logout</button>
                <span style={{fontSize:'20px',color:'#f0f0f0'}}>{currentUser?.username}</span>
              </div>
            )}
          </div>
        </div>
      </header>
      <div className="process-content">
        {initError && (
          <div className="error-banner" style={{
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            borderRadius: '8px',
            padding: '16px',
            margin: '16px',
            color: '#c00'
          }}>
            <strong>⚠️ Initialization Error:</strong> {initError}
          </div>
        )}
        <div className="process-rectangle">
          <h2>Processing: {entry?.name || 'Test Process'}</h2>
          
          <div className="process-body">
            {/* UPPER BODY SECTION - Image Placeholder */}
            <div className="upper-body-section">
              <div className="image-placeholder">
                <ChartGenerator 
                  entryId={entry?._id || entry?.id} 
                  processId={processId}
                  initialCharts={chartConfigs}
                  onChartsChange={setChartConfigs}
                />
              </div>
            </div>

            {/* LOWER BODY SECTION - Split into Left and Right */}
            <div className="lower-body-section">
              {/* LEFT SECTION */}
              <div className="lower-left-section">
                {/* Statistical Parameters Selection - Compact View */}
                <div className="stats-selection-card">
                  <div className="stats-header">
                    <h3>📊 Statistical Parameters</h3>
                    <button 
                      className="add-stats-btn"
                      onClick={() => setShowStatsModal(true)}
                      title="Browse and add statistical parameters"
                    >
                      + Add Statistics
                    </button>
                  </div>
                  
                  {selectedStats.length > 0 ? (
                    <>
                      <div className="selected-stats-chips">
                        {selectedStats.map(statId => {
                          const stat = getStatById(statId);
                          return stat ? (
                            <div key={statId} className="stat-chip">
                              <span className="stat-chip-icon">{stat.icon}</span>
                              <span className="stat-chip-label">{stat.label}</span>
                              <button 
                                className="stat-chip-remove"
                                onClick={() => removeStat(statId)}
                                title={`Remove ${stat.label}`}
                              >
                                ×
                              </button>
                            </div>
                          ) : null;
                        })}
                      </div>
                      <button 
                        className="clear-all-btn"
                        onClick={clearAllStats}
                      >
                        Clear All ({selectedStats.length})
                      </button>
                    </>
                  ) : (
                    <p className="no-stats-message">
                      No statistics selected. Click "Add Statistics" to browse {getAllStats().length}+ available parameters.
                    </p>
                  )}
                </div>

                {/* Entry Information with Statistics */}
                <div className="info-card">
                  <h3>Process Details {selectedStats.length > 0 && '& Statistics'}</h3>
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="info-label">Process Name:</span>
                      <span className="info-value">{entry?.name || 'Test Process'}</span>
                    </div>
                    {entry && (
                      <>
                        <div className="info-item">
                          <span className="info-label">Source File:</span>
                          <span className="info-value">{entry.sourceFile || 'N/A'}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Response Count:</span>
                          <span className="info-value">{entry.responseCount || 0}</span>
                        </div>
                      </>
                    )}
                    {!entry && (
                      <div className="info-item">
                        <span className="info-label">Status:</span>
                        <span className="info-value">Demo Mode (Entry data not available)</span>
                      </div>
                    )}
                    
                    {/* Display Selected Statistics */}
                    {selectedStats.length > 0 && (
                      <>
                        <div className="info-divider"></div>
                        {selectedStats.map(statId => {
                          const stat = getStatById(statId);
                          if (!stat) return null;
                          
                          const relevantKeys = Object.keys(statisticsData).filter(key => 
                            key === statId || key.endsWith(`|${statId}`)
                          );
                          
                          const displayValue = relevantKeys.length === 0 
                            ? 'Calculating...'
                            : relevantKeys.map(key => {
                                const columnName = key.includes('|') ? key.split('|')[0] : null;
                                return columnName 
                                  ? `(${columnName}): ${statisticsData[key]}`
                                  : statisticsData[key];
                              });
                          
                          return (
                            <div key={statId} className="info-item stat-item">
                              <span className="info-label">
                                {stat.icon} {stat.label}:
                              </span>
                              <span className="info-value stat-value">
                                {Array.isArray(displayValue) ? displayValue.map((val, idx) => (
                                  <div key={idx}>{val}</div>
                                )) : displayValue}
                              </span>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                {(processStatus === 'processing' || processStatus === 'completed') && (
                  <div className="progress-card">
                    <h3>Progress</h3>
                    <div className="progress-bar-container">
                      <div 
                        className="progress-bar-fill" 
                        style={{ width: `${progress}%` }}
                      >
                        <span className="progress-text">{progress}%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT SECTION - AI Chat Interface */}
              <div className="lower-right-section">
                <div className="chat-container">
                  {/* Chat Header */}
                  <div className="chat-header">
                    <div className="chat-title">
                      <span className="chat-icon">🤖</span>
                      <div>
                        <h3>AI Assistant</h3>
                        <p className="chat-subtitle">Powered by {modelName}</p>
                      </div>
                    </div>
                    <button 
                      className="clear-chat-btn"
                      onClick={clearChatHistory}
                      title="Clear chat history"
                    >
                      🗑️
                    </button>
                  </div>

                  {/* Chat Messages Area */}
                  <div className="chat-messages">
                    {chatMessages.map((message) => (
                      <div 
                        key={message.id} 
                        className={`chat-message ${message.type}-message ${message.isError ? 'error-message' : ''}`}
                      >
                        <div className="message-avatar">
                          {message.type === 'ai' ? '🤖' : '👤'}
                        </div>
                        <div className="message-content">
                          <div className="message-text">{message.content}</div>
                          <div className="message-time">
                            {formatMessageTime(message.timestamp)}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* AI Typing Indicator */}
                    {isAiTyping && (
                      <div className="chat-message ai-message">
                        <div className="message-avatar">🤖</div>
                        <div className="message-content">
                          <div className="typing-indicator">
                            <span></span>
                            <span></span>
                            <span></span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Chat Input Area */}
                  <div className="chat-input-container">
                    <textarea
                      className="chat-input"
                      placeholder="Ask me anything about your data..."
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      onKeyPress={handleChatKeyPress}
                      rows="2"
                      disabled={isAiTyping}
                    />
                    <button 
                      className="chat-send-btn"
                      onClick={handleSendMessage}
                      disabled={!userInput.trim() || isAiTyping}
                      title="Send message"
                    >
                      {isAiTyping ? '⏳' : '📤'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM SECTION - Comparison Charts */}
          <div className="bottom-section" style={{ marginTop: '20px', padding: '50px', background: '#f9f9f9', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0px' }}>
              <h3 style={{ margin: 0 }}>📊 Data Comparisons</h3>
              <button
                onClick={openComparisonModal}
                disabled={!checkHasMean({ selectedStats: selectedStats.map(s => ({ statId: s })) }) || getNumericQuestions().length === 0}
                style={{
                  padding: '10px 20px',
                  background: checkHasMean({ selectedStats: selectedStats.map(s => ({ statId: s })) }) && getNumericQuestions().length > 0 ? '#4CAF50' : '#ddd',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: checkHasMean({ selectedStats: selectedStats.map(s => ({ statId: s })) }) && getNumericQuestions().length > 0 ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                + Add Comparison
              </button>
            </div>
            {comparisons.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                <div style={{ fontSize: '48px', marginBottom: '10px' }}>📈</div>
                <p>No comparisons yet. Click "Add Comparison" to compare data across work years.</p>
                {!checkHasMean({ selectedStats: selectedStats.map(s => ({ statId: s })) }) && (
                  <p style={{ color: '#f44336', fontSize: '14px' }}>Note: You must add "Mean" statistic before creating comparisons.</p>
                )}
              </div>
            ) : (
              <ComparisonChart
                comparisons={comparisons}
                currentIndex={currentComparisonIndex}
                onNavigate={navigateComparison}
                onDelete={deleteComparison}
              />
            )}
          </div>
        </div>
      </div>

      {/* Comparison Selection Modal */}
      {showComparisonModal && (
        <div className="process-modal-overlay" onClick={() => { setShowComparisonModal(false); resetComparisonModal(); }}>
          <div className="stats-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="stats-modal-header">
              <h2>📊 Add Data Comparison</h2>
              <button className="modal-close-btn" onClick={() => { setShowComparisonModal(false); resetComparisonModal(); }}>×</button>
            </div>
            
            <div className="stats-modal-body" style={{ padding: '20px' }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  Select Question from Current Entry ({year}):
                </label>
                <select
                  value={selectedCurrentQuestion}
                  onChange={(e) => setSelectedCurrentQuestion(e.target.value)}
                  style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '6px', border: '1px solid #ddd' }}
                >
                  <option value="">-- Choose a question --</option>
                  {getNumericQuestions().map(q => <option key={q} value={q}>{q}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label style={{ fontWeight: 'bold', fontSize: '16px', color: 'black' }}>Add Work Years to Compare:</label>
                  {selectedWorkYearEntries.length > 0 && (
                    <span style={{ fontSize: '14px', color: '#666' }}>({selectedWorkYearEntries.length} selected)</span>
                  )}
                </div>
                
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px', color: 'black' }}>
                    Select Work Year:
                  </label>
                  <select
                    value={selectedTargetYear}
                    onChange={(e) => handleTargetYearChange(e.target.value)}
                    style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '6px', border: '1px solid #ddd' }}
                  >
                    <option value="">-- Choose a work year --</option>
                    {availableWorkYears.map(wy => <option key={wy._id} value={wy.year}>{wy.year}</option>)}
                  </select>
                </div>

                {selectedTargetYear && (
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px', color: 'black' }}>
                      Select Entry from {selectedTargetYear}:
                    </label>
                    <select
                      value={selectedTargetEntry}
                      onChange={(e) => handleTargetEntryChange(e.target.value)}
                      style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '6px', border: '1px solid #ddd' }}
                    >
                      <option value="">-- Choose an entry --</option>
                      {targetEntries.map(ent => <option key={ent._id} value={ent._id}>{ent.name}</option>)}
                    </select>
                    {targetEntries.length === 0 && <p style={{ fontSize: '12px', color: '#f44336', marginTop: '5px' }}>No entries with mean values found</p>}
                  </div>
                )}

                {selectedTargetEntry && (
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px', color: 'black' }}>
                      Select Question from Target Entry:
                    </label>
                    <select
                      value={selectedTargetQuestion}
                      onChange={(e) => setSelectedTargetQuestion(e.target.value)}
                      style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '6px', border: '1px solid #ddd' }}
                    >
                      <option value="">-- Choose a question --</option>
                      {targetQuestions.map(q => <option key={q} value={q}>{q}</option>)}
                    </select>
                  </div>
                )}

                <button
                  onClick={handleAddWorkYearEntry}
                  disabled={!selectedTargetYear || !selectedTargetEntry || !selectedTargetQuestion}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: (!selectedTargetYear || !selectedTargetEntry || !selectedTargetQuestion) ? '#ddd' : '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: (!selectedTargetYear || !selectedTargetEntry || !selectedTargetQuestion) ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  + Add This Entry
                </button>
              </div>

              {selectedWorkYearEntries.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
                    Selected Work Year Entries:
                  </label>
                  <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '6px', background: 'white' }}>
                    {selectedWorkYearEntries.map((item, index) => (
                      <div
                        key={index}
                        style={{
                          padding: '12px',
                          borderBottom: index < selectedWorkYearEntries.length - 1 ? '1px solid #eee' : 'none',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                            {item.year} - {item.entryName}
                          </div>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            Question: {item.question}
                          </div>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            Mean: {item.meanValue.toFixed(2)}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveWorkYearEntry(index)}
                          style={{
                            padding: '6px 10px',
                            background: '#f44336',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="stats-modal-footer">
              <div className="process-modal-actions">
                <button className="modal-btn secondary" onClick={() => { setShowComparisonModal(false); resetComparisonModal(); }}>
                  Cancel
                </button>
                <button
                  className="modal-btn primary"
                onClick={handleAddComparison}
                disabled={!selectedCurrentQuestion || selectedWorkYearEntries.length === 0}
                style={{
                  opacity: (!selectedCurrentQuestion || selectedWorkYearEntries.length === 0) ? 0.5 : 1,
                  cursor: (!selectedCurrentQuestion || selectedWorkYearEntries.length === 0) ? 'not-allowed' : 'pointer'
                }}
              >
                Create Comparison ({selectedWorkYearEntries.length} {selectedWorkYearEntries.length === 1 ? 'entry' : 'entries'})
              </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Selection Modal */}
      {showStatsModal && (
        <div className="process-modal-overlay" onClick={() => setShowStatsModal(false)}>
          <div className="stats-modal" onClick={(e) => e.stopPropagation()}>
            <div className="stats-modal-header">
              <h2>📊 Select Statistical Parameters</h2>
              <button 
                className="modal-close-btn"
                onClick={() => setShowStatsModal(false)}
                title="Close"
              >
                ×
              </button>
            </div>

            <div className="stats-modal-filters">
              <div className="search-box">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search statistics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
                {searchQuery && (
                  <button 
                    className="clear-search-btn"
                    onClick={() => setSearchQuery('')}
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="category-filters">
                <button
                  className={`category-btn ${selectedCategory === 'all' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('all')}
                >
                  All ({getAllStats().length})
                </button>
                {Object.entries(availableStats).map(([key, category]) => (
                  <button
                    key={key}
                    className={`category-btn ${selectedCategory === key ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(key)}
                  >
                    {category.icon} {category.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="stats-modal-body">
              {getFilteredStats().length > 0 ? (
                <div className="stats-list">
                  {getFilteredStats().map(stat => (
                    <div
                      key={stat.id}
                      className={`stat-list-item ${selectedStats.includes(stat.id) ? 'selected' : ''}`}
                      onClick={() => toggleStat(stat.id)}
                      title={stat.description}
                    >
                      <div className="stat-list-icon">{stat.icon}</div>
                      <div className="stat-list-content">
                        <div className="stat-list-label">{stat.label}</div>
                        <div className="stat-list-category">{stat.categoryLabel}</div>
                      </div>
                      <div className="stat-list-checkbox">
                        {selectedStats.includes(stat.id) ? '✓' : ''}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-results">
                  <div className="no-results-icon">🔍</div>
                  <p>No statistics found matching "{searchQuery}"</p>
                  <button 
                    className="clear-search-btn-alt"
                    onClick={() => setSearchQuery('')}
                  >
                    Clear Search
                  </button>
                </div>
              )}
            </div>

            <div className="stats-modal-footer">
              <div className="selected-count">
                {selectedStats.length} parameter{selectedStats.length !== 1 ? 's' : ''} selected
              </div>
              <div className="process-modal-actions">
                <button 
                  className="modal-btn secondary"
                  onClick={clearAllStats}
                  disabled={selectedStats.length === 0}
                >
                  Clear All
                </button>
                <button 
                  className="modal-btn primary"
                  onClick={() => setShowStatsModal(false)}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProcessPage;
