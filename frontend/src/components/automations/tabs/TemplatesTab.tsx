import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  type ColumnDef,
} from '@tanstack/react-table'
import { DataTable } from '@/components/common/DataTable'
import {
  useNotificationTemplates,
  useDeleteTemplate,
} from '@/hooks/useNotificationsAdmin'
import TemplateDrawer from '@/components/automations/TemplateDrawer'
import {
  Plus,
  MoreVertical,
  Trash2,
  Pencil,
  Loader2,
  FileText,
  Search,
} from 'lucide-react'
import {
  NotificationChannelLabels,
  RecipientTypeLabels,
  NotificationTemplate,
} from '@/types'

const templatesColumnHelper = createColumnHelper<NotificationTemplate>()

export default function TemplatesTab() {
  // Template state
  const [templateSearch, setTemplateSearch] = useState('')
  const [templateActiveFilter, setTemplateActiveFilter] = useState<string>('')
  const [templateDrawerOpen, setTemplateDrawerOpen] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [templateMenuOpen, setTemplateMenuOpen] = useState<string | null>(null)
  const [deleteTemplateDialogOpen, setDeleteTemplateDialogOpen] = useState(false)
  const [selectedTemplateForDelete, setSelectedTemplateForDelete] = useState<{ id: string; name: string } | null>(null)
  const [templateMenuPosition, setTemplateMenuPosition] = useState<{ top: number; left: number } | null>(null)

  // Template hooks
  const { templates, isLoading: isLoadingTemplates, refetch: refetchTemplates } = useNotificationTemplates({
    search: templateSearch,
    isActive: templateActiveFilter === '' ? null : templateActiveFilter === 'true',
  })
  const { deleteTemplate, isDeleting: isDeletingTemplate } = useDeleteTemplate()

  // Template handlers
  const handleNewTemplate = () => {
    setSelectedTemplateId(null)
    setTemplateDrawerOpen(true)
  }

  const handleEditTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId)
    setTemplateDrawerOpen(true)
  }

  const handleTemplateDrawerClose = () => {
    setTemplateDrawerOpen(false)
    setSelectedTemplateId(null)
  }

  const handleTemplateDrawerSaved = () => {
    setTemplateDrawerOpen(false)
    setSelectedTemplateId(null)
    refetchTemplates()
  }

  const handleDeleteTemplate = async () => {
    if (!selectedTemplateForDelete) return

    try {
      await deleteTemplate(selectedTemplateForDelete.id)
      setDeleteTemplateDialogOpen(false)
      setSelectedTemplateForDelete(null)
      refetchTemplates()
    } catch (err) {
      console.error('Failed to delete template:', err)
    }
  }

  // Column definitions
  const templatesColumns = useMemo<ColumnDef<NotificationTemplate, unknown>[]>(() => [
    templatesColumnHelper.accessor('name', {
      header: 'Template',
      cell: ({ row }) => (
        <div>
          <p className="text-[13px] font-medium text-gray-900 dark:text-gray-100">
            {row.original.name}
          </p>
          {row.original.description && (
            <p className="text-[12px] text-gray-500 dark:text-gray-400 truncate max-w-xs">
              {row.original.description}
            </p>
          )}
        </div>
      ),
      enableSorting: false,
    }),
    templatesColumnHelper.accessor('template_type', {
      header: 'Type',
      cell: ({ row }) => (
        <span className="text-[12px] text-gray-600 dark:text-gray-400">
          {row.original.template_type || 'Custom'}
        </span>
      ),
      enableSorting: false,
    }),
    templatesColumnHelper.accessor('recipient_type', {
      header: 'Recipient',
      cell: ({ row }) => (
        <span className="text-[12px] text-gray-600 dark:text-gray-400">
          {RecipientTypeLabels[row.original.recipient_type as keyof typeof RecipientTypeLabels] || row.original.recipient_type}
        </span>
      ),
      enableSorting: false,
    }),
    templatesColumnHelper.accessor('default_channel', {
      header: 'Channel',
      cell: ({ row }) => (
        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-[11px] font-medium rounded">
          {NotificationChannelLabels[row.original.default_channel as keyof typeof NotificationChannelLabels] || row.original.default_channel}
        </span>
      ),
      enableSorting: false,
    }),
    templatesColumnHelper.accessor('is_active', {
      header: 'Status',
      cell: ({ row }) => (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${
            row.original.is_active
              ? 'bg-green-50 text-green-700'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              row.original.is_active ? 'bg-green-500' : 'bg-gray-400'
            }`}
          />
          {row.original.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
      enableSorting: false,
    }),
    templatesColumnHelper.display({
      id: 'menu',
      header: '',
      cell: ({ row }) => (
        <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => {
              const template = row.original
              if (templateMenuOpen === template.id) {
                setTemplateMenuOpen(null)
                setTemplateMenuPosition(null)
              } else {
                const rect = e.currentTarget.getBoundingClientRect()
                setTemplateMenuPosition({ top: rect.bottom + 4, left: rect.right - 144 })
                setTemplateMenuOpen(template.id)
              }
            }}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <MoreVertical className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      ),
      meta: { className: 'w-12' },
    }),
  ], [templateMenuOpen])

  const table = useReactTable({
    data: templates,
    columns: templatesColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    enableSorting: false,
  })

  // Get open template for menu
  const openTemplate = templateMenuOpen ? templates.find(t => t.id === templateMenuOpen) : null

  return (
    <>
      {/* Templates Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              value={templateSearch}
              onChange={(e) => setTemplateSearch(e.target.value)}
              placeholder="Search templates..."
              className="pl-9 pr-4 py-2 w-64 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>
          <select
            value={templateActiveFilter}
            onChange={(e) => setTemplateActiveFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
        <button
          onClick={handleNewTemplate}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Template
        </button>
      </div>

      {/* Templates Table */}
      <DataTable
        table={table}
        onRowClick={(row) => handleEditTemplate(row.id)}
        stickyColumns={{ left: [], right: ['menu'] }}
        isLoading={isLoadingTemplates}
        loadingMessage="Loading templates..."
        emptyState={{
          icon: <FileText className="w-6 h-6 text-gray-400 dark:text-gray-500" />,
          title: 'No templates yet',
          description: 'Create reusable notification templates for your automation rules',
          action: (
            <button
              onClick={handleNewTemplate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-[13px] font-medium rounded-lg hover:bg-gray-800"
            >
              <Plus className="w-4 h-4" />
              Create Template
            </button>
          ),
        }}
      />

      {/* Templates Action Menu Portal */}
      {openTemplate && templateMenuPosition && createPortal(
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => {
              setTemplateMenuOpen(null)
              setTemplateMenuPosition(null)
            }}
          />
          <div
            className="fixed w-36 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-[9999]"
            style={{ top: templateMenuPosition.top, left: templateMenuPosition.left }}
          >
            <button
              onClick={() => {
                handleEditTemplate(openTemplate.id)
                setTemplateMenuOpen(null)
                setTemplateMenuPosition(null)
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>
            <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
            <button
              onClick={() => {
                setSelectedTemplateForDelete({ id: openTemplate.id, name: openTemplate.name })
                setDeleteTemplateDialogOpen(true)
                setTemplateMenuOpen(null)
                setTemplateMenuPosition(null)
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        </>,
        document.body
      )}

      {/* Template Drawer */}
      {templateDrawerOpen && (
        <TemplateDrawer
          templateId={selectedTemplateId}
          onClose={handleTemplateDrawerClose}
          onSaved={handleTemplateDrawerSaved}
        />
      )}

      {/* Delete Template Confirmation Dialog */}
      {deleteTemplateDialogOpen && selectedTemplateForDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[300]">
          <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-sm mx-4 shadow-xl">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">Delete Template</h2>
            </div>
            <div className="p-5">
              <p className="text-[13px] text-gray-600 dark:text-gray-400">
                Are you sure you want to delete <span className="font-medium">"{selectedTemplateForDelete.name}"</span>?
                This action cannot be undone.
              </p>
            </div>
            <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
              <button
                onClick={() => setDeleteTemplateDialogOpen(false)}
                className="px-4 py-2 text-[13px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTemplate}
                disabled={isDeletingTemplate}
                className="px-4 py-2 bg-red-600 text-white text-[13px] font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                {isDeletingTemplate && <Loader2 className="w-4 h-4 animate-spin" />}
                {isDeletingTemplate ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
