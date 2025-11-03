import { useState, useEffect, useRef } from 'react';
import './DataPage.css';
import workYearService from './services/workYearService';

function DataPage({ program, year, onBack, onLogout }) {
  const [entries, setEntries] = useState([]);
  const [expandedEntries, setExpandedEntries] = useState(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEntryName, setNewEntryName] = useState('');
  const [workYearData, setWorkYearData] = useState(null);
  const datasheetInputRef = useRef(null);
  const imageInputRef = useRef(null);
  
  // Delete confirmation states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [confirmationStep, setConfirmationStep] = useState('name');

  const openAddModal = () => {
    setShowAddModal(true);
    setNewEntryName('');
  };

  useEffect(() => {
    // Load workYear info (datasheets/images) if program and year provided
    const loadWorkYear = async () => {
      if (!program || !year) return;
      try {
        // We need to find the workYear by querying program's workYears list
        // The backend provides an endpoint to list work years for a program
        const resp = await workYearService.getProgramWorkYears(program._id);
        if (resp.success) {
          const found = (resp.workYears || []).find(w => w.year === parseInt(year, 10));
          if (found) {
            const single = await workYearService.getWorkYearById(found._id);
            if (single.success) setWorkYearData(single.workYear);
            else setWorkYearData(null);
          } else {
            setWorkYearData(null);
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

  const handleUploadDatasheets = async (e) => {
    e.preventDefault();
    if (!workYearData) return alert('No work year selected or work year not found');
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    try {
      const resp = await workYearService.uploadDatasheets(workYearData._id, files);
      if (resp.success) {
        // refresh
        const single = await workYearService.getWorkYearById(workYearData._id);
        if (single.success) setWorkYearData(single.workYear);
        alert('Datasheets uploaded');
      } else {
        alert(resp.message || 'Upload failed');
      }
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    }
  };

  const handleUploadImages = async (e) => {
    e.preventDefault();
    if (!workYearData) return alert('No work year selected or work year not found');
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    try {
      const resp = await workYearService.uploadImages(workYearData._id, files);
      if (resp.success) {
        const single = await workYearService.getWorkYearById(workYearData._id);
        if (single.success) setWorkYearData(single.workYear);
        alert('Images uploaded');
      } else {
        alert(resp.message || 'Upload failed');
      }
    } catch (err) {
      console.error(err);
      alert('Upload failed');
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
          
          {/* Work year files (datasheets / images) */}
          <div className="workyear-files-container" style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <strong>Work Year Files:</strong>
              {workYearData ? (
                <span>{workYearData.year} — {workYearData.notes || ''}</span>
              ) : (
                <span>No work year data available for this program/year</span>
              )}
            </div>

            <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input type="file" multiple style={{ display: 'none' }} ref={datasheetInputRef} onChange={handleUploadDatasheets} />
              <button className="action-btn upload-btn" onClick={() => datasheetInputRef.current && datasheetInputRef.current.click()} disabled={!workYearData}>
                Upload Datasheets
              </button>

              <input type="file" accept="image/*" multiple style={{ display: 'none' }} ref={imageInputRef} onChange={handleUploadImages} />
              <button className="action-btn upload-btn" onClick={() => imageInputRef.current && imageInputRef.current.click()} disabled={!workYearData}>
                Upload Images
              </button>

              {workYearData && workYearData.datasheets && workYearData.datasheets.length > 0 && (
                <div className="files-list">
                  <strong>Datasheets:</strong>
                  {workYearData.datasheets.map(ds => (
                    <a key={ds.filename} href={ds.url} target="_blank" rel="noreferrer" style={{ marginLeft: 8 }}>{ds.originalname}</a>
                  ))}
                </div>
              )}

              {workYearData && workYearData.images && workYearData.images.length > 0 && (
                <div className="files-list">
                  <strong>Images:</strong>
                  {workYearData.images.map(img => (
                    <a key={img.filename} href={img.url} target="_blank" rel="noreferrer" style={{ marginLeft: 8 }}>{img.originalname}</a>
                  ))}
                </div>
              )}
            </div>
          </div>

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