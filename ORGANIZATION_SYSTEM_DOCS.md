# Organization and Program System Documentation

## Overview
The VADAPRO application provides comprehensive CRUD operations for managing organizations and programs with full MongoDB integration and seamless frontend-backend communication.

## Database Schema

### Organization Model (organizationModel.js)
```javascript
{
  name: String (required, unique, 3-100 chars),
  creator: ObjectId (ref: User, required),
  members: [ObjectId] (ref: User),
  programs: [ObjectId] (ref: Program),
  createdAt: Date (auto),
  // Virtuals:
  memberCount: Number,
  programCount: Number
}
```

### User Model (userModel.js)
```javascript
{
  username: String (required, unique, min 3 chars),
  password: String (required, min 3 chars),
  organizations: [ObjectId] (ref: Organization)
}
```

### Program Model (programModel.js)
```javascript
{
  name: String (required, 3-100 chars),
  description: String (max 500 chars),
  organization: ObjectId (ref: Organization, required),
  creator: ObjectId (ref: User, required),
  participants: [ObjectId] (ref: User),
  startDate: Date (default: now),
  endDate: Date,
  status: String (enum: active, completed, cancelled, pending, default: active),
  createdAt: Date (auto),
  // Virtuals:
  participantCount: Number
}
```

## API Endpoints

### Organization Routes (/org)

#### POST /org/create
Create a new organization
```json
Request Body:
{
  "name": "Organization Name",
  "creatorUsername": "username"
}

Response:
{
  "success": true,
  "message": "Organization created successfully",
  "organization": { ... }
}
```

#### GET /org/all
Get all organizations with populated references

#### GET /org/user/:username
Get organizations for a specific user (creator or member)

#### GET /org/:id
Get single organization by ID with populated references

#### PUT /org/:id
Edit organization (name only, requires creator/member permission)
```json
Request Body:
{
  "name": "New Organization Name",
  "editorUsername": "username"
}
```

#### DELETE /org/:id
Delete organization (creator only)
```json
Request Body:
{
  "deleterUsername": "username"
}
```

#### POST /org/:id/members/add
Add member to organization
```json
Request Body:
{
  "newMemberUsername": "username",
  "adderUsername": "current_user"
}
```

#### POST /org/:id/members/remove
Remove member from organization
```json
Request Body:
{
  "memberUsername": "username_to_remove",
  "removerUsername": "current_user"
}
```

### Program Routes (/programs)

#### POST /programs/create
Create a new program
```json
Request Body:
{
  "name": "Program Name",
  "description": "Program description (optional)",
  "organizationId": "organization_id",
  "creatorUsername": "username",
  "startDate": "2024-01-01", // optional
  "endDate": "2024-12-31"    // optional
}

Response:
{
  "success": true,
  "message": "Program created successfully",
  "program": { ... }
}
```

#### GET /programs/organization/:organizationId
Get all programs for an organization

#### GET /programs/:id
Get single program by ID with populated references

#### PUT /programs/:id
Edit program (requires program creator or organization creator permission)
```json
Request Body:
{
  "name": "New Program Name",
  "description": "Updated description",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "status": "active",
  "editorUsername": "username"
}
```

#### DELETE /programs/:id
Delete program (program creator or organization creator only)
```json
Request Body:
{
  "deleterUsername": "username"
}
```

#### POST /programs/:id/participants/add
Add participant to program
```json
Request Body:
{
  "participantUsername": "username",
  "adderUsername": "current_user"
}
```

#### POST /programs/:id/participants/remove
Remove participant from program
```json
Request Body:
{
  "participantUsername": "username_to_remove",
  "removerUsername": "current_user"
}
```

## Frontend Integration

### OrganizationService (organizationService.js)
Centralized service for all organization API calls with error handling:
- createOrganization()
- getAllOrganizations()
- getUserOrganizations()
- getOrganizationById()
- editOrganization()
- deleteOrganization()
- addMember()
- removeMember()

### ProgramService (programService.js)
Centralized service for all program API calls with error handling:
- createProgram()
- getOrganizationPrograms()
- getProgramById()
- editProgram()
- deleteProgram()
- addParticipant()
- removeParticipant()

### OrganizationsPage Component
Enhanced React component with:
- Real-time organization loading
- Inline editing for organization names
- Member management modal
- Confirmation dialogs for deletions
- Success/error message display
- Loading states
- Permission-based action visibility

### ProgramsPage Component (to be enhanced)
React component for program management within organizations

## Security Features

### Backend Security
- Input validation and sanitization
- Permission-based access control
- ObjectId validation
- Error handling with appropriate status codes
- Creator/member permission checking
- Organization membership validation for programs

### Frontend Security
- User authentication state management
- Permission-based UI rendering
- Input validation
- Error boundary handling

## Database Operations

### Automatic Relationships
- Creator automatically becomes member/participant
- Organization/Program added to respective collections
- Member/participant removal updates both collections
- Cascade operations on deletion

### Performance Optimizations
- Database indexes on frequently queried fields
- Population of references for complete data
- Virtual fields for counts
- Efficient query patterns

## Key Changes Made

### Removed Update Timestamps
- Removed `updatedAt` field from Organization model
- Removed `updatedAt` field from Program model
- Removed `timestamps: true` option from schema definitions
- Removed middleware for updating `updatedAt`
- Only `createdAt` timestamps are maintained

### Program Schema Created
- Complete Program model with relationships
- Program controller with full CRUD operations
- Program routes for API endpoints
- Program service for frontend integration
- Permission system for program management

## Integration Points

### Authentication Integration
- Uses existing auth service
- Current user context throughout
- Token-based API authentication
- User session management

### State Management
- React hooks for local state
- Automatic data refresh after operations
- Optimistic UI updates
- Error state handling

## Error Handling

### Backend Errors
- Validation errors (400)
- Authentication errors (401)
- Permission errors (403)
- Not found errors (404)
- Conflict errors (409)
- Server errors (500)

### Frontend Error Handling
- Network error detection
- User-friendly error messages
- Retry mechanisms
- Graceful degradation

## Future Enhancements

### Planned Features
- Enhanced ProgramsPage UI component
- Program search functionality
- Bulk participant operations
- Program templates
- Role-based permissions
- Organization/Program statistics
- Activity logs
- Email invitations
- Program status tracking
- Calendar integration

### Scalability Considerations
- Pagination for large datasets
- Caching strategies
- Background job processing
- Performance monitoring

## Testing Recommendations

### Unit Tests
- Model validation
- Controller logic
- Service methods
- Component rendering

### Integration Tests
- API endpoint testing
- Database operations
- Authentication flows
- Permission checking

### End-to-End Tests
- Complete user workflows
- Cross-browser compatibility
- Mobile responsiveness
- Performance testing