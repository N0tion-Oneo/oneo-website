import { Mail, Phone, User, Clock } from 'lucide-react'
import { useCompanyUsers } from '@/hooks'

interface ContactsPanelProps {
  companyId: string
  entity?: Record<string, unknown>
}

function getRoleBadge(role: string) {
  switch (role) {
    case 'admin':
      return { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700', label: 'Admin' }
    case 'hiring_manager':
      return { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700', label: 'Hiring Manager' }
    case 'viewer':
      return { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-400', label: 'Viewer' }
    default:
      return { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-400', label: role }
  }
}

export function ContactsPanel({ companyId }: ContactsPanelProps) {
  const { users, isLoading } = useCompanyUsers(companyId)

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100" />
      </div>
    )
  }

  if (!users || users.length === 0) {
    return (
      <div className="h-full overflow-y-auto p-4">
        <div className="text-center py-8">
          <User className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">No contacts found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-3">
      {users.map((user) => {
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

                <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 dark:text-gray-500">
                  {user.joined_at && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Joined {new Date(user.joined_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default ContactsPanel
