import { useState, useEffect } from 'react';
import './ProgramPage.css';
import programService from './services/programService';
import workYearService from './services/workYearService';
import { authService } from './services/authentication';
import { isUserAdmin } from './services/membershipService';

function ProgramsPage({ organization, onBack, onLogout, onYearSelect, currentUser }) {
  const [programs, setPrograms] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newProgramName, setNewProgramName] = useState('');
  const [yearError, setYearError] = useState('');

  useEffect(() => {
    if (organization && organization._id) loadPrograms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization]);

  const loadPrograms = async () => {
    if (!organization || !organization._id) return;
    setIsLoading(true);
    try {
      const resp = await programService.getOrganizationPrograms(organization._id);
      if (resp.success) {
        const progs = resp.programs || [];
        const withYears = await Promise.all(progs.map(async p => {
          try {
            const wy = await workYearService.getProgramWorkYears(p._id);
            return { ...p, years: (wy.workYears || []).map(w => ({ id: w._id, year: w.year })) };
          } catch (e) {
            return { ...p, years: [] };
          }
        }));
  // Normalize: add `id` field (used by existing UI) mapped from Mongo `_id`
  setPrograms(withYears.map(p => ({ ...p, id: p._id })));
      }
    } catch (err) {
      console.error('Failed loading programs', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Deletion confirmation states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [programToDelete, setProgramToDelete] = useState(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [confirmationStep, setConfirmationStep] = useState('name'); // 'name' or 'final'
  
  // Year instance states
  const [showYearModal, setShowYearModal] = useState(false);
  const [currentProgramForYear, setCurrentProgramForYear] = useState(null);
  const [newYear, setNewYear] = useState('');

  // Year deletion states
  const [showDeleteYearModal, setShowDeleteYearModal] = useState(false);
  const [yearToDelete, setYearToDelete] = useState(null);
  const [deleteYearConfirm, setDeleteYearConfirm] = useState('');

  const createProgram = async () => {
    if (!newProgramName.trim()) return;
    setIsLoading(true);
    try {
      const resp = await programService.createProgram(
        newProgramName.trim(),
        '',
        organization._id
      );
      if (resp.success) {
        setNewProgramName('');
        await loadPrograms();
      } else {
        alert(resp.message || 'Failed to create program');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to create program');
    } finally {
      setIsLoading(false);
    }
  };

  const openYearModal = (program) => {
    setCurrentProgramForYear(program);
    setShowYearModal(true);
    setNewYear('');
    setYearError('');
  };

  const closeYearModal = () => {
    setShowYearModal(false);
    setCurrentProgramForYear(null);
    setNewYear('');
    setYearError('');
  };

  const addYear = async () => {
    setYearError('');
    if (!newYear.trim() || !currentProgramForYear) return;
    if (isNaN(newYear.trim())) return setYearError('Must be year in number');
    setIsLoading(true);
    try {
      const resp = await workYearService.createWorkYear(currentProgramForYear._id, parseInt(newYear.trim(), 10));
      if (resp.success) {
        const updatedPrograms = programs.map(p => {
          if (p._id === currentProgramForYear._id) {
            return { ...p, years: [...(p.years || []), { id: resp.workYear._id, year: resp.workYear.year }] };
          }
          return p;
        });
        setPrograms(updatedPrograms);
        closeYearModal();
      } else {
        setYearError(resp.message || 'Failed to create year');
      }
    } catch (err) {
      console.error('create year err', err);
      setYearError(err.message || 'Failed to create year');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteYear = async (programId, yearId, yearValue, programName, e) => {
    e.stopPropagation();
    const user = authService.getCurrentUser();
    if (!user || !(await isUserAdmin(organization._id, user.username))) return alert('Only admins can delete work years');
    setYearToDelete({ programId, yearId, yearValue, programName });
    setShowDeleteYearModal(true);
    setDeleteYearConfirm('');
  };

  const confirmDeleteYear = async () => {
    const expectedText = `${yearToDelete.programName}/${yearToDelete.yearValue}`;
    if (deleteYearConfirm !== expectedText) return;
    try {
      const user = authService.getCurrentUser();
      await workYearService.deleteWorkYear(yearToDelete.yearId, user.username);
      const updatedPrograms = programs.map(program => {
        if (program._id === yearToDelete.programId) {
          return { ...program, years: program.years.filter(year => year.id !== yearToDelete.yearId) };
        }
        return program;
      });
      setPrograms(updatedPrograms);
      setShowDeleteYearModal(false);
      setYearToDelete(null);
      setDeleteYearConfirm('');
    } catch (err) {
      alert(err.message || 'Failed to delete work year');
    }
  };

  const initiateDelete = (program) => {
    setProgramToDelete(program);
    setShowDeleteModal(true);
    setDeleteConfirmName('');
    setConfirmationStep('name');
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setProgramToDelete(null);
    setDeleteConfirmName('');
    setConfirmationStep('name');
  };

  const proceedToFinalConfirmation = () => {
    if (deleteConfirmName === programToDelete.name) {
      setConfirmationStep('final');
    }
  };

  const goBackToNameEntry = () => {
    setConfirmationStep('name');
  };

  const finalDelete = async () => {
    const user = authService.getCurrentUser();
    if (!user || !(await isUserAdmin(organization._id, user.username))) return alert('Only admins can delete programs');
    try {
      await programService.deleteProgram(programToDelete._id, user.username);
      setPrograms(programs.filter(program => program._id !== programToDelete._id));
    } catch (err) {
      alert(err.message || 'Failed to delete program');
    }
    cancelDelete();
  };

  return (
    <div className="programs-container">
      <header className="programs-header">
        <div className="header-content">
          <h1>VADAPRO <span className="subtitle">Programs - {organization?.name}</span></h1>
          <div className="header-actions">
            <button onClick={onBack} className="back-btn">
              ← Back to Organizations
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
      <div className="programs-content">
        <div className="programs-rectangle">
          <h2>Programs Management</h2>
          <div className="programs-body">
            <div className="create-program-form">
              <input
                type="text"
                placeholder="Enter program name"
                value={newProgramName}
                onChange={(e) => setNewProgramName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createProgram()}
                className="program-input"
              />
              <button onClick={createProgram} className="create-btn">
                Create Program
              </button>
            </div>
            
            <div className="programs-grid">
              {programs.map(program => (
                <div key={program.id} className="program-item">
                  <div className="program-content">
                    <div className="program-header">
                      <div className="program-name">{program.name}</div>
                      <div className="program-actions">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            initiateDelete(program);
                          }}
                          className="delete-btn"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    <div className="add-year-container">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          openYearModal(program);
                        }}
                        className="add-year-btn"
                        title="Add Year Instance"
                      >
                        + Year
                      </button>
                    </div>
                          {program.years && program.years.length > 0 && (
                      <div className="years-container">
                        <div className="years-scroll">
                          {program.years.map(year => (
                            <div 
                              key={year.id} 
                              className="year-item"
                              onClick={(e) => {
                                // Only navigate if not clicking delete button
                                if (!e.target.classList.contains('year-delete-btn')) {
                                  console.log(`Accessing Program - Name: ${program.name}, ID: ${program._id || program.id}, Year: ${year.year}`);
                                  onYearSelect && onYearSelect(program, year.year);
                                }
                              }}
                              style={{ cursor: 'pointer' }}
                            >
                              <span className="year-text">{year.year}</span>
                              <button 
                                onClick={(e) => deleteYear(program._id, year.id, year.year, program.name, e)}
                                className="year-delete-btn"
                                title="Delete Year"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            {confirmationStep === 'name' ? (
              <>
                <h3 className="modal-title">Delete Program</h3>
                <p className="modal-description">
                  To confirm deletion of "<strong>{programToDelete?.name}</strong>", 
                  please type the program name below:
                </p>
                <input
                  type="text"
                  placeholder="Type program name"
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
                    disabled={deleteConfirmName !== programToDelete?.name}
                  >
                    Continue
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="modal-title">Final Confirmation</h3>
                <p className="modal-description">
                  Are you sure you want to delete "<strong>{programToDelete?.name}</strong>"?
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

      {/* Add Year Modal */}
      {showYearModal && (
        <div className="modal-overlay" onClick={closeYearModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Add Year Instance</h3>
            <p className="modal-description">
              Add a year instance for "<strong>{currentProgramForYear?.name}</strong>"
            </p>
            <input
              type="text"
              placeholder="Enter year (e.g., 2024)"
              value={newYear}
              onChange={(e) => setNewYear(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addYear()}
              className="modal-input"
              autoFocus
            />
            {yearError && <p style={{ color: 'red', fontSize: '0.85rem', marginTop: '0.5rem' }}>{yearError}</p>}
            <div className="modal-actions">
              <button onClick={closeYearModal} className="modal-cancel-btn">
                Cancel
              </button>
              <button 
                onClick={addYear} 
                className="modal-confirm-btn"
                disabled={!newYear.trim()}
              >
                Add Year
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Year Modal */}
      {showDeleteYearModal && (
        <div className="modal-overlay" onClick={() => { setShowDeleteYearModal(false); setYearToDelete(null); setDeleteYearConfirm(''); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Delete Year</h3>
            <p className="modal-description">
              To confirm deletion, type "<strong>{yearToDelete?.programName}/{yearToDelete?.yearValue}</strong>":
            </p>
            <input
              type="text"
              placeholder={`Type ${yearToDelete?.programName}/${yearToDelete?.yearValue}`}
              value={deleteYearConfirm}
              onChange={(e) => setDeleteYearConfirm(e.target.value)}
              className="modal-input"
              autoFocus
            />
            <div className="modal-actions">
              <button onClick={() => { setShowDeleteYearModal(false); setYearToDelete(null); setDeleteYearConfirm(''); }} className="modal-cancel-btn">
                Cancel
              </button>
              <button 
                onClick={confirmDeleteYear} 
                className="modal-confirm-btn"
                disabled={deleteYearConfirm !== `${yearToDelete?.programName}/${yearToDelete?.yearValue}`}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProgramsPage;