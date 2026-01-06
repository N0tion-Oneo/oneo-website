import { useState } from 'react'
import { Mail, Phone, User, Clock, Users, UserPlus, Shield } from 'lucide-react'
import { useCompanyUsers } from '@/hooks'
import type { AssignedUser } from '@/types'

interface TeamPanelProps {
  companyId: string
  entity?: Record<string, unknown>
  onInviteUser?: () => void
}

function getRoleBadge(role: string) {
  switch (role) {
    case 'admin':
      return { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', label: 'Admin' }
    case 'hiring_manager':
      return { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', label: 'Hiring Manager' }
    case 'viewer':
      return { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-400', label: 'Viewer' }
    default:
      return { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-400', label: role }
  }
}

export function TeamPanel({ companyId, entity, onInviteUser }: TeamPanelProps) {
  const { users, isLoading } = useCompanyUsers(companyId)
  const [activeTab, setActiveTab] = useState<'users' | 'recruiters'>('users')

  // Get assigned recruiters from entity
  const assignedRecruiters = (entity as { assigned_to?: AssignedUser[] })?.assigned_to || []

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100" />
      </div>
    )
  }

  const hasUsers = users && users.length > 0
  const hasRecruiters = assignedRecruiters.length > 0

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900 dark:text-gray-100">Team</h3>
          {onInviteUser && (
            <button
              onClick={onInviteUser}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Invite
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-3">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'users'
                ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Portal Users
            {hasUsers && (
              <span className={`ml-1 px-1.5 py-0.5 text-[10px] rounded-full ${
                activeTab === 'users'
                  ? 'bg-white/20 dark:bg-gray-900/20'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}>
                {users?.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('recruiters')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'recruiters'
                ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Recruiters
            {hasRecruiters && (
              <span className={`ml-1 px-1.5 py-0.5 text-[10px] rounded-full ${
                activeTab === 'recruiters'
                  ? 'bg-white/20 dark:bg-gray-900/20'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}>
                {assignedRecruiters.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'users' && (
          <>
            {!hasUsers ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">No portal users</p>
                <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                  Invite team members to access the company portal
                </p>
                {onInviteUser && (
                  <button
                    onClick={onInviteUser}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Invite User
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {users?.map((user) => {
                  const roleBadge = getRoleBadge(user.role)
                  return (
                    <div
                      key={user.id}
                      className="p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {user.user_avatar ? (
                            <img src={user.user_avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                              {user.user_first_name && user.user_last_name
                                ? `${user.user_first_name} ${user.user_last_name}`
                                : user.user_email}
                            </h4>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${roleBadge.bg} ${roleBadge.text}`}>
                              {roleBadge.label}
                            </span>
                          </div>

                          {user.job_title && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{user.job_title}</p>
                          )}

                          <div className="mt-2 space-y-1">
                            {user.user_email && (
                              <a
                                href={`mailto:${user.user_email}`}
                                className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600"
                              >
                                <Mail className="w-3 h-3" />
                                {user.user_email}
                              </a>
                            )}
                            {user.user_phone && (
                              <a
                                href={`tel:${user.user_phone}`}
                                className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600"
                              >
                                <Phone className="w-3 h-3" />
                                {user.user_phone}
                              </a>
                            )}
                          </div>

                          {user.joined_at && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-gray-400 dark:text-gray-500">
                              <Clock className="w-3 h-3" />
                              Joined {new Date(user.joined_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {activeTab === 'recruiters' && (
          <>
            {!hasRecruiters ? (
              <div className="text-center py-8">
                <Shield className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">No recruiters assigned</p>
                <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                  Assign team members to manage this company
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {assignedRecruiters.map((recruiter) => (
                  <div
                    key={recruiter.id}
                    className="p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {recruiter.avatar ? (
                          <img src={recruiter.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                            {recruiter.first_name} {recruiter.last_name}
                          </h4>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                            Recruiter
                          </span>
                        </div>

                        <a
                          href={`mailto:${recruiter.email}`}
                          className="flex items-center gap-2 mt-2 text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600"
                        >
                          <Mail className="w-3 h-3" />
                          {recruiter.email}
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default TeamPanel
