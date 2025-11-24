import React, { useState, useEffect } from 'react';
import { 
  getOrganizationMembers, 
  inviteUser, 
  removeUser, 
  changeUserRole,
  isUserAdmin 
} from '../services/membershipService';
import './MemberManagement.css';

const MemberManagement = ({ organizationId, currentUser, onClose }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isCurrentUserAdmin, setIsCurrentUserAdmin] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    loadMembers();
    checkAdminStatus();
  }, [organizationId, currentUser]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const response = await getOrganizationMembers(organizationId);
      setMembers(response.memberships || []);
    } catch (err) {
      setError('Failed to load organization members');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const checkAdminStatus = async () => {
    try {
      const adminStatus = await isUserAdmin(organizationId, currentUser);
      setIsCurrentUserAdmin(adminStatus);
    } catch (err) {
      console.error('Failed to check admin status:', err);
    }
  };

  const handleInviteUser = async (e) => {
    e.preventDefault();
    if (!inviteUsername.trim()) return;

    try {
      setInviting(true);
      setError('');
      await inviteUser(organizationId, inviteUsername.trim(), currentUser);
      setSuccess(`Successfully invited ${inviteUsername}`);
      setInviteUsername('');
      loadMembers();
    } catch (err) {
      setError(err.message || 'Failed to invite user');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveUser = async (username) => {
    if (!window.confirm(`Are you sure you want to remove ${username} from the organization?`)) {
      return;
    }

    try {
      setError('');
      await removeUser(organizationId, username, currentUser);
      setSuccess(`Successfully removed ${username}`);
      loadMembers();
    } catch (err) {
      setError(err.message || 'Failed to remove user');
    }
  };

  const handleRoleChange = async (username, newRole) => {
    const action = newRole === 'admin' ? 'promote' : 'demote';
    if (!window.confirm(`Are you sure you want to ${action} ${username}?`)) {
      return;
    }

    try {
      setError('');
      await changeUserRole(organizationId, username, newRole, currentUser);
      setSuccess(`Successfully ${action}d ${username}`);
      loadMembers();
    } catch (err) {
      setError(err.message || 'Failed to change user role');
    }
  };

  if (loading) {
    return (
      <div className="member-management">
        <div className="loading">Loading members...</div>
      </div>
    );
  }

  return (
    <div className="member-management">
      <div className="member-management-header">
        <h2>Organization Members</h2>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {isCurrentUserAdmin && (
        <div className="invite-section">
          <h3>Invite New Member</h3>
          <form onSubmit={handleInviteUser}>
            <input
              type="text"
              placeholder="Enter username to invite"
              value={inviteUsername}
              onChange={(e) => setInviteUsername(e.target.value)}
              disabled={inviting}
            />
            <button type="submit" disabled={inviting || !inviteUsername.trim()}>
              {inviting ? 'Inviting...' : 'Invite'}
            </button>
          </form>
        </div>
      )}

      <div className="members-list">
        <h3>Current Members ({members.length})</h3>
        {members.length === 0 ? (
          <p>No members found</p>
        ) : (
          <div className="members-table">
            <div className="table-header">
              <span>Username</span>
              <span>Role</span>
              <span>Joined</span>
              {isCurrentUserAdmin && <span>Actions</span>}
            </div>
            {members.map((membership) => (
              <div key={membership._id} className="member-row">
                <span className="username">{membership.user?.username}</span>
                <span className={`role ${membership.role}`}>
                  {membership.role}
                </span>
                <span className="joined-date">
                  {new Date(membership.joinedAt).toLocaleDateString()}
                </span>
                {isCurrentUserAdmin && (
                  <div className="actions">
                    {membership.role === 'member' && (
                      <button
                        className="promote-btn"
                        onClick={() => handleRoleChange(membership.user?.username, 'admin')}
                      >
                        Promote to Admin
                      </button>
                    )}
                    {membership.role === 'admin' && membership.user?.username !== currentUser && (
                      <button
                        className="demote-btn"
                        onClick={() => handleRoleChange(membership.user?.username, 'member')}
                      >
                        Demote to Member
                      </button>
                    )}
                    {membership.user?.username !== currentUser && (
                      <button
                        className="remove-btn"
                        onClick={() => handleRemoveUser(membership.user?.username)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberManagement;