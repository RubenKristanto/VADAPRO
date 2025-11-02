import axiosConfig from '../utils/axiosConfig';

// Invite user to organization
export const inviteUser = async (organizationId, username, inviterUsername) => {
  try {
    console.log('Inviting user:', { organizationId, username, inviterUsername });
    const response = await axiosConfig.post('/membership/invite', {
      organizationId,
      username,
      inviterUsername
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Remove user from organization
export const removeUser = async (organizationId, username, removerUsername) => {
  try {
    const response = await axiosConfig.post('/membership/remove', {
      organizationId,
      username,
      removerUsername
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Change user role in organization
export const changeUserRole = async (organizationId, username, newRole, changerUsername) => {
  try {
    const response = await axiosConfig.post('/membership/change-role', {
      organizationId,
      username,
      newRole,
      changerUsername
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Get organization members with roles
export const getOrganizationMembers = async (organizationId) => {
  try {
    const response = await axiosConfig.get(`/membership/organization/${organizationId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Get user's role in organization
export const getUserRole = async (organizationId, username) => {
  try {
    const response = await axiosConfig.get(`/membership/role/${organizationId}/${username}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Check if user is admin in organization
export const isUserAdmin = async (organizationId, username) => {
  try {
    const roleData = await getUserRole(organizationId, username);
    return roleData.success && roleData.role === 'admin';
  } catch (error) {
    return false;
  }
};

// Check if user is member (any role) in organization
export const isUserMember = async (organizationId, username) => {
  try {
    const roleData = await getUserRole(organizationId, username);
    return roleData.success && (roleData.role === 'admin' || roleData.role === 'member');
  } catch (error) {
    return false;
  }
};