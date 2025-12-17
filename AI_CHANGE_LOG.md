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

## 2024-12-19 - Git Push: Shortlist Questions and Screening Functionality

**Time**: Current session
**Description**: Committed and pushed shortlist questions and screening functionality to GitHub
**Reason**: User requested to push latest changes to GitHub
**Affected Files**:
- 23 files changed (2,575 insertions, 7 deletions)
**Changes**:
- Staged all changes (modified and untracked files) with `git add .`
- Committed changes with message: "Add shortlist questions and screening functionality"
- Pushed commit (72456f7) to origin/main branch
- Added ShortlistQuestion model with migration
- Added shortlist questions serializers and views
- Added ShortlistScreeningSection component for applications
- Added ShortlistQuestionBuilder component for job creation
- Added StarRatingInput component for rating questions
- Added useShortlistAnswers and useShortlistTemplates hooks
- Updated application drawer and pipeline timeline components
- Updated job form and related components
- Cleaned up AI_CHANGE_LOG.md entries

## 2025-12-11 - CMS Settings & Navigation Enhancement

**Time**: Current session
**Description**: Added CMS site settings for analytics, robots.txt, sitemap, and llms.txt with dashboard management UI

**Backend Changes**:
- `backend/cms/models/site_settings.py` - New SiteSettings singleton model for:
  - Google Analytics (GA4 Measurement ID, GTM Container ID, enable toggle)
  - robots.txt content (editable)
  - llms.txt content (editable for AI/LLM agents)
  - Sitemap settings (enable/disable, content type toggles)
  - Site meta info (name, URL, description)
- `backend/cms/serializers/site_settings.py` - Serializers for settings endpoints
- `backend/cms/views/site_settings.py` - Admin and public views for settings
- `backend/cms/views/sitemap.py` - Updated to use SiteSettings for configuration
- `backend/cms/urls.py` - Added settings endpoints:
  - Admin: `/admin/settings/`, `/admin/settings/analytics/`, `/admin/settings/robots-txt/`, `/admin/settings/llms-txt/`, `/admin/settings/sitemap/`
  - Public: `/robots.txt`, `/llms.txt`, `/analytics/`
- Migration `0002_add_site_settings.py`

**Frontend Changes**:
- `frontend/src/layouts/CMSLayout.tsx` - New CMS layout with sub-navigation (similar to SettingsLayout)
- `frontend/src/layouts/CandidateDashboardLayout.tsx` - Added CMS nav item for admin users
- `frontend/src/pages/dashboard/cms/CMSAnalyticsSettingsPage.tsx` - GA4/GTM configuration
- `frontend/src/pages/dashboard/cms/CMSSitemapSettingsPage.tsx` - Sitemap configuration
- `frontend/src/pages/dashboard/cms/CMSRobotsTxtPage.tsx` - robots.txt editor
- `frontend/src/pages/dashboard/cms/CMSLLMsTxtPage.tsx` - llms.txt editor
- `frontend/src/components/analytics/GoogleAnalytics.tsx` - Now fetches settings from CMS
- `frontend/src/services/cms.ts` - Added cmsSiteSettings service
- `frontend/src/types/cms.ts` - Added site settings types
- `frontend/src/App.tsx` - Updated routes to use CMSLayout

**Key Features**:
- CMS now accessible via main dashboard navigation (admin only)
- CMS has its own sub-navigation sidebar with sections:
  - Content: Overview, Pages, Blog, FAQs, Glossary, Case Studies
  - Submissions: Contact, Newsletter
  - SEO & Technical: Analytics, Sitemap, Robots.txt, LLMs.txt
- Google Analytics configurable via CMS (no env variables needed)
- robots.txt and llms.txt served dynamically from CMS database
- Sitemap generation respects CMS settings for content type inclusion
- Removed static robots.txt and llms.txt from public folder

---

## 2025-12-11 - Phase 12 & 13: CMS, Content Management & SEO

**Time**: Current session
**Description**: Implemented comprehensive CMS system and SEO infrastructure (Phases 12 & 13 from V1 Plan)
**Reason**: User requested implementation of Phase 12 (Content & Legal Pages) and Phase 13 (SEO & Analytics)

### Phase 12: Content Management System

**Backend CMS (Django)**:
- `backend/cms/models/` - Created modular model structure:
  - `base.py` - Abstract base classes (TimestampedModel, SluggedModel, SEOFields, PublishableModel, BlockContentModel)
  - `pages.py` - Page model for static content (legal, about, service pages)
  - `blog.py` - BlogPost model with categories, tags, featured images
  - `faqs.py` - FAQ and FAQCategory models
  - `glossary.py` - GlossaryTerm model with related terms
  - `case_studies.py` - CaseStudy model with highlights and testimonials
  - `submissions.py` - ContactSubmission and NewsletterSubscriber models
- `backend/cms/serializers/` - Full serializer suite for all content types
- `backend/cms/views/` - Admin and public API endpoints for all content
- `backend/cms/urls.py` - URL routing for CMS endpoints
- `backend/cms/admin.py` - Django admin registration
- `backend/cms/views/sitemap.py` - Dynamic XML sitemap generation

**Frontend CMS Dashboard**:
- `frontend/src/components/cms/BlockEditor.tsx` - Editor.js wrapper component
- `frontend/src/components/cms/BlockRenderer.tsx` - Renders Editor.js content as HTML
- `frontend/src/pages/dashboard/cms/CMSOverviewPage.tsx` - CMS dashboard overview
- `frontend/src/pages/dashboard/cms/CMSPagesListPage.tsx` - Pages list with filtering
- `frontend/src/pages/dashboard/cms/CMSPageEditorPage.tsx` - Block editor for pages
- `frontend/src/pages/dashboard/cms/CMSBlogListPage.tsx` - Blog posts grid view
- `frontend/src/pages/dashboard/cms/CMSBlogEditorPage.tsx` - Blog post editor
- `frontend/src/pages/dashboard/cms/CMSFAQsPage.tsx` - FAQ management with categories

**Frontend Public Pages**:
- `frontend/src/pages/public/CMSPageView.tsx` - Public CMS page renderer
- `frontend/src/pages/public/BlogListPage.tsx` - Public blog listing
- `frontend/src/pages/public/BlogPostPage.tsx` - Blog post detail page
- `frontend/src/pages/public/ContactPage.tsx` - Contact form with validation

**Frontend Services & Types**:
- `frontend/src/services/cms.ts` - CMS API service layer
- `frontend/src/types/cms.ts` - TypeScript types for all CMS content

### Phase 13: SEO & Analytics

**SEO Components**:
- `frontend/src/components/seo/SEO.tsx` - SEO component with:
  - Meta tag management (title, description, robots)
  - Open Graph tags for social sharing
  - Twitter Card tags
  - Structured data injection (JSON-LD)
  - Schema generators: createOrganizationSchema, createJobPostingSchema, createArticleSchema, createFAQSchema, createBreadcrumbSchema

**Google Analytics 4**:
- `frontend/src/components/analytics/GoogleAnalytics.tsx` - GA4 implementation with:
  - Page view tracking on route changes
  - Custom event tracking
  - Pre-defined event helpers (jobView, jobApply, blogPostView, contactFormSubmit, etc.)

**Static Files**:
- `frontend/public/robots.txt` - Search engine crawler rules

**SEO Integration**:
- Added SEO to JobDetailPage with JobPosting structured data
- Added SEO to BlogPostPage with Article structured data
- Added SEO to BlogListPage and ContactPage

**Routing Updates**:
- `frontend/src/App.tsx` - Added routes:
  - `/dashboard/cms/*` - CMS dashboard routes
  - `/pages/:slug` - Public CMS pages
  - `/blog` and `/blog/:slug` - Public blog
  - `/contact` - Contact page

**Dependencies Added**:
- @editorjs/editorjs and plugins (header, list, paragraph, quote, code, delimiter, table, checklist)

**Key Features**:
- Block-based content editing (Notion-like experience)
- Full CRUD for Pages, Blog Posts, FAQs, Glossary, Case Studies
- Contact form submissions storage
- Newsletter subscriber management
- SEO-optimized public pages
- Structured data for rich search results
- GA4 analytics with custom event tracking

---

## 2025-12-11 - Git Push: HomePage Updates

**Time**: Current session
**Description**: Committed and pushed HomePage component updates to GitHub
**Reason**: User requested to push latest updates to GitHub
**Affected Files**:
- `frontend/src/pages/home/HomePage.tsx` - 1 file changed (23 insertions, 21 deletions)
**Changes**:
- Staged all changes with `git add -A`
- Committed changes with message: "Update HomePage component"
- Pushed commit (20764ee) to origin/main branch
- Updated HomePage component with latest changes

---

## 2025-12-11 - Frontend Server Restart

**Time**: Current session
**Description**: Killed all existing Vite processes and restarted frontend development server
**Reason**: User requested to ensure all Vite servers are killed before starting frontend
**Affected Files**:
- `scripts/start-frontend.sh` - Executed (no changes to file)
**Changes**:
- Killed 2 processes running on port 5173 (PIDs: 23874, 77061)
- Killed 2 additional Vite processes (PIDs: 44883, 68023)
- Verified all Vite processes were terminated
- Started frontend development server successfully on port 5173
- Frontend server is now running at http://localhost:5173

---

## 2025-12-11 - Backend Server Start

**Time**: Current session
**Description**: Started Django backend development server
**Reason**: User requested to start the backend server
**Affected Files**:
- `scripts/start-backend.sh` - Executed (no changes to file)
**Changes**:
- Verified no backend server was running on port 8000
- Started Django development server using startup script
- Backend server is now running on port 8000
- Server available at http://localhost:8000
- Admin panel available at http://localhost:8000/admin/
- API docs available at http://localhost:8000/api/docs/

