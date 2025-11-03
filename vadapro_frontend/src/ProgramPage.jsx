import { useState, useEffect } from 'react';
import './ProgramPage.css';
import programService from './services/programService';
import workYearService from './services/workYearService';
import { authService } from './services/authentication';

function ProgramsPage({ organization, onBack, onLogout, onYearSelect }) {
  const [programs, setPrograms] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newProgramName, setNewProgramName] = useState('');
  
  // Deletion confirmation states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [programToDelete, setProgramToDelete] = useState(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [confirmationStep, setConfirmationStep] = useState('name'); // 'name' or 'final'
  
  // Year instance states
  const [showYearModal, setShowYearModal] = useState(false);
  const [currentProgramForYear, setCurrentProgramForYear] = useState(null);
  const [newYear, setNewYear] = useState('');
  const [yearError, setYearError] = useState('');

  useEffect(() => {
    // load programs for the organization when mounted or when organization changes
    if (organization && organization._id) {
      loadPrograms();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization]);

  const loadPrograms = async () => {
    if (!organization || !organization._id) return;
    setIsLoading(true);
    try {
      const resp = await programService.getOrganizationPrograms(organization._id);
      if (resp.success) {
        const progs = resp.programs || [];
        // for each program, fetch its work years
        const withYears = await Promise.all(progs.map(async p => {
          try {
            const wy = await workYearService.getProgramWorkYears(p._id);
            return { ...p, years: (wy.workYears || []).map(w => ({ id: w._id, year: w.year })) };
          } catch (e) {
            return { ...p, years: [] };
          }
        }));
        setPrograms(withYears);
      }
    } catch (err) {
      console.error('Failed loading programs', err);
    } finally {
      setIsLoading(false);
    }
  };

  const createProgram = async () => {
    if (!newProgramName.trim()) return;
    if (!authService.getCurrentUser()) return alert('User not available');
    setIsLoading(true);
    try {
      const resp = await programService.createProgram(
        newProgramName.trim(),
        '',
        organization._id,
        authService.getCurrentUser().username
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
  };

  const closeYearModal = () => {
    setShowYearModal(false);
    setCurrentProgramForYear(null);
    setNewYear('');
  };

  const addYear = async () => {
    setYearError('');
    if (!newYear.trim() || !currentProgramForYear) return;
    if (!authService.getCurrentUser()) return alert('User not available');
    setIsLoading(true);
    try {
      const resp = await workYearService.createWorkYear(currentProgramForYear._id, parseInt(newYear.trim(), 10), authService.getCurrentUser().username);
      if (resp.success) {
        // update the program's years
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

  const deleteYear = (programId, yearId, e) => {
    e.stopPropagation();
    // Deleting persisted work years is not implemented on backend yet.
    const isPersisted = typeof yearId === 'string' && yearId.length === 24;
    if (isPersisted) {
      return alert('Deleting persisted work years is not supported in this UI.');
    }
    const updatedPrograms = programs.map(program => {
      if (program._id === programId) {
        return {
          ...program,
          years: program.years.filter(year => year.id !== yearId)
        };
      }
      return program;
    });
    setPrograms(updatedPrograms);
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

  const finalDelete = () => {
    setPrograms(programs.filter(program => program.id !== programToDelete.id));
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
              <button onClick={onLogout} className="logout-btn">
                Logout
              </button>
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
                                  onYearSelect && onYearSelect(program, year.year);
                                }
                              }}
                              style={{ cursor: 'pointer' }}
                            >
                              <span className="year-text">{year.year}</span>
                              <button 
                                onClick={(e) => deleteYear(program._id, year.id, e)}
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
    </div>
  );
}

export default ProgramsPage;