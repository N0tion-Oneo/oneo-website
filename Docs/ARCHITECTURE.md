# Oneo Platform - System Architecture

## Overview

Oneo is a recruitment platform built with a modern, decoupled architecture following API-first design principles.

## Technology Stack

### Backend
- **Framework**: Django 5.2
- **API Framework**: Django REST Framework 3.16
- **Database**: PostgreSQL 14+
- **Authentication**: JWT (Simple JWT) with httpOnly cookies
- **ORM**: Django ORM
- **Task Queue**: (Future: Celery + Redis for async tasks)

### Frontend
- **Framework**: React 18
- **Language**: TypeScript 5+
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS 3 + Headless UI
- **State Management**: TanStack Query (React Query) for server state
- **Forms**: React Hook Form + Zod validation
- **HTTP Client**: Axios

### Infrastructure
- **Web Server**: (Production: Gunicorn + Nginx)
- **Database**: PostgreSQL 14+
- **File Storage**: (Production: AWS S3 or similar)
- **Email**: (Production: SendGrid / AWS SES)
- **Monitoring**: (Future: Sentry for error tracking)

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  React App   │  │  Mobile App  │  │  Third Party │      │
│  │  (Browser)   │  │   (Future)   │  │    (API)     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                           │
                  ┌────────▼────────┐
                  │   REST API      │
                  │  (Django  DRF)  │
                  └────────┬────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
┌───────▼──────┐  ┌────────▼────────┐  ┌────▼─────┐
│  PostgreSQL  │  │   File Storage  │  │  Email   │
│   Database   │  │  (Local/S3)     │  │  Service │
└──────────────┘  └─────────────────┘  └──────────┘
```

## Key Architectural Decisions

### 1. API-First Design

**Decision**: All business logic lives in the backend API. Frontend is a pure consumer.

**Rationale**:
- Enables multiple frontend clients (web, mobile, integrations)
- Clear separation of concerns
- Easier to maintain and test
- Better security (business logic not exposed in client)

**Implementation**:
- Django REST Framework provides all endpoints
- React communicates exclusively via API calls
- No direct database access from frontend
- All data validation happens server-side (with client-side for UX)

### 2. JWT with httpOnly Cookies

**Decision**: Use JWT tokens stored in httpOnly cookies instead of localStorage.

**Rationale**:
- Protection against XSS attacks (JavaScript cannot access cookies)
- Automatic token inclusion in requests
- Refresh token pattern for session persistence
- Better security than localStorage

**Implementation**:
```python
# Backend sets cookie
response.set_cookie(
    key='access_token',
    value=token,
    httponly=True,
    secure=True,  # HTTPS only in production
    samesite='Lax'
)
```

```typescript
// Frontend axios config
axios.defaults.withCredentials = true  // Include cookies in requests
```

### 3. Role-Based Access Control (RBAC)

**Decision**: Single role per user, with company-level permissions for clients.

**Roles**:
- **Candidate**: Job seekers, can apply to jobs, book calls
- **Client**: Company users, can post jobs, view applications
- **Recruiter**: Internal staff, manage candidates and scheduling
- **Admin**: System administrators, full access

**Company Permissions** (for client users):
- **Admin**: Full control (manage company, users, all jobs)
- **Editor**: Manage jobs, view shared candidates
- **Viewer**: Read-only access

**Implementation**:
- Django permission classes: `IsCandidate`, `IsCompanyAdmin`, etc.
- Frontend route guards based on user role
- Permissions checked on every API request

### 4. Profile Visibility Control

**Decision**: Two visibility modes for candidate profiles: private and public_sanitised.

**Sanitization Rules**:
- **Hidden**: Full name, email, phone, exact company names, exact salary
- **Shown**: Professional title + years, skills, industries, anonymized experience

**Implementation**:
```python
class CandidateProfileSerializer(serializers.ModelSerializer):
    def to_representation(self, instance):
        if not self.context['request'].user.is_authenticated:
            return SanitizedProfileSerializer(instance).data
        return super().to_representation(instance)
```

### 5. Multi-Tenancy (Companies)

**Decision**: Multiple users per company, with role-based permissions.

**Rationale**:
- Real-world companies have multiple hiring managers
- Need different permission levels (admin, editor, viewer)
- Jobs belong to company, not individual users

**Implementation**:
- `CompanyUser` model links users to companies with roles
- Middleware injects company context into requests
- All company-related queries filtered by company

### 6. Custom Job Pipelines

**Decision**: Allow clients to define custom application stages per job.

**Rationale**:
- Different roles have different hiring processes
- Flexibility for clients to match their workflow
- Standardize common stages but allow customization

**Default Stages**: Applied → Screening → Interviewing → Offer
**Custom**: Clients can add, remove, reorder, rename stages

### 7. Interview Scheduling Workflow

**Decision**: Three-step workflow: Recruiter proposes → Client selects → Candidate chooses.

**Rationale**:
- Respects all parties' availability
- Reduces back-and-forth communication
- Clear workflow with notifications at each step

**Flow**:
1. Recruiter proposes 3-5 time slots
2. Client selects preferred 2-3 times (or proposes new ones)
3. Candidate selects final time from client's selection
4. Calendar events created for all parties

### 8. Data Modeling

**Relationships**:
```
User (1) ─── (1) CandidateProfile
User (1) ─── (N) CompanyUser ─── (N) Company
Company (1) ─── (N) Job
Job (1) ─── (N) Application ─── (N) Candidate
Job (1) ─── (N) ApplicationQuestion
Job (1) ─── (N) ApplicationStage
Application (1) ─── (N) ApplicationAnswer
Booking (N) ─── (1) MeetingType
```

### 9. API Versioning

**Decision**: Version API at `/api/v1/` level.

**Rationale**:
- Allows breaking changes without affecting existing clients
- Clear upgrade path for clients
- Standard REST practice

**Implementation**:
```python
# urls.py
urlpatterns = [
    path('api/v1/', include('api.urls')),
    # Future: path('api/v2/', include('api_v2.urls')),
]
```

### 10. Error Handling

**Decision**: Consistent error response format across all endpoints.

**Format**:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field_name": ["Error message for field"]
    }
  }
}
```

**HTTP Status Codes**:
- `200 OK`: Success
- `201 Created`: Resource created
- `204 No Content`: Success with no body
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Permission denied
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

## Security Considerations

### Authentication
- JWT tokens expire after 15 minutes
- Refresh tokens valid for 7 days
- Password hashing with Django's PBKDF2
- Email verification required for new accounts

### Data Protection
- SQL injection: Protected by Django ORM
- XSS: httpOnly cookies, React escapes output
- CSRF: Django CSRF middleware, SameSite cookies
- Sensitive data: Encrypted in database (future enhancement)

### API Rate Limiting
(Future implementation)
- 100 requests/minute per user
- 1000 requests/hour per IP
- Stricter limits for public endpoints

## Performance Optimization

### Database
- Indexes on frequently queried fields (email, slug, foreign keys)
- `select_related()` and `prefetch_related()` for query optimization
- Database connection pooling

### Frontend
- Code splitting by route
- Lazy loading components
- Image optimization
- TanStack Query caching

### Caching
(Future implementation)
- Redis for session storage
- Cache expensive queries
- CDN for static assets

## Monitoring & Logging

### Application Logging
- Django logs to console (development)
- Structured logs to file (production)
- Error tracking with Sentry (future)

### Metrics
(Future implementation)
- Response times
- Error rates
- User activity
- System resource usage

## Deployment Architecture

### Development
```
localhost:8000 (Django) + localhost:5173 (Vite)
PostgreSQL on localhost
```

### Production
```
┌──────────┐
│  Nginx   │ (Reverse proxy, SSL termination)
└────┬─────┘
     │
     ├─> Static files (S3/CDN)
     │
     └─> ┌─────────────┐
         │  Gunicorn   │ (WSGI server, multiple workers)
         └──────┬──────┘
                │
         ┌──────▼──────┐
         │  PostgreSQL │
         └─────────────┘
```

## Future Enhancements

1. **Async Task Queue**: Celery for email sending, report generation
2. **Full-Text Search**: Elasticsearch for job/candidate search
3. **Real-Time Features**: WebSockets for live updates
4. **Mobile App**: React Native using same API
5. **Analytics Dashboard**: Business intelligence for clients
6. **AI Features**: Resume parsing, candidate matching

## Development Workflow

1. Create/modify models
2. Generate migrations
3. Create serializers
4. Create views
5. Add URL routing
6. Write tests
7. Create TypeScript types
8. Create API hooks
9. Build UI components
10. Test end-to-end

## Testing Strategy

### Backend
- Unit tests: Models, serializers, utilities
- Integration tests: API endpoints
- Permission tests: Authorization rules
- Coverage target: >80%

### Frontend
- Component tests: Render, interaction
- Hook tests: Custom hooks
- Integration tests: User flows
- E2E tests: Critical paths (future)

## Documentation

- API documentation: DRF Spectacular (OpenAPI/Swagger)
- Code comments: Docstrings for all classes/functions
- Architecture docs: This file
- User guides: (Future: separate docs site)

---

**Last Updated**: December 2024
**Version**: 1.0
**Maintainer**: Oneo Development Team
