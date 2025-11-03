import { useState } from 'react';
import axios from 'axios';
import './ProgramPage.css';

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

  const createProgram = () => {
    if (newProgramName.trim()) {
      const newProgram = {
        id: Date.now(), // Simple ID generation
        name: newProgramName.trim(),
        organizationId: organization.id,
        years: [] // Initialize empty years array
      };
      setPrograms([...programs, newProgram]);
      setNewProgramName('');
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

  const addYear = () => {
    if (newYear.trim() && currentProgramForYear) {
      const updatedPrograms = programs.map(program => {
        if (program.id === currentProgramForYear.id) {
          return {
            ...program,
            years: [...(program.years || []), { id: Date.now(), year: newYear.trim() }]
          };
        }
        return program;
      });
      setPrograms(updatedPrograms);
      closeYearModal();
    }
  };

  const deleteYear = (programId, yearId, e) => {
    e.stopPropagation();
    const updatedPrograms = programs.map(program => {
      if (program.id === programId) {
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
                                onClick={(e) => deleteYear(program.id, year.id, e)}
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