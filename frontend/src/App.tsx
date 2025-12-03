import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute, PublicRoute } from '@/components/auth';
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
  AdminCompaniesPage,
  AdminCompanyEditPage,
  AdminCandidatesPage,
  AdminCandidateEditPage,
  AdminJobsPage,
  AdminNewJobPage,
  AdminRecruitersPage,
  HomePage,
  CandidatesDirectoryPage,
  CandidateProfilePage,
  CompaniesDirectoryPage,
  CompanyProfilePage,
  CompanyEditorPage,
  JobsListingPage,
  JobDetailPage,
} from '@/pages';
import { CandidateDashboardLayout } from '@/layouts';
import './App.css';

function App() {
  return (
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
          <Route path="invitations" element={<InvitationsPage />} />
          {/* Admin/Recruiter routes */}
          <Route path="admin/companies" element={<AdminCompaniesPage />} />
          <Route path="admin/companies/:companyId" element={<AdminCompanyEditPage />} />
          <Route path="admin/candidates" element={<AdminCandidatesPage />} />
          <Route path="admin/candidates/:slug" element={<AdminCandidateEditPage />} />
          <Route path="admin/jobs" element={<AdminJobsPage />} />
          <Route path="admin/jobs/new" element={<AdminNewJobPage />} />
          <Route path="admin/recruiters" element={<AdminRecruitersPage />} />
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

        {/* 404 - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
