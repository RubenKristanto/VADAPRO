import { useState } from 'react';
import axios from 'axios';
import './ProgramPage.css';

function ProgramsPage({ organization, onBack, onLogout }) {
  const [programs, setPrograms] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newProgramName, setNewProgramName] = useState('');
  
  // Deletion confirmation states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [programToDelete, setProgramToDelete] = useState(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [confirmationStep, setConfirmationStep] = useState('name'); // 'name' or 'final'

  const createProgram = () => {
    if (newProgramName.trim()) {
      const newProgram = {
        id: Date.now(), // Simple ID generation
        name: newProgramName.trim(),
        organizationId: organization.id
      };
      setPrograms([...programs, newProgram]);
      setNewProgramName('');
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
                onKeyPress={(e) => e.key === 'Enter' && createProgram()}
                className="program-input"
              />
              <button onClick={createProgram} className="create-btn">
                Create Program
              </button>
            </div>
            
            <div className="programs-grid">
              {programs.map(program => (
                <div key={program.id} className="program-item">
                  <div className="program-name">{program.name}</div>
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
    </div>
  );
}

export default ProgramsPage;