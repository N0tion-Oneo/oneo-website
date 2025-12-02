# Oneo Recruitment Platform - Claude Instructions

## Project Overview

This is a full-stack recruitment/talent marketplace platform built with:
- **Backend**: Django 5.2 + Django REST Framework + PostgreSQL
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Headless UI
- **Architecture**: API-first design with JWT authentication (httpOnly cookies)

## Project Goals

Build a modern recruitment platform where:
1. **Candidates** create profiles, apply to jobs, book calls with recruiters
2. **Companies** (clients) post jobs, manage applications, view candidate pipelines
3. **Recruiters** manage candidates, schedule interviews, track placements
4. **Admins** manage system settings, email templates, integration logs

## Key Architectural Decisions

### Authentication
- JWT tokens stored in httpOnly cookies (secure, XSS-protected)
- Refresh token flow for session persistence
- Role-based access control (candidate, client, recruiter, admin)
- No multi-role users (one user = one role)

### Profile Visibility
- **Public**: Sanitized profiles (hide name, email, phone, exact company names, salary)
- **Authenticated**: Full profile visibility
- Candidates control visibility via toggle (private/public_sanitised)

### Company Multi-Tenancy
- Multiple users per company
- Role-based permissions: admin (full control), editor (manage jobs), viewer (read-only)
- Company admin can invite/remove team members

### Application Workflow
- Custom questions per job (text, textarea, select, multi-select, file upload)
- Custom pipeline stages per job (drag-drop Kanban interface)
- Statuses: applied → screening → shortlisted → interviewing (scheduled/completed) → offer → accepted/rejected/withdrawn

### Booking System
- Meeting types configurable (duration, buffers, calendar IDs, questions)
- Candidate intro calls: candidate selects specific recruiter
- Client discovery: goes to sales calendar
- Interview scheduling: recruiter proposes times → client selects → candidate chooses final time

## File Structure

### Backend (`/backend`)
```
backend/
├── config/              # Django project settings
│   ├── settings.py      # Main settings (uses .env)
│   └── urls.py          # Root URL configuration
├── api/                 # API app (will expand to multiple apps)
│   ├── models.py        # Data models
│   ├── serializers.py   # DRF serializers
│   ├── views.py         # API views
│   ├── urls.py          # API URL routing
│   └── permissions.py   # Custom permissions
├── manage.py            # Django management script
├── requirements.txt     # Python dependencies
└── .env                 # Environment variables (not in git)
```

### Frontend (`/frontend`)
```
frontend/
├── src/
│   ├── components/      # Reusable UI components
│   ├── features/        # Feature-specific components
│   ├── layouts/         # Layout components (MainLayout, DashboardLayout)
│   ├── pages/           # Page components (routes)
│   ├── services/        # API client, axios setup
│   ├── hooks/           # Custom React hooks
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Helper functions
│   ├── constants/       # App constants (colors, routes, enums)
│   └── contexts/        # React contexts (AuthContext, etc.)
├── public/              # Static assets
└── vite.config.ts       # Vite configuration
```

## Oneo Brand Colors

Use these consistently:
- **Dark Blue/Green** (Primary): `#003E49`
- **Light Blue** (Secondary): `#0D646D`
- **Orange** (Accent): `#FF7B55`
- **Light Orange**: `#FFAB97`

Font: **Poppins** (via Google Fonts)

## Database Schema Reference

### Core Models

**User** (extends Django AbstractUser):
- email, password, first_name, last_name, phone, avatar
- role: enum (candidate, client, recruiter, admin)
- is_verified, verification_token

**CandidateProfile** (OneToOne with User):
- professional_title, headline, seniority, years_of_experience
- city, country, region
- professional_summary, skills (M2M), industries (M2M)
- work_preference, willing_to_relocate, preferred_locations (JSON)
- salary_expectation_min/max, salary_currency, notice_period_days
- portfolio_links (JSON), resume_url
- visibility (private/public_sanitised), profile_completeness

**Experience** (FK to CandidateProfile):
- job_title, company_name, company_size, industry
- start_date, end_date, is_current
- description, achievements, technologies_used (JSON)
- order (for sorting)

**Education** (FK to CandidateProfile):
- institution, degree, field_of_study
- start_date, end_date, is_current, grade, description
- order

**Company**:
- name, slug, logo_url, tagline, description
- industry, company_size, founded_year, funding_stage
- headquarters_city, headquarters_country, locations (JSON)
- culture_description, values (JSON), benefits (JSON structured)
- tech_stack (JSON), interview_process, remote_work_policy
- is_published

**CompanyUser** (FK to User and Company):
- role: enum (admin, editor, viewer)
- joined_at, invited_by, is_active

**Job**:
- title, slug, seniority, job_type, status (draft/published/closed/filled/archived)
- summary, description, requirements, nice_to_haves, responsibilities
- location_city, location_country, work_mode, remote_regions (JSON)
- salary_min/max, salary_currency, salary_visible, equity_offered
- benefits (JSON), tech_stack (JSON), department
- company (FK), created_by (FK), assigned_recruiter (FK)
- required_skills (M2M), nice_to_have_skills (M2M)
- views_count, applications_count, published_at, application_deadline

**ApplicationQuestion** (FK to Job):
- question_text, question_type (text, textarea, select, multi_select, file)
- options (JSON), is_required, order

**ApplicationStage** (FK to Job):
- name, order, is_default, color (hex)

**Application**:
- job (FK), candidate (FK)
- covering_statement, resume_url
- status, applied_at, last_status_change
- rejection_reason, feedback (internal)
- source, referrer (FK)

**ApplicationAnswer** (FK to Application and ApplicationQuestion):
- answer_text, answer_file_url

**MeetingType**:
- name, slug, type (candidate_intro, client_discovery, interview)
- duration_minutes, buffer_before/after_minutes
- calendar_id, qualification_questions (JSON)
- assigned_to (FK to User, nullable for shared)
- is_active, description, confirmation_message

**Booking**:
- meeting_type (FK), organizer (FK), candidate (FK), client_user (FK)
- related_job (FK), related_application (FK)
- title, description, scheduled_at, duration_minutes, meeting_url
- calendar_event_id, attendee_name/email/company/topic (for public bookings)
- status (scheduled, confirmed, completed, cancelled, no_show)
- client_proposed_times (JSON), candidate_selected_time
- created_at, cancelled_at, cancellation_reason

**NotificationReminder** (FK to Booking):
- reminder_type (email, sms), send_at, sent_at, status

**EmailTemplate**:
- name, slug, subject, body (with {{placeholders}})
- available_placeholders (JSON)
- is_active, updated_at, updated_by

**NethuntLog**:
- event_type, status (success/failure)
- payload (JSON), response (JSON), error_message
- related_job (FK), related_application (FK)
- retry_count, last_retry_at

## API Endpoint Patterns

All API endpoints are versioned: `/api/v1/`

### Authentication
- `POST /api/v1/auth/register/` - Candidate signup
- `POST /api/v1/auth/login/` - Login (returns httpOnly cookie)
- `POST /api/v1/auth/logout/` - Logout
- `POST /api/v1/auth/refresh/` - Refresh token
- `GET /api/v1/auth/me/` - Get current user
- `PATCH /api/v1/auth/me/` - Update user profile

### Candidates
- `GET /api/v1/candidates/` - List public sanitized profiles
- `GET /api/v1/candidates/:slug/` - Get profile (sanitized or full based on auth)
- `GET /api/v1/candidates/me/` - Get own profile
- `PATCH /api/v1/candidates/me/` - Update own profile
- `GET /api/v1/candidates/me/experiences/` - List experiences
- `POST /api/v1/candidates/me/experiences/` - Add experience
- `PATCH /api/v1/candidates/me/experiences/:id/` - Update experience
- `DELETE /api/v1/candidates/me/experiences/:id/` - Delete experience
- Same pattern for education

### Companies
- `GET /api/v1/companies/` - List public companies
- `GET /api/v1/companies/:slug/` - Get company detail
- `GET /api/v1/companies/my/` - Get user's company
- `PATCH /api/v1/companies/my/` - Update company
- `GET /api/v1/companies/my/users/` - List company users
- `POST /api/v1/companies/my/users/` - Invite user
- `PATCH /api/v1/companies/my/users/:id/` - Update user role
- `DELETE /api/v1/companies/my/users/:id/` - Remove user

### Jobs
- `GET /api/v1/jobs/` - List published jobs (public, with filters)
- `GET /api/v1/jobs/:id/` - Get job detail
- `POST /api/v1/jobs/` - Create job
- `PATCH /api/v1/jobs/:id/` - Update job
- `DELETE /api/v1/jobs/:id/` - Delete job
- `POST /api/v1/jobs/:id/publish/` - Publish job
- `POST /api/v1/jobs/:id/close/` - Close job
- `GET /api/v1/companies/my/jobs/` - List company's jobs
- `GET /api/v1/jobs/:id/questions/` - List job questions
- `GET /api/v1/jobs/:id/applications/` - List job applications

### Applications
- `POST /api/v1/applications/` - Apply to job
- `GET /api/v1/applications/` - List own applications
- `GET /api/v1/applications/:id/` - Get application detail
- `PATCH /api/v1/applications/:id/` - Update application status
- `DELETE /api/v1/applications/:id/` - Withdraw application
- `GET /api/v1/applications/:id/answers/` - Get answers

### Bookings
- `GET /api/v1/meeting-types/` - List meeting types
- `GET /api/v1/meeting-types/:slug/availability/` - Get available slots
- `POST /api/v1/bookings/` - Create booking
- `GET /api/v1/bookings/` - List own bookings
- `GET /api/v1/bookings/:id/` - Get booking detail
- `PATCH /api/v1/bookings/:id/cancel/` - Cancel booking
- `POST /api/v1/bookings/propose-interview-times/` - Propose times
- `POST /api/v1/bookings/:id/select-time/` - Select time

### Admin
- `GET /api/v1/admin/email-templates/` - List templates
- `GET /api/v1/admin/email-templates/:id/` - Get template
- `PATCH /api/v1/admin/email-templates/:id/` - Update template
- `GET /api/v1/admin/nethunt/logs/` - List logs
- `POST /api/v1/admin/nethunt/logs/:id/retry/` - Retry sync

## Coding Standards

### Django
- Use class-based views (APIView, GenericAPIView) for complex logic
- Use `@api_view` decorator for simple endpoints
- Serializers: inherit from `serializers.ModelSerializer`
- Use `select_related()` and `prefetch_related()` for query optimization
- Custom permissions extend `permissions.BasePermission`
- Name URL patterns consistently: `<model>-list`, `<model>-detail`

### React/TypeScript
- **Functional components only** (no class components)
- Use TypeScript strict mode
- Props: define interfaces, export them
- Hooks: `use<Name>` naming convention
- Components: PascalCase, one component per file
- Utility functions: camelCase
- Constants: UPPER_SNAKE_CASE
- File structure: `<ComponentName>/<ComponentName>.tsx` for complex components

### API Client (Frontend)
- All API calls through `src/services/api.ts` (Axios instance)
- Use TanStack Query hooks for data fetching
- Naming: `use<Entity><Action>` (e.g., `useJobs`, `useCreateJob`)
- Error handling in interceptors
- Loading states handled by TanStack Query

### Styling
- Tailwind utility classes preferred
- Custom classes only when needed
- Use Oneo brand colors via Tailwind config
- Responsive: mobile-first approach
- Dark mode: not required for V1

## Development Workflow

### Starting a New Feature
1. Create models (backend)
2. Create serializers
3. Create views and URL routing
4. Test API endpoints (use DRF browsable API or Postman)
5. Create TypeScript types matching Django models
6. Create API hooks (TanStack Query)
7. Build UI components
8. Test end-to-end flow

### Database Changes
1. Modify models in `models.py`
2. Run: `python manage.py makemigrations`
3. Review migration file
4. Run: `python manage.py migrate`
5. Update serializers if needed

### Running the App
- Backend: `cd backend && source venv/bin/activate && python manage.py runserver`
- Frontend: `cd frontend && npm run dev`
- Database: Ensure PostgreSQL is running

## Common Patterns

### Sanitizing Data
When serializing candidate profiles, check `request.user.is_authenticated` and `profile.visibility`:
- If not authenticated OR visibility == 'private': return sanitized serializer
- If authenticated: return full serializer

### Permission Checking
```python
from rest_framework.permissions import BasePermission

class IsCompanyAdmin(BasePermission):
    def has_permission(self, request, view):
        # Check if user is admin of their company
        pass
```

### React Component Pattern
```tsx
// src/components/JobCard/JobCard.tsx
import { Job } from '@/types'

interface JobCardProps {
  job: Job
  onApply?: (jobId: string) => void
}

export const JobCard: React.FC<JobCardProps> = ({ job, onApply }) => {
  return (
    // Component JSX
  )
}
```

### API Hook Pattern
```tsx
// src/hooks/useJobs.ts
import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { Job } from '@/types'

export const useJobs = (filters?: JobFilters) => {
  return useQuery({
    queryKey: ['jobs', filters],
    queryFn: async () => {
      const { data } = await api.get<Job[]>('/jobs/', { params: filters })
      return data
    },
  })
}
```

## Important Notes

- **Never commit .env files** (they're in .gitignore)
- **Always use environment variables** for secrets and config
- **Test authentication flows** after any auth changes
- **Check permissions** for all endpoints
- **Validate all user input** (frontend AND backend)
- **Use transactions** for multi-step database operations
- **Log errors** but never log sensitive data
- **Keep the phased plan** (Docs/V1 Plan) as the single source of truth

## Reference Files

- **Phased Plan**: `/Docs/V1 Plan` - Complete development roadmap
- **Backend Settings**: `/backend/config/settings.py` - Django configuration
- **API Client**: `/frontend/src/services/api.js` - Axios setup
- **Environment Variables**: `/backend/.env.example`, `/frontend/.env.example`

## Getting Help

- Django docs: https://docs.djangoproject.com/
- DRF docs: https://www.django-rest-framework.org/
- React docs: https://react.dev/
- TanStack Query: https://tanstack.com/query/
- Tailwind CSS: https://tailwindcss.com/
- Headless UI: https://headlessui.com/

---

**Remember**: This project follows an API-first design. Always build and test the backend API endpoints before implementing the frontend UI.
