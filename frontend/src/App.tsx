import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute, PublicRoute } from '@/components/auth';
import { LoginPage, SignupPage, DashboardPage, ProfilePage, HomePage, CandidatesDirectoryPage, CandidateProfilePage } from '@/pages';
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
        </Route>

        {/* Public candidates directory */}
        <Route path="/candidates" element={<CandidatesDirectoryPage />} />
        <Route path="/candidates/:slug" element={<CandidateProfilePage />} />

        {/* 404 - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
