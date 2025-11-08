import { useState, useEffect, useRef } from 'react';
import './DataPage.css';
import workYearService from './services/workYearService';
import * as dfd from 'danfojs';

function DataPage({ program, year, onBack, onLogout, onNavigateToProcess }) {
  const [entries, setEntries] = useState([]);
  const [expandedEntries, setExpandedEntries] = useState(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEntryName, setNewEntryName] = useState('');
  const [workYearData, setWorkYearData] = useState(null);
  // file inputs removed - uploads are handled per-entry via the entry upload button
  
  // Delete confirmation states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [confirmationStep, setConfirmationStep] = useState('name');
  
  // Process confirmation states
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [entryToProcess, setEntryToProcess] = useState(null);

  const openAddModal = () => {
    setShowAddModal(true);
    setNewEntryName('');
  };

  useEffect(() => {
    const loadWorkYear = async () => {
      if (!program || !year) return;
      try {
        const resp = await workYearService.getProgramWorkYears(program._id);
        if (resp.success) {
              const found = (resp.workYears || []).find(w => w.year === parseInt(year, 10));
              if (found) {
                const single = await workYearService.getWorkYearById(found._id);
                if (single.success) {
                  setWorkYearData(single.workYear);
                  // set entries from persisted workYear
                  setEntries(mapEntriesFromWorkYear(single.workYear));
                } else setWorkYearData(null);
              } else {
                setWorkYearData(null);
                setEntries([]);
              }
        }
      } catch (err) {
        console.error('Failed to load workYear data', err);
      }
    };
    loadWorkYear();
  }, [program, year]);

  const closeAddModal = () => {
    setShowAddModal(false);
    setNewEntryName('');
  };

  // Map entries from workYear document to UI entries
  const mapEntriesFromWorkYear = (wy) => {
    if (!wy) return [];
    return (wy.entries || []).map(e => ({
      id: e._id,
      name: e.name,
      sourceFile: e.sourceFile || null,
      responseCount: e.responseCount || 0,
      persisted: true
    }));
  };

  const addEntry = () => {
    if (!newEntryName.trim()) return;

    // If a workYear exists, create entry on the server so it persists
    (async () => {
      try {
        if (workYearData && workYearData._id) {
          const resp = await workYearService.createEntry(workYearData._id, newEntryName.trim());
          if (resp && resp.success) {
            const wy = resp.workYear;
            setWorkYearData(wy);
            setEntries(mapEntriesFromWorkYear(wy));
            closeAddModal();
            return;
          }
          alert(resp.message || 'Failed to create entry');
        } else {
          // No workYear selected - fallback to local entry (not persisted)
          const newEntry = {
            id: Date.now(),
            name: newEntryName.trim(),
            sourceFile: null,
            responseCount: 0,
            persisted: false
          };
          setEntries([...entries, newEntry]);
          closeAddModal();
        }
      } catch (err) {
        console.error('Error creating entry', err);
        alert('Failed to create entry');
      }
    })();
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

  const finalDelete = async () => {
    try {
      if (workYearData && workYearData._id && entryToDelete._id) {
        await workYearService.deleteEntry(workYearData._id, entryToDelete.id);
        const single = await workYearService.getWorkYearById(workYearData._id);
        if (single && single.success) setEntries(mapEntriesFromWorkYear(single.workYear));
      } else {
        setEntries(entries.filter(entry => entry.id !== entryToDelete.id));
      }
    } catch (err) {
      console.error('Delete entry error', err);
      alert('Failed to delete entry');
    }
    cancelDelete();
  };

  const handleFileUpload = (entryId, e) => {
    e.stopPropagation();
    const file = e.target.files[0];
    if (!file) return;

    (async () => {
      try {
        const df = await dfd.readCSV(file); // Count rows from uploaded CSV
        if (workYearData && workYearData._id) {
          const resp = await workYearService.uploadDatasheets(workYearData._id, entryId, [file]);
          if (resp && resp.success) {
            // Refresh from server
            const single = await workYearService.getWorkYearById(workYearData._id);
            if (single && single.success) {
              setWorkYearData(single.workYear);
              const mappedEntries = mapEntriesFromWorkYear(single.workYear);
              const updatedEntries = mappedEntries.map(entry => 
                entry.id === entryId ? { ...entry, responseCount: df.shape[0] } : entry
              );
              setEntries(updatedEntries);
            }
            return;
          }
          alert(resp.message || 'Upload failed');
        } else {
          // No workYear selected: update locally (offline mode)
          const updatedEntries = entries.map(entry => {
            if (entry.id === entryId) {
              return {
                ...entry,
                sourceFile: file.name,
                responseCount: df.shape[0]
              };
            }
            return entry;
          });
          setEntries(updatedEntries);
        }
      } catch (err) {
        console.error('File upload error', err);
        alert('Upload failed — check console for details');
      }
    })();
  };

  // datasheet/image upload handlers removed; file uploads happen per data entry

  const openProcessModal = (entry, e) => {
    e.stopPropagation();
    setEntryToProcess(entry);
    setShowProcessModal(true);
  };

  const closeProcessModal = () => {
    setShowProcessModal(false);
    setEntryToProcess(null);
  };

  const startProcess = () => {
    if (onNavigateToProcess) {
      onNavigateToProcess(entryToProcess);
    }
    closeProcessModal();
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
                        <span className="expand-icon">
                          {expandedEntries.has(entry.id) ? '▼' : '▶'}
                        </span>
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
                            {!entry.sourceFile && (
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
                            )}
                          </div>
                          <div className="response-section">
                            <span className="info-label">Response:</span>
                            <span className="response-count">{entry.responseCount}</span>
                          </div>
                        </div>
                        <div className="process-button-row">
                          <button 
                            className="action-btn process-btn-large"
                            onClick={(e) => openProcessModal(entry, e)}
                            disabled={!entry.sourceFile}
                          >
                            Process
                          </button>
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

      {/* Process Confirmation Modal */}
      {showProcessModal && (
        <div className="modal-overlay" onClick={closeProcessModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Process Data</h3>
            <p className="modal-description">
              You are about to process "<strong>{entryToProcess?.name}</strong>".
              <br />
              Click "Start Process" to continue to the processing page.
            </p>
            <div className="modal-actions">
              <button onClick={closeProcessModal} className="modal-cancel-btn">
                Cancel
              </button>
              <button 
                onClick={startProcess} 
                className="modal-confirm-btn modal-process-btn"
              >
                Start Process
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataPage;