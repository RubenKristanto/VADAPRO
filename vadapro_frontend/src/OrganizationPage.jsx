import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './OrganizationPage.css';
import organizationService from './services/organizationService';
import MemberManagement from './components/MemberManagement';
import { isUserAdmin } from './services/membershipService';

function OrganizationsPage({ onLogout, currentUser }) {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [adminOrgs, setAdminOrgs] = useState(new Set());
  
  // Deletion confirmation states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [confirmationStep, setConfirmationStep] = useState('name'); // 'name' or 'final'

  // Edit organization states
  const [editingOrg, setEditingOrg] = useState(null);
  const [editOrgName, setEditOrgName] = useState('');

  // Member management states
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);

  useEffect(() => {
    loadUserOrganizations();
  }, [currentUser]);

  const loadUserOrganizations = async () => {
    if (!currentUser?.username) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await organizationService.getUserOrganizations(currentUser.username);
      if (response.success) {
        setOrganizations(response.organizations);
        // Check admin status for all organizations
        const adminSet = new Set();
        await Promise.all(response.organizations.map(async (org) => {
          if (await isUserAdmin(org._id, currentUser.username)) {
            adminSet.add(org._id);
          }
        }));
        setAdminOrgs(adminSet);
      } else {
        setError(response.message || 'Failed to load organizations');
      }
    } catch (error) {
      setError(error.message || 'Failed to load organizations');
    } finally {
      setIsLoading(false);
    }
  };

  const createOrganization = async () => {
    if (!newOrgName.trim()) {
      setError('Please enter an organization name');
      return;
    }

    if (!currentUser?.username) {
      setError('User information not available');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await organizationService.createOrganization(
        newOrgName.trim(),
        currentUser.username
      );
      
      if (response.success) {
        setSuccess('Organization created successfully!');
        setNewOrgName('');
        await loadUserOrganizations(); // Reload organizations
      } else {
        setError(response.message || 'Failed to create organization');
      }
    } catch (error) {
      setError(error.message || 'Failed to create organization');
    } finally {
      setIsLoading(false);
    }
  };

  const startEdit = (org) => {
    setEditingOrg(org);
    setEditOrgName(org.name);
  };

  const cancelEdit = () => {
    setEditingOrg(null);
    setEditOrgName('');
  };

  const saveEdit = async () => {
    if (!editOrgName.trim()) {
      setError('Please enter an organization name');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await organizationService.editOrganization(
        editingOrg._id,
        editOrgName.trim(),
        currentUser.username
      );
      
      if (response.success) {
        setSuccess('Organization updated successfully!');
        setEditingOrg(null);
        setEditOrgName('');
        await loadUserOrganizations(); // Reload organizations
      } else {
        setError(response.message || 'Failed to update organization');
      }
    } catch (error) {
      setError(error.message || 'Failed to update organization');
    } finally {
      setIsLoading(false);
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

  const finalDelete = async () => {
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await organizationService.deleteOrganization(
        orgToDelete._id,
        currentUser.username
      );
      
      if (response.success) {
        setSuccess('Organization deleted successfully!');
        cancelDelete();
        await loadUserOrganizations(); // Reload organizations
      } else {
        setError(response.message || 'Failed to delete organization');
      }
    } catch (error) {
      setError(error.message || 'Failed to delete organization');
    } finally {
      setIsLoading(false);
    }
  };

  const openMemberModal = (org) => {
    setSelectedOrg(org);
    setShowMemberModal(true);
  };

  const closeMemberModal = () => {
    setShowMemberModal(false);
    setSelectedOrg(null);
  };

  const handleOrganizationClick = (org) => {
    console.log(`Accessing Organization - Name: ${org.name}, ID: ${org._id || org.id}`);
    navigate(`/organizations/${org._id}/programs`, { state: { organization: org } });
  };

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="organizations-container">
      <header className="organizations-header">
        <h1>VADAPRO <span className="subtitle">Organizations</span></h1>
        {onLogout && (
          <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
            <button onClick={onLogout} className="logout-btn">Logout</button>
            <span style={{fontSize:'20px',color:'#f0f0f0'}}>{currentUser?.username}</span>
          </div>
        )}
      </header>
      
      <div className="organizations-content">
        <div className="organizations-rectangle">
          <h2>Organizations Management</h2>
          
          {/* Message Display */}
          {error && (
            <div className="message error-message">
              {error}
              <button onClick={clearMessages} className="close-message">×</button>
            </div>
          )}
          {success && (
            <div className="message success-message">
              {success}
              <button onClick={clearMessages} className="close-message">×</button>
            </div>
          )}

          <div className="organizations-body">
            <div className="create-organization-form">
              <input
                type="text"
                placeholder="Enter organization name"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createOrganization()}
                className="org-input"
                disabled={isLoading}
              />
              <button 
                onClick={createOrganization} 
                className="create-btn"
                disabled={isLoading}
              >
                {isLoading ? 'Creating...' : 'Create Organization'}
              </button>
            </div>
            
            {isLoading && organizations.length === 0 ? (
              <div className="loading-message">Loading organizations...</div>
            ) : (
              <div className="organizations-grid">
                {organizations.map(org => (
                  <div key={org._id} className="organization-item">
                    <div className="organization-header">
                      {editingOrg && editingOrg._id === org._id ? (
                        <div className="edit-form">
                          <input
                            type="text"
                            value={editOrgName}
                            onChange={(e) => setEditOrgName(e.target.value)}
                            className="edit-input"
                            onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                          />
                          <div className="edit-actions">
                            <button onClick={saveEdit} className="save-btn">Save</button>
                            <button onClick={cancelEdit} className="cancel-btn">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          className="organization-name"
                          onClick={() => handleOrganizationClick(org)}
                        >
                          {org.name}
                        </div>
                      )}
                    </div>

                    <div className="organization-info">
                      <div className="org-details">
                        <p><strong>Creator:</strong> {org.creator?.username || 'Unknown'}</p>
                        <p><strong>Members:</strong> {org.memberCount || 0}</p>
                        <p><strong>Programs:</strong> {org.programCount || 0}</p>
                        <p><strong>Created:</strong> {formatDate(org.createdAt)}</p>
                      </div>

                      <div className="organization-actions">
                        {adminOrgs.has(org._id) && (
                          <>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                startEdit(org);
                              }}
                              className="edit-btn"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                initiateDelete(org);
                              }}
                              className="delete-btn"
                              title="Delete Organization"
                            >
                              ×
                            </button>
                          </>
                        )}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            openMemberModal(org);
                          }}
                          className="members-btn"
                        >
                          Manage Members
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {organizations.length === 0 && !isLoading && (
                  <div className="no-organizations">
                    <p>No organizations found. Create your first organization!</p>
                  </div>
                )}
              </div>
            )}
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
                    disabled={isLoading}
                  >
                    {isLoading ? 'Deleting...' : 'Confirm Delete'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Member Management Modal */}
      {showMemberModal && selectedOrg && (
        <div className="modal-overlay" onClick={closeMemberModal}>
          <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
            <MemberManagement
              organizationId={selectedOrg._id}
              currentUser={currentUser.username}
              onClose={() => {
                closeMemberModal();
                loadUserOrganizations(); // Reload organizations after closing
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default OrganizationsPage;