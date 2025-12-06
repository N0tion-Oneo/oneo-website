import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Plus,
  Search,
  FileText,
  Edit2,
  Trash2,
  AlertCircle,
  Check,
  X,
} from 'lucide-react'
import { useNotificationTemplates, useDeleteTemplate } from '@/hooks'
import { UserRole, NotificationChannelLabels, NotificationChannel, RecipientType, RecipientTypeLabels } from '@/types'
import { useAuth } from '@/contexts/AuthContext'

export default function NotificationTemplatesPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === UserRole.ADMIN
  const isAdminOrRecruiter = user?.role === UserRole.ADMIN || user?.role === UserRole.RECRUITER

  // Filters
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<string>('')

  // Fetch templates
  const { templates, isLoading, error, refetch } = useNotificationTemplates({
    isActive: activeFilter === '' ? null : activeFilter === 'true',
    search,
  })

  // Delete template
  const { deleteTemplate, isDeleting } = useDeleteTemplate()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Access check
  if (!isAdminOrRecruiter) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-[15px] text-gray-700 mb-1">Access Denied</p>
        <p className="text-[13px] text-gray-500">You don't have permission to view this page.</p>
      </div>
    )
  }

  const handleDelete = async (templateId: string, templateName: string) => {
    if (!confirm(`Delete template "${templateName}"? This action cannot be undone.`)) {
      return
    }

    setDeletingId(templateId)
    setDeleteError(null)

    try {
      await deleteTemplate(templateId)
      refetch()
    } catch (err) {
      console.error('Failed to delete template:', err)
      setDeleteError('Failed to delete template')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/dashboard/settings/notifications"
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-gray-700" />
            <h1 className="text-[22px] font-semibold text-gray-900">Notification Templates</h1>
            <span className="text-[13px] text-gray-500">({templates.length} total)</span>
          </div>
        </div>
        {isAdmin && (
          <Link
            to="/dashboard/settings/notifications/templates/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-[13px] font-medium rounded-md hover:bg-gray-800"
          >
            <Plus className="w-4 h-4" />
            New Template
          </Link>
        )}
      </div>

      {/* Error Message */}
      {deleteError && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-[13px] text-red-700">{deleteError}</p>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-[13px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          {/* Active filter */}
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="px-3 py-2 text-[13px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>

      {/* Templates List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <p className="text-[13px] text-gray-500">Loading templates...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-[13px] text-red-500">{error}</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-[15px] text-gray-700 mb-1">No templates found</p>
            <p className="text-[13px] text-gray-500 mb-4">
              {search ? 'Try adjusting your search' : 'Create your first template'}
            </p>
            {isAdmin && !search && (
              <Link
                to="/dashboard/settings/notifications/templates/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-[13px] font-medium rounded-md hover:bg-gray-800"
              >
                <Plus className="w-4 h-4" />
                New Template
              </Link>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 uppercase">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 uppercase">
                  Recipient
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 uppercase">
                  Channel
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 uppercase">
                  Updated
                </th>
                {isAdmin && (
                  <th className="px-4 py-3 text-right text-[11px] font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {templates.map((template) => (
                <tr key={template.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <div className="text-[13px] font-medium text-gray-900">{template.name}</div>
                      {template.description && (
                        <div className="text-[12px] text-gray-500 line-clamp-1">
                          {template.description}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] text-gray-700">
                        {template.template_type || 'Custom'}
                      </span>
                      {template.is_custom && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 rounded">
                          Custom
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[13px] text-gray-600">
                      {RecipientTypeLabels[template.recipient_type as RecipientType] ||
                        template.recipient_type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[13px] text-gray-600">
                      {NotificationChannelLabels[template.default_channel as NotificationChannel] ||
                        template.default_channel}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded ${
                        template.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {template.is_active ? (
                        <>
                          <Check className="w-3 h-3" />
                          Active
                        </>
                      ) : (
                        <>
                          <X className="w-3 h-3" />
                          Inactive
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[13px] text-gray-500">
                      {new Date(template.updated_at).toLocaleDateString()}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          to={`/dashboard/settings/notifications/templates/${template.id}`}
                          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(template.id, template.name)}
                          disabled={isDeleting && deletingId === template.id}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
