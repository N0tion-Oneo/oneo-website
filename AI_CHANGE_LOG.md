# AI Change Log

This file tracks all changes made by the AI assistant to the project.

## 2024-12-19 - Git and GitHub Setup

**Time**: Initial setup
**Description**: Initialized git repository, set up comprehensive .gitignore file, and connected to GitHub repository
**Reason**: User requested git and GitHub setup for the project
**Affected Files**:
- `.gitignore` - Enhanced with comprehensive patterns for Python, Node.js, Django, and general development files
- `AI_CHANGE_LOG.md` - Created to track AI changes (this file)
**Changes**:
- Initialized git repository with `git init`
- Enhanced root `.gitignore` to include Python, Node.js, Django, build outputs, and temporary files
- Created initial commit with all project files (135 files, 18,017+ lines)
- Added GitHub remote: `https://github.com/N0tion-Oneo/oneo-website.git`
- Pushed main branch to GitHub repository `oneo-website`
- Set up branch tracking for `main` branch

## 2024-12-19 - Backend Server Startup

**Time**: Current session
**Description**: Executed start-backend.sh script to start Django development server
**Reason**: User requested to run the backend startup script
**Affected Files**:
- `scripts/start-backend.sh` - Executed (no changes to file)
**Changes**:
- Ran backend startup script in background mode
- Script activates virtual environment, checks database connection, runs migrations if needed, and starts Django development server on http://localhost:8000

## 2024-12-19 - Frontend and Backend Servers Startup

**Time**: Current session
**Description**: Executed both start-frontend.sh and start-backend.sh scripts to start development servers
**Reason**: User requested to run both frontend and backend startup scripts
**Affected Files**:
- `scripts/start-frontend.sh` - Executed (no changes to file)
- `scripts/start-backend.sh` - Executed (no changes to file)
**Changes**:
- Made both scripts executable with chmod +x
- Ran backend startup script in background mode (Django server on http://localhost:8000)
- Ran frontend startup script in background mode (Vite dev server on http://localhost:5173)
- Both servers are now running in the background

## 2024-12-19 - Git Push to GitHub

**Time**: Current session
**Description**: Committed and pushed latest updates to GitHub repository
**Reason**: User requested to push latest updates to GitHub
**Affected Files**:
- All modified and untracked files (64 files total)
**Changes**:
- Staged all changes (modified and untracked files) with `git add -A`
- Committed changes with message: "Add interview stage system, calendar booking, and assessment features"
- Pushed commit (0c8369c) to origin/main branch
- Commit includes: interview stage system, calendar booking, assessment features, notification system, Celery configuration, and various frontend/backend updates

## 2024-12-19 - Restart Development Servers

**Time**: Current session
**Description**: Restarted both frontend and backend development servers
**Reason**: User requested to run both startup scripts again
**Affected Files**:
- `scripts/start-frontend.sh` - Executed (no changes to file)
- `scripts/start-backend.sh` - Executed (no changes to file)
**Changes**:
- Ran backend startup script in background mode (Django server on http://localhost:8000)
- Ran frontend startup script in background mode (Vite dev server on http://localhost:5173)
- Both servers are now running in the background

## 2024-12-19 - Git Push: Calendar Service Refactor

**Time**: Current session
**Description**: Committed and pushed calendar service refactor and scheduling module addition
**Reason**: User requested to push latest updates to GitHub
**Affected Files**:
- 23 files changed (562 insertions, 414 deletions)
**Changes**:
- Staged all changes (modified and untracked files) with `git add -A`
- Committed changes with message: "Refactor calendar service and add scheduling module"
- Pushed commit (d3bd4fd) to origin/main branch
- Created new scheduling module with calendar service moved from jobs/services
- Updated job models, serializers, views, and frontend components
- Updated API URLs and settings configuration

## 2024-12-19 - Git Push: Assigned To Fields and Onboarding Stages

**Time**: Current session
**Description**: Committed and pushed assigned_to fields and onboarding stages feature for candidates and companies
**Reason**: User requested to push latest code to GitHub
**Affected Files**:
- 53 files changed (5,162 insertions, 286 deletions)
**Changes**:
- Staged all changes (modified and untracked files) with `git add .`
- Committed changes with message: "Add assigned_to fields and onboarding stages for candidates and companies"
- Pushed commit (27126ec) to origin/main branch
- Added assigned_to ManyToMany fields to CandidateProfile and Company models
- Added onboarding_stage fields to both models
- Created migrations for assigned_to and onboarding_stage changes
- Added new frontend components: AssignedToSelect, CandidateKanbanBoard, JobBulkActions, JobFilterPanel
- Added new admin pages: AdminJobsPage, OnboardingStagesSettingsPage
- Created new core Django app with onboarding stage models
- Updated API endpoints, serializers, and views to support new fields
- Added useStaffUsers hook for staff user management

## 2024-12-19 - Start Development Servers

**Time**: Current session
**Description**: Started both backend and frontend development servers
**Reason**: User requested to start both development servers
**Affected Files**:
- `scripts/start-backend.sh` - Executed (no changes to file)
- `scripts/start-frontend.sh` - Executed (no changes to file)
**Changes**:
- Started Django backend server in background mode (http://localhost:8000)
- Started React frontend server in background mode (http://localhost:5173)
- Both servers are running in the background

## 2024-12-19 - Fix Backend Server Port Conflict

**Time**: Current session
**Description**: Fixed backend server startup issue caused by port 8000 being in use
**Reason**: Backend script failed to start due to port conflict
**Affected Files**:
- No file changes
**Changes**:
- Identified that port 8000 was occupied by previous processes (PIDs: 72558, 98525)
- Killed the processes blocking port 8000 using `kill -9`
- Restarted backend server successfully (new PID: 74506)
- Backend server is now running at http://localhost:8000

## 2024-12-19 - Kill All Development Server Processes

**Time**: Current session
**Description**: Terminated all development server processes and freed ports
**Reason**: User requested to kill all ports
**Affected Files**:
- No file changes
**Changes**:
- Killed processes on port 8000 (PIDs: 74592, 97124)
- Killed Node/Vite frontend processes (PIDs: 57362, 57348, 74104, 74090)
- Verified ports 8000 and 5173 are now free
- Confirmed no development server processes are running

## 2024-12-19 - Start Development Servers (After Cleanup)

**Time**: Current session
**Description**: Started both backend and frontend development servers after port cleanup
**Reason**: User requested to run both startup scripts
**Affected Files**:
- `scripts/start-backend.sh` - Executed (no changes to file)
- `scripts/start-frontend.sh` - Executed (no changes to file)
**Changes**:
- Started Django backend server in background mode (PID: 77271, http://localhost:8000)
- Started React frontend server in background mode (PID: 77299, http://localhost:5173)
- Both servers verified as running successfully

## 2024-12-19 - Start Backend Server

**Time**: Current session
**Description**: Started Django backend development server
**Reason**: User requested to start backend server
**Affected Files**:
- `scripts/start-backend.sh` - Executed (no changes to file)
**Changes**:
- Started Django backend server in background mode
- Backend server is running on port 8000 (PIDs: 77061, 87782)
- Server available at http://localhost:8000

## 2024-12-19 - Git Push: Analytics, Dashboard Settings, and Recruiter Features

**Time**: Current session
**Description**: Committed and pushed analytics, dashboard settings, and recruiter features to GitHub
**Reason**: User requested to push latest updates to GitHub
**Affected Files**:
- 81 files changed (8,877 insertions, 649 deletions)
**Changes**:
- Staged all changes (modified and untracked files) with `git add .`
- Committed changes with message: "Add analytics, dashboard settings, and recruiter features"
- Pushed commit (b56c511) to origin/main branch
- Added analytics page with hooks and components (DateRangePicker, FunnelChart, OnboardingBottlenecksCard, etc.)
- Added dashboard settings page and core views
- Added recruiter dashboard functionality
- Added assigned recruiters to applications
- Added positions_to_fill field to jobs
- Enhanced meeting types with onboarding stage, allowed users, authenticated target stage, and show_on_dashboard
- Added pending user signup functionality
- Added SchedulingCard component for booking
- Added JobDrawer component
- Replaced AssignedToSelect with AssignedSelect component
- Added ToastContext for notifications
- Added useOptimisticUpdate and useRecruiterDashboard hooks
- Updated various models, serializers, and views
- Added new migrations for all model changes

## 2024-12-19 - Start Backend Server

**Time**: Current session
**Description**: Started Django backend development server
**Reason**: User requested to start backend server
**Affected Files**:
- `scripts/start-backend.sh` - Executed (no changes to file)
**Changes**:
- Started Django backend server in background mode
- Backend server is running on port 8000 (PIDs: 19442, 37855)
- Server available at http://localhost:8000

