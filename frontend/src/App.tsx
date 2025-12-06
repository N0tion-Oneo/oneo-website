import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute, PublicRoute } from '@/components/auth';
import { BrandingProvider } from '@/components/branding';
import {
  LoginPage,
  SignupPage,
  ClientSignupPage,
  CompanySignupPage,
  RecruiterSignupPage,
  DashboardPage,
  ProfilePage,
  InvitationsPage,
  JobsPage,
  NewJobPage,
  EditJobPage,
  ApplicationsPage,
  JobApplicationsPage,
  AdminCompaniesPage,
  AdminCompanyEditPage,
  AdminCandidatesPage,
  AdminCandidateEditPage,
  AdminNewJobPage,
  AdminRecruitersPage,
  AdminSkillsTechnologiesPage,
  NotificationsAdminPage,
  SendNotificationPage,
  NotificationTemplatesPage,
  NotificationTemplateEditPage,
  BrandingSettingsPage,
  HomePage,
  CandidatesDirectoryPage,
  CandidateProfilePage,
  CompaniesDirectoryPage,
  CompanyProfilePage,
  CompanyEditorPage,
  JobsListingPage,
  JobDetailPage,
  CalendarOAuthCallback,
  ProfileSettingsPage,
  CalendarSettingsPage,
} from '@/pages';
import { BookingPage } from '@/pages/booking';
import { CandidateDashboardLayout, SettingsLayout } from '@/layouts';
import './App.css';

function App() {
  return (
    <BrandingProvider>
      <AuthProvider>
        <Routes>
        {/* Home page - accessible to all */}
        <Route path="/" element={<HomePage />} />

        {/* Public routes - redirect to dashboard if already logged in */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicRoute>
              <SignupPage />
            </PublicRoute>
          }
        />

        {/* Client signup via invitation link - no auth required */}
        <Route path="/signup/client/:token" element={<ClientSignupPage />} />

        {/* Company team member signup via invitation link - no auth required */}
        <Route path="/signup/company/:token" element={<CompanySignupPage />} />

        {/* Recruiter signup via invitation link - no auth required */}
        <Route path="/signup/recruiter/:token" element={<RecruiterSignupPage />} />

        {/* Protected dashboard routes with sidebar layout */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <CandidateDashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="company" element={<CompanyEditorPage />} />
          <Route path="jobs" element={<JobsPage />} />
          <Route path="jobs/new" element={<NewJobPage />} />
          <Route path="jobs/:jobId" element={<EditJobPage />} />
          <Route path="jobs/:jobId/applications" element={<JobApplicationsPage />} />
          <Route path="applications" element={<ApplicationsPage />} />
          {/* Settings routes with sidebar */}
          <Route path="settings" element={<SettingsLayout />}>
            <Route index element={<Navigate to="profile" replace />} />
            <Route path="profile" element={<ProfileSettingsPage />} />
            <Route path="calendar" element={<CalendarSettingsPage />} />
            <Route path="invitations" element={<InvitationsPage />} />
            <Route path="notifications" element={<NotificationsAdminPage />} />
            <Route path="notifications/send" element={<SendNotificationPage />} />
            <Route path="notifications/templates" element={<NotificationTemplatesPage />} />
            <Route path="notifications/templates/new" element={<NotificationTemplateEditPage />} />
            <Route path="notifications/templates/:templateId" element={<NotificationTemplateEditPage />} />
            <Route path="skills-technologies" element={<AdminSkillsTechnologiesPage />} />
            <Route path="branding" element={<BrandingSettingsPage />} />
            <Route path="recruiters" element={<AdminRecruitersPage />} />
          </Route>
          {/* Admin/Recruiter routes */}
          <Route path="admin/companies" element={<AdminCompaniesPage />} />
          <Route path="admin/companies/:companyId" element={<AdminCompanyEditPage />} />
          <Route path="admin/candidates" element={<AdminCandidatesPage />} />
          <Route path="admin/candidates/:slug" element={<AdminCandidateEditPage />} />
          <Route path="admin/jobs" element={<JobsPage mode="admin" />} />
          <Route path="admin/jobs/new" element={<AdminNewJobPage />} />
        </Route>

        {/* Public candidates directory */}
        <Route path="/candidates" element={<CandidatesDirectoryPage />} />
        <Route path="/candidates/:slug" element={<CandidateProfilePage />} />

        {/* Public companies directory */}
        <Route path="/companies" element={<CompaniesDirectoryPage />} />
        <Route path="/companies/:slug" element={<CompanyProfilePage />} />

        {/* Public jobs board */}
        <Route path="/jobs" element={<JobsListingPage />} />
        <Route path="/jobs/:slug" element={<JobDetailPage />} />

        {/* Public booking page (Calendly-like self-scheduling) */}
        <Route path="/book/:token" element={<BookingPage />} />

        {/* OAuth callback routes (for calendar integration) */}
        <Route
          path="/settings/calendar/:provider/callback"
          element={
            <ProtectedRoute>
              <CalendarOAuthCallback />
            </ProtectedRoute>
          }
        />

        {/* 404 - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrandingProvider>
  );
}

export default App;
