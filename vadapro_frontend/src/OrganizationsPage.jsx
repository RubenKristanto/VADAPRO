import { useState } from 'react';
import axios from 'axios';
import './OrganizationsPage.css';

function OrganizationsPage({ onLogout }) {
  const [organizations, setOrganizations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  
  // Deletion confirmation states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [confirmationStep, setConfirmationStep] = useState('name'); // 'name' or 'final'

  const createOrganization = () => {
    if (newOrgName.trim()) {
      const newOrg = {
        id: Date.now(), // Simple ID generation
        name: newOrgName.trim()
      };
      setOrganizations([...organizations, newOrg]);
      setNewOrgName('');
    }
  };

  const initiateDelete = (org) => {
    setOrgToDelete(org);
    setShowDeleteModal(true);
    setDeleteConfirmName('');
    setConfirmationStep('name');
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setOrgToDelete(null);
    setDeleteConfirmName('');
    setConfirmationStep('name');
  };

  const proceedToFinalConfirmation = () => {
    if (deleteConfirmName === orgToDelete.name) {
      setConfirmationStep('final');
    }
  };

  const goBackToNameEntry = () => {
    setConfirmationStep('name');
  };

  const finalDelete = () => {
    setOrganizations(organizations.filter(org => org.id !== orgToDelete.id));
    cancelDelete();
  };

  return (
    <div className="organizations-container">
      <header className="organizations-header">
        <h1>VADAPRO <span className="subtitle">Organizations</span></h1>
        {onLogout && (
          <button onClick={onLogout} className="logout-btn">
            Logout
          </button>
        )}
      </header>
      <div className="organizations-content">
        <div className="organizations-rectangle">
          <h2>Organizations Management</h2>
          <div className="organizations-body">
            <div className="create-organization-form">
              <input
                type="text"
                placeholder="Enter organization name"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && createOrganization()}
                className="org-input"
              />
              <button onClick={createOrganization} className="create-btn">
                Create Organization
              </button>
            </div>
            
            <div className="organizations-grid">
              {organizations.map(org => (
                <div key={org.id} className="organization-item">
                  <div className="organization-name">{org.name}</div>
                  <button 
                    onClick={() => initiateDelete(org)}
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
                <h3 className="modal-title">Delete Organization</h3>
                <p className="modal-description">
                  To confirm deletion of "<strong>{orgToDelete?.name}</strong>", 
                  please type the organization name below:
                </p>
                <input
                  type="text"
                  placeholder="Type organization name"
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
                    disabled={deleteConfirmName !== orgToDelete?.name}
                  >
                    Continue
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="modal-title">Final Confirmation</h3>
                <p className="modal-description">
                  Are you sure you want to delete "<strong>{orgToDelete?.name}</strong>"?
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

export default OrganizationsPage;