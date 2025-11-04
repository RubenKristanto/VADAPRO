import { useState, useEffect } from 'react';
import './ProcessPage.css';
import processService from './services/processService';

function ProcessPage({ entry, program, year, onBack, onLogout, organization }) {
  const [processId, setProcessId] = useState(null); // Store the process ID from backend
  const [processStatus, setProcessStatus] = useState('ready'); // ready, processing, completed
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const [imageUrl, setImageUrl] = useState(null); // State to hold the image URL from backend
  const [initError, setInitError] = useState(null); // Track initialization errors
  
  // Handler to clear current process and go back
  const handleBack = () => {
    // Don't clear the process ID - keep it for when user returns
    // localStorage.removeItem('currentProcessId');
    if (onBack) onBack();
  };
  
  // Statistical parameters state
  const [selectedStats, setSelectedStats] = useState([]);
  const [statisticsData, setStatisticsData] = useState({});
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Chat interface state for Gemini AI
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: 'Hello! I\'m your AI assistant powered by Gemini 2.5 Flash. I can help you analyze your data, explain statistics, and answer questions about your process. How can I help you today?',
      timestamp: new Date()
    }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  
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

  // ============================================
  // INITIALIZE PROCESS AND FETCH DATA FROM BACKEND
  // ============================================
  // Initialize or fetch process when component mounts
  useEffect(() => {
    const initializeProcess = async () => {
      // For now, we only check if we have an organization
      // entry, program, and year are optional since backend not implemented yet
      
      try {
        setInitError(null); // Clear any previous errors
        
        // Get entry ID to use for unique process storage
        const entryId = entry?._id || entry?.id;
        if (!entry || !entryId) {
          setInitError('Entry ID is required to create a process. Please select an entry first.');
          return;
        }
        
        // Check for existing process ID in localStorage using entry-specific key
        const storageKey = `currentProcessId_${entryId}`;
        const storedProcessId = localStorage.getItem(storageKey);
        
        if (storedProcessId) {
          // Try to fetch the existing process
          try {
            const response = await processService.getProcessById(storedProcessId);
            if (response.success) {
              const process = response.process;
              console.log(`Accessing Process - ID: ${process._id}`);
              setProcessId(process._id);
              setProcessStatus(process.processStatus || 'ready');
              setProgress(process.progress || 0);
              
              // Load logs
              if (process.logs && process.logs.length > 0) {
                setLogs(process.logs.map(log => log.message));
              }
              
              // Load image URL
              if (process.imageUrl) {
                setImageUrl(process.imageUrl);
              }
              
              // Load chat messages - ensure we have the initial AI greeting if empty
              if (process.chatMessages && process.chatMessages.length > 0) {
                setChatMessages(process.chatMessages);
              }
              
              // Load selected stats
              if (process.selectedStats && process.selectedStats.length > 0) {
                setSelectedStats(process.selectedStats.map(s => s.statId));
                
                // Load calculated values from selectedStats
                const statsData = {};
                process.selectedStats.forEach(stat => {
                  if (stat.calculatedValue !== null && stat.calculatedValue !== undefined) {
                    statsData[stat.statId] = stat.calculatedValue;
                  }
                });
                
                // Also load from statisticsData Map if available (backend returns it as object)
                if (process.statisticsData) {
                  Object.entries(process.statisticsData).forEach(([key, value]) => {
                    if (value !== null && value !== undefined) {
                      statsData[key] = value;
                    }
                  });
                }
                
                setStatisticsData(statsData);
              }
              return; // Successfully loaded existing process
            }
          } catch (fetchError) {
            // Process not found or error fetching, will create new one below
            localStorage.removeItem(storageKey); // Clean up invalid ID
          }
        }
        
        // Create new process (if no stored ID or fetch failed)
        const processData = {
          name: entry.name || 'Test Process',
          sourceFile: entry.sourceFile || '',
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
          // Store the process ID in localStorage with entry-specific key
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
  // ============================================
  // END OF PROCESS INITIALIZATION
  // ============================================

  // ============================================
  // TODO: INSERT DANFO.JS STATISTICAL CALCULATION LOGIC HERE
  // ============================================
  // Calculate statistics when selected stats change
  useEffect(() => {
    if (selectedStats.length === 0) {
      setStatisticsData({});
      return;
    }

  
    // MOCK DATA - Remove this when implementing actual danfo.js logic
    const mockResults = {};
    selectedStats.forEach(statId => {
      mockResults[statId] = (Math.random() * 100).toFixed(2);
    });
    setStatisticsData(mockResults);
    // END MOCK DATA
    
    // Note: Backend stat values are updated separately when stats are calculated
    // Don't update here to avoid race conditions with addSelectedStat

  }, [selectedStats, entry, processId]);
  // ============================================
  // END OF STATISTICAL CALCULATION LOGIC
  // ============================================

  // Handle stat selection toggle
  const toggleStat = async (statId) => {
    const stat = getStatById(statId);
    
    setSelectedStats(prev => {
      if (prev.includes(statId)) {
        return prev.filter(id => id !== statId);
      } else {
        return [...prev, statId];
      }
    });
    
    // Update backend
    if (processId && stat) {
      try {
        if (!selectedStats.includes(statId)) {
          // Adding stat
          await processService.addSelectedStat(processId, {
            statId: stat.id,
            label: stat.label,
            icon: stat.icon,
            category: stat.category,
            categoryLabel: stat.categoryLabel
          });
        } else {
          // Removing stat
          await processService.removeSelectedStat(processId, statId);
        }
      } catch (error) {
        console.error('Error updating selected stat:', error);
      }
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
  const clearAllStats = () => {
    setSelectedStats([]);
    setSearchQuery('');
  };

  // Get stat details by ID
  const getStatById = (statId) => {
    return getAllStats().find(stat => stat.id === statId);
  };

  // ============================================
  // TODO: INSERT GEMINI API INTEGRATION LOGIC HERE
  // ============================================
  // Function to send message to Gemini AI
  const sendMessageToGemini = async (message) => {
    // MOCK RESPONSE - Remove this when implementing actual Gemini API
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockResponses = [
          `That's a great question about ${entry?.name}! Based on the data analysis, I can help you understand the patterns and trends.`,
          `I've analyzed your request. With the ${selectedStats.length} statistical parameters you've selected, I can provide detailed insights into your ${program?.name} dataset.`,
          `Interesting observation! Let me break this down for you. The current process is at ${progress}% completion, and the data shows some fascinating characteristics.`,
          `Great question! In the context of ${program?.name} (${year}), this is particularly relevant. Let me explain the key points.`,
          `I can help with that! Your dataset contains valuable information. The statistics you've selected will give us a comprehensive view of the data distribution.`,
        ];
        resolve(mockResponses[Math.floor(Math.random() * mockResponses.length)]);
      }, 1500); // Simulate API delay
    });
  };
  // ============================================
  // END OF GEMINI API INTEGRATION LOGIC
  // ============================================

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
        <div className="header-content">
          <h1>VADAPRO <span className="subtitle">Process{program?.name ? ` - ${program.name}` : ''}{year ? ` (${year})` : ''}</span></h1>
          <div className="header-actions">
            <button onClick={handleBack} className="back-btn">
              ← Back to Data
            </button>
            {onLogout && (
              <button onClick={onLogout} className="logout-btn">
                Logout
              </button>
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
                {imageUrl ? (
                  <img 
                    src={imageUrl} 
                    alt="Process visualization" 
                    className="process-image"
                  />
                ) : (
                  <div className="placeholder-content">
                    <div className="placeholder-icon">🖼️</div>
                    <p className="placeholder-text">Image Placeholder</p>
                    <p className="placeholder-subtext">
                      Image will be loaded from backend
                    </p>
                  </div>
                )}
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
                          return stat ? (
                            <div key={statId} className="info-item stat-item">
                              <span className="info-label">
                                {stat.icon} {stat.label}:
                              </span>
                              <span className="info-value stat-value">
                                {statisticsData[statId] !== undefined 
                                  ? statisticsData[statId] 
                                  : 'Calculating...'}
                              </span>
                            </div>
                          ) : null;
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
                        <p className="chat-subtitle">Powered by Gemini 2.5 Flash</p>
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
        </div>
      </div>

      {/* Statistics Selection Modal */}
      {showStatsModal && (
        <div className="stats-modal-overlay" onClick={() => setShowStatsModal(false)}>
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
              <div className="modal-actions">
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
