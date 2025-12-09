import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMyProfile, useMyCompany } from '@/hooks';
import SchedulingCard from '@/components/booking/SchedulingCard';
import RecruiterDashboard from '@/components/dashboard/RecruiterDashboard';
import { UserRole } from '@/types';

export default function DashboardPage() {
  const { user } = useAuth();

  // Check if user is admin or recruiter - show RecruiterDashboard
  const isAdminOrRecruiter = user?.role === UserRole.ADMIN || user?.role === UserRole.RECRUITER;

  // Fetch profile/company data for scheduling card (only for candidates/clients)
  const { profile } = useMyProfile();
  const { company } = useMyCompany();

  // Get assigned users based on role
  const isCandidate = user?.role === UserRole.CANDIDATE;
  const isClient = user?.role === UserRole.CLIENT;
  const assignedUsers = isCandidate
    ? profile?.assigned_to || []
    : isClient
    ? company?.assigned_to || []
    : [];
  const schedulingCategory = isCandidate ? 'recruitment' : 'sales';

  const getRoleLabel = (role: UserRole) => {
    const labels: Record<UserRole, string> = {
      [UserRole.CANDIDATE]: 'Candidate',
      [UserRole.CLIENT]: 'Client',
      [UserRole.RECRUITER]: 'Recruiter',
      [UserRole.ADMIN]: 'Admin',
    };
    return labels[role] || role;
  };

  // Check if we should show the scheduling card
  const showSchedulingCard = (isCandidate || isClient) && assignedUsers.length > 0;

  // Render RecruiterDashboard for admins and recruiters
  if (isAdminOrRecruiter) {
    return <RecruiterDashboard />;
  }

  return (
    <div className="flex gap-6">
      {/* Main Content */}
      <div className="flex-1 max-w-3xl">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-[22px] font-semibold text-gray-900">
            Welcome back, {user?.first_name}
          </h1>
          <p className="text-[14px] text-gray-500 mt-1">
            {user?.role === UserRole.CANDIDATE
              ? 'Find your next opportunity'
              : 'Manage your recruitment pipeline'}
          </p>
        </div>

        {/* Verification Notice */}
        {!user?.is_verified && (
          <div className="mb-6 px-4 py-3 bg-amber-50 border border-amber-200 rounded-md flex items-center justify-between">
            <p className="text-[13px] text-amber-800">
              Please verify your email to access all features
            </p>
            <button className="text-[13px] font-medium text-amber-800 hover:underline">
              Resend email
            </button>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Link
            to="/dashboard/profile"
            className="group p-5 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
          >
            <div className="w-8 h-8 bg-gray-100 rounded-md flex items-center justify-center mb-3 group-hover:bg-gray-200 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <h3 className="text-[14px] font-medium text-gray-900 mb-0.5">Complete Profile</h3>
            <p className="text-[13px] text-gray-500">Add your experience and skills</p>
          </Link>

          <Link
            to="/jobs"
            className="group p-5 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
          >
            <div className="w-8 h-8 bg-gray-100 rounded-md flex items-center justify-center mb-3 group-hover:bg-gray-200 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="text-[14px] font-medium text-gray-900 mb-0.5">Browse Jobs</h3>
            <p className="text-[13px] text-gray-500">Explore open opportunities</p>
          </Link>

          <Link
            to="/dashboard/applications"
            className="group p-5 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
          >
            <div className="w-8 h-8 bg-gray-100 rounded-md flex items-center justify-center mb-3 group-hover:bg-gray-200 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="9" y="3" width="6" height="4" rx="1" />
                <path d="M9 12h6M9 16h6" strokeLinecap="round" />
              </svg>
            </div>
            <h3 className="text-[14px] font-medium text-gray-900 mb-0.5">Applications</h3>
            <p className="text-[13px] text-gray-500">Track your applications</p>
          </Link>
        </div>

        {/* Account Info */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[15px] font-medium text-gray-900">Account</h2>
            <Link
              to="/dashboard/profile"
              className="text-[13px] text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1.5"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Edit
            </Link>
          </div>
          <div className="grid md:grid-cols-2 gap-y-5 gap-x-10">
            <div>
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1">Name</p>
              <p className="text-[14px] text-gray-900">{user?.first_name} {user?.last_name}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1">Email</p>
              <p className="text-[14px] text-gray-900">{user?.email}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1">Role</p>
              <p className="text-[14px] text-gray-900">{user?.role && getRoleLabel(user.role)}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1">Status</p>
              <p className={`text-[14px] ${user?.is_verified ? 'text-green-600' : 'text-amber-600'}`}>
                {user?.is_verified ? 'Verified' : 'Pending verification'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Scheduling Card */}
      {showSchedulingCard && (
        <div className="w-72 flex-shrink-0">
          <div className="sticky top-6">
            <SchedulingCard
              assignedUsers={assignedUsers}
              category={schedulingCategory}
            />
          </div>
        </div>
      )}
    </div>
  );
}
