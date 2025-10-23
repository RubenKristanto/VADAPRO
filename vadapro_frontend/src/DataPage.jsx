import { useState } from 'react';
import './DataPage.css';

function DataPage({ program, year, onBack, onLogout }) {
  const [entries, setEntries] = useState([]);
  const [expandedEntries, setExpandedEntries] = useState(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEntryName, setNewEntryName] = useState('');
  
  // Delete confirmation states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [confirmationStep, setConfirmationStep] = useState('name');

  const openAddModal = () => {
    setShowAddModal(true);
    setNewEntryName('');
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setNewEntryName('');
  };

  const addEntry = () => {
    if (newEntryName.trim()) {
      const newEntry = {
        id: Date.now(),
        name: newEntryName.trim(),
        sourceFile: null,
        responseCount: 0
      };
      setEntries([...entries, newEntry]);
      closeAddModal();
    }
  };

  const toggleEntry = (entryId) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(entryId)) {
      newExpanded.delete(entryId);
    } else {
      newExpanded.add(entryId);
    }
    setExpandedEntries(newExpanded);
  };

  const initiateDelete = (entry, e) => {
    e.stopPropagation();
    setEntryToDelete(entry);
    setShowDeleteModal(true);
    setDeleteConfirmName('');
    setConfirmationStep('name');
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setEntryToDelete(null);
    setDeleteConfirmName('');
    setConfirmationStep('name');
  };

  const proceedToFinalConfirmation = () => {
    if (deleteConfirmName === entryToDelete.name) {
      setConfirmationStep('final');
    }
  };

  const goBackToNameEntry = () => {
    setConfirmationStep('name');
  };

  const finalDelete = () => {
    setEntries(entries.filter(entry => entry.id !== entryToDelete.id));
    cancelDelete();
  };

  const handleFileUpload = (entryId, e) => {
    e.stopPropagation();
    const file = e.target.files[0];
    if (file) {
      const updatedEntries = entries.map(entry => {
        if (entry.id === entryId) {
          return {
            ...entry,
            sourceFile: file.name,
            responseCount: Math.floor(Math.random() * 100) + 1 // Temporary random count
          };
        }
        return entry;
      });
      setEntries(updatedEntries);
    }
  };

  const handleProcess = (entryId, e) => {
    e.stopPropagation();
    // TODO: Implement process logic
    console.log('Processing entry:', entryId);
  };

  return (
    <div className="data-container">
      <header className="data-header">
        <div className="header-content">
          <h1>VADAPRO <span className="subtitle">Data - {program?.name} ({year})</span></h1>
          <div className="header-actions">
            <button onClick={onBack} className="back-btn">
              ← Back to Programs
            </button>
            {onLogout && (
              <button onClick={onLogout} className="logout-btn">
                Logout
              </button>
            )}
          </div>
        </div>
      </header>
      <div className="data-content">
        <div className="data-rectangle">
          <h2>Data Management</h2>
          
          {/* Add Data Entry Button - at top center but below title */}
          <div className="add-entry-container">
            <button onClick={openAddModal} className="add-entry-btn">
              + Add Data Entry
            </button>
          </div>

          <div className="data-body">
            {entries.length === 0 ? (
              <div className="empty-state">
                <p>No data entries yet. Click "Add Data Entry" to create one.</p>
              </div>
            ) : (
              <div className="entries-list">
                {entries.map(entry => (
                  <div key={entry.id} className="entry-item">
                    <div 
                      className="entry-header"
                      onClick={() => toggleEntry(entry.id)}
                    >
                      <div className="entry-header-left">
                        <span className="entry-name">{entry.name}</span>
                      </div>
                      <div className="entry-header-right">
                        <button 
                          onClick={(e) => initiateDelete(entry, e)}
                          className="delete-entry-btn"
                          title="Delete Entry"
                        >
                          ×
                        </button>
                        <span className="expand-icon">
                          {expandedEntries.has(entry.id) ? '▼' : '▶'}
                        </span>
                      </div>
                    </div>
                    
                    {expandedEntries.has(entry.id) && (
                      <div className="entry-content">
                        <div className="entry-info-row">
                          <div className="source-section">
                            <span className="info-label">Source:</span>
                            <span className="source-filename">
                              {entry.sourceFile || 'No file uploaded'}
                            </span>
                            <label className="upload-btn-wrapper">
                              <input
                                type="file"
                                onChange={(e) => handleFileUpload(entry.id, e)}
                                style={{ display: 'none' }}
                                accept=".csv,.xlsx,.xls"
                              />
                              <button 
                                className="action-btn upload-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.currentTarget.previousSibling.click();
                                }}
                              >
                                Upload
                              </button>
                            </label>
                            <button 
                              className="action-btn process-btn"
                              onClick={(e) => handleProcess(entry.id, e)}
                              disabled={!entry.sourceFile}
                            >
                              Process
                            </button>
                          </div>
                          <div className="response-section">
                            <span className="info-label">Response:</span>
                            <span className="response-count">{entry.responseCount}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Entry Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={closeAddModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Add Data Entry</h3>
            <p className="modal-description">
              Create a new data entry for "<strong>{program?.name}</strong>" - {year}
            </p>
            <input
              type="text"
              placeholder="Enter entry name"
              value={newEntryName}
              onChange={(e) => setNewEntryName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addEntry()}
              className="modal-input"
              autoFocus
            />
            <div className="modal-actions">
              <button onClick={closeAddModal} className="modal-cancel-btn">
                Cancel
              </button>
              <button 
                onClick={addEntry} 
                className="modal-confirm-btn modal-add-btn"
                disabled={!newEntryName.trim()}
              >
                Add Entry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            {confirmationStep === 'name' ? (
              <>
                <h3 className="modal-title">Delete Entry</h3>
                <p className="modal-description">
                  To confirm deletion of "<strong>{entryToDelete?.name}</strong>", 
                  please type the entry name below:
                </p>
                <input
                  type="text"
                  placeholder="Type entry name"
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  className="modal-input"
                  autoFocus
                />
                <div className="modal-actions">
                  <button onClick={cancelDelete} className="modal-cancel-btn">
                    Cancel
                  </button>
                  <button 
                    onClick={proceedToFinalConfirmation} 
                    className="modal-confirm-btn"
                    disabled={deleteConfirmName !== entryToDelete?.name}
                  >
                    Continue
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="modal-title">Final Confirmation</h3>
                <p className="modal-description">
                  Are you sure you want to delete "<strong>{entryToDelete?.name}</strong>"?
                  <br />
                  <span className="warning-text">This action cannot be undone.</span>
                </p>
                <div className="modal-actions">
                  <button onClick={goBackToNameEntry} className="modal-cancel-btn">
                    Go Back
                  </button>
                  <button 
                    onClick={finalDelete} 
                    className="modal-confirm-btn"
                  >
                    Confirm Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default DataPage;