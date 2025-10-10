# VADAPRO Role-Based Access Control System

## Overview

VADAPRO now implements a tag-based account role system that operates exclusively within organization boundaries. Users have no roles outside of organizations, and their permissions are determined by their role within each specific organization.

## Role Types

### Admin
- **Capabilities:**
  - Create, edit, and delete programs within the organization
  - Invite new users to the organization (as members)
  - Remove users from the organization
  - Promote members to admin status
  - Demote other admins to member status (with restrictions)
  - Edit organization details (name, description)
  - Delete the organization (if they have admin privileges)

### Member
- **Capabilities:**
  - View organization details
  - View programs within the organization
  - Participate in programs (if invited)
  - Leave the organization voluntarily

## Role Assignment Rules

1. **Organization Creator**: When a user creates an organization, they automatically become an admin of that organization.

2. **New Invites**: Users invited to an organization start as members by default.

3. **Role Changes**: Only admins can promote members to admin status.

4. **Admin Demotion**: Admins can demote themselves or other admins, but there must always be at least one admin in the organization.

## Database Schema

### Membership Model
```javascript
{
  user: ObjectId (ref: User),
  organization: ObjectId (ref: Organization),
  role: String (enum: ['admin', 'member']),
  joinedAt: Date,
  invitedBy: ObjectId (ref: User)
}
```

### Updated Organization Model
- Removed direct `members` array
- Added virtual fields for `memberships`, `memberCount`, and `adminCount`
- Added optional `description` field

## API Endpoints

### Membership Management

#### POST /membership/invite
Invite a user to an organization (admin only)
```json
{
  "organizationId": "string",
  "username": "string",
  "inviterUsername": "string"
}
```

#### POST /membership/remove
Remove a user from organization (admin only)
```json
{
  "organizationId": "string",
  "username": "string",
  "removerUsername": "string"
}
```

#### POST /membership/change-role
Change user's role in organization
```json
{
  "organizationId": "string",
  "username": "string",
  "newRole": "admin|member",
  "changerUsername": "string"
}
```

#### GET /membership/organization/:organizationId
Get all members of an organization with their roles

#### GET /membership/role/:organizationId/:username
Get a specific user's role in an organization

### Updated Organization Endpoints

All organization management endpoints now check for admin roles:
- Creating organizations: Available to all users
- Editing organizations: Admin only
- Deleting organizations: Admin only

### Updated Program Endpoints

All program management endpoints now check for admin roles:
- Creating programs: Admin only
- Editing programs: Admin only
- Deleting programs: Admin only
- Viewing programs: All organization members

## Permission Checks

### Static Methods in Membership Model
- `Membership.isAdmin(userId, organizationId)`: Check if user is admin
- `Membership.isMember(userId, organizationId)`: Check if user is member (any role)
- `Membership.getUserRole(userId, organizationId)`: Get user's role
- `Membership.countAdmins(organizationId)`: Count admins in organization

### Middleware
- `checkAdminRole`: Verify admin status before action
- `checkMemberRole`: Verify membership before action
- `getUserRole`: Get role information (non-blocking)

## Migration Notes

### Database Migration Required
1. Create new `memberships` collection
2. Migrate existing organization members to membership records:
   - Organization creator → admin role
   - Other members → member role
3. Remove `members` field from organizations

### Frontend Updates Required
1. Update organization member display to show roles
2. Add role management UI for admins
3. Update permission checks for program operations
4. Add user invitation/removal interfaces

## Security Considerations

1. **Role Validation**: All role changes are validated server-side
2. **Admin Protection**: Cannot remove the last admin from an organization
3. **Self-Demotion**: Users can demote themselves but cannot remove themselves if they're the last admin
4. **Invitation Tracking**: All invitations are logged with the inviter information

## Usage Examples

### Creating an Organization
```javascript
// User "john" creates organization "Tech Team"
// Result: john becomes admin of "Tech Team"
```

### Inviting a User
```javascript
// Admin "john" invites "alice" to "Tech Team"
// Result: alice becomes member of "Tech Team"
```

### Promoting a Member
```javascript
// Admin "john" promotes member "alice" to admin
// Result: alice becomes admin of "Tech Team"
```

### Self-Demotion
```javascript
// Admin "alice" demotes herself to member
// Result: alice becomes member (only if other admins exist)
```

This role-based system provides fine-grained control over organization permissions while maintaining simplicity and security.