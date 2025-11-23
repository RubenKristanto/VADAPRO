import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import './DataPage.css';
import workYearService from './services/workYearService';
import { authService } from './services/authentication';
import programService from './services/programService';
import * as dfd from 'danfojs';

function DataPage({ onLogout }) {
  const { organizationId, programId, year } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [program, setProgram] = useState(location.state?.program || null);
  const [organization, setOrganization] = useState(location.state?.organization || null);
  const currentUser = authService.getCurrentUser();
  const [entries, setEntries] = useState([]);
  const [expandedEntries, setExpandedEntries] = useState(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEntryName, setNewEntryName] = useState('');
  const [workYearData, setWorkYearData] = useState(null);
  
  const [pendingFiles, setPendingFiles] = useState({});
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [confirmationStep, setConfirmationStep] = useState('name');
  
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [entryToProcess, setEntryToProcess] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const openAddModal = () => {
    setShowAddModal(true);
    setNewEntryName('');
  };

  useEffect(() => {
    const loadProgram = async () => {
      if (!program && programId) {
        try {
          const resp = await programService.getOrganizationPrograms(organizationId);
          if (resp.success) {
            const prog = resp.programs.find(p => p._id === programId);
            if (prog) setProgram(prog);
          }
        } catch (error) {
          console.error('Failed to load program', error);
        }
      }
    };
    loadProgram();
  }, [programId, program, organizationId]);

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
  }, [program, year, programId]);

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
      geminiFileUri: e.geminiFileUri || null,
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
      const entryIdToDelete = entryToDelete.id;
      if (workYearData && workYearData._id && entryIdToDelete) {
        await workYearService.deleteEntry(workYearData._id, entryIdToDelete);
        const single = await workYearService.getWorkYearById(workYearData._id);
        if (single && single.success) setEntries(mapEntriesFromWorkYear(single.workYear));
      } else {
        setEntries(entries.filter(entry => entry.id !== entryIdToDelete));
      }
      
      setPendingFiles(prev => {
        const updated = { ...prev };
        delete updated[entryIdToDelete];
        return updated;
      });
    } catch (err) {
      console.error('Delete entry error', err);
      alert('Failed to delete entry');
    }
    cancelDelete();
  };

  const handleFileSelect = (entryId, e) => {
    e.stopPropagation();
    const file = e.target.files[0];
    if (!file) return;

    (async () => {
      try {
        const df = await dfd.readCSV(file);
        const responseCount = df.shape[0];
        
        setPendingFiles(prev => ({
          ...prev,
          [entryId]: { file, responseCount }
        }));
        
        const updatedEntries = entries.map(entry => {
          if (entry.id === entryId) {
            return {
              ...entry,
              sourceFile: file.name,
              responseCount: responseCount,
              geminiFileUri: null
            };
          }
          return entry;
        });
        setEntries(updatedEntries);
      } catch (err) {
        console.error('File selection error', err);
        alert('Failed to read file — check console for details');
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

  const startProcess = async () => {
    const entryId = entryToProcess.id;
    const pendingFile = pendingFiles[entryId];
    
    if (pendingFile && workYearData && workYearData._id) {
      setIsUploading(true);
      try {
        const resp = await workYearService.uploadDatasheets(workYearData._id, entryId, [pendingFile.file]);
        if (resp && resp.success) {
          const single = await workYearService.getWorkYearById(workYearData._id);
          if (single && single.success) {
            setWorkYearData(single.workYear);
            const updatedEntry = single.workYear.entries.find(e => e._id === entryId);
            
            setPendingFiles(prev => {
              const updated = { ...prev };
              delete updated[entryId];
              return updated;
            });
            
            navigate(`/organizations/${organizationId}/programs/${programId}/year/${year}/data/${entryId}/process`, {
              state: { entry: updatedEntry, program, year, organization }
            });
            closeProcessModal();
          } else {
            alert('Failed to refresh entry data');
          }
        } else {
          alert(resp.message || 'Upload failed');
        }
      } catch (err) {
        console.error('File upload error', err);
        alert('Upload failed — check console for details');
      } finally {
        setIsUploading(false);
      }
    } else {
      navigate(`/organizations/${organizationId}/programs/${programId}/year/${year}/data/${entryId}/process`, {
        state: { entry: entryToProcess, program, year, organization }
      });
      closeProcessModal();
    }
  };

  return (
    <div className="data-container">
      <header className="data-header">
        <div className="header-content">
          <h1>VADAPRO <span className="subtitle">Data - {program?.name} ({year})</span></h1>
          <div className="header-actions">
            <button onClick={() => navigate(`/organizations/${organizationId}/programs`)} className="back-btn">
              ← Back to Programs
            </button>
            {onLogout && (
              <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                <button onClick={onLogout} className="logout-btn">Logout</button>
                <span style={{fontSize:'20px',color:'#f0f0f0'}}>{currentUser?.username}</span>
              </div>
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
                              {pendingFiles[entry.id] && <span style={{color: '#ffa500', marginLeft: '8px'}}>(pending upload)</span>}
                            </span>
                            {!entry.sourceFile && (
                              <label className="upload-btn-wrapper">
                                <input
                                  type="file"
                                  onChange={(e) => handleFileSelect(entry.id, e)}
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
              {pendingFiles[entryToProcess?.id] && (
                <>
                  <br />
                  The file will be uploaded before processing begins.
                  <br />
                </>
              )}
              Click "Start Process" to continue to the processing page.
            </p>
            <div className="modal-actions">
              <button onClick={closeProcessModal} className="modal-cancel-btn" disabled={isUploading}>
                Cancel
              </button>
              <button 
                onClick={startProcess} 
                className="modal-confirm-btn modal-process-btn"
                disabled={isUploading}
              >
                {isUploading ? 'Uploading...' : 'Start Process'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataPage;