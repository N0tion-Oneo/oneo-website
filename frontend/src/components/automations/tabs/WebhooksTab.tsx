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
  useWebhookEndpoints,
  useToggleWebhookEndpoint,
  useDeleteWebhookEndpoint,
  useAllWebhookReceipts,
  WebhookEndpointListItem,
  WebhookReceipt,
} from '@/hooks/useAutomations'
import WebhookEndpointDrawer from '@/components/automations/WebhookEndpointDrawer'
import { formatDistanceToNow } from 'date-fns'
import {
  Plus,
  MoreVertical,
  Play,
  Pause,
  Trash2,
  Pencil,
  Loader2,
  AlertCircle,
  Check,
  X,
  RefreshCw,
  Link2,
  Key,
  Copy,
  Shield,
  History,
} from 'lucide-react'

const webhooksColumnHelper = createColumnHelper<WebhookEndpointListItem>()
const receiptsColumnHelper = createColumnHelper<WebhookReceipt>()

type WebhookSubTab = 'endpoints' | 'history'

export default function WebhooksTab() {
  // Sub-tab state
  const [webhookSubTab, setWebhookSubTab] = useState<WebhookSubTab>('endpoints')

  // Webhook state
  const { endpoints, isLoading: isLoadingWebhooks, refetch: refetchWebhooks } = useWebhookEndpoints()
  const { toggle: toggleWebhook } = useToggleWebhookEndpoint()
  const { deleteEndpoint, isDeleting: isDeletingWebhook } = useDeleteWebhookEndpoint()
  const [webhookDrawerOpen, setWebhookDrawerOpen] = useState(false)
  const [selectedWebhookId, setSelectedWebhookId] = useState<string | null>(null)
  const [webhookMenuOpen, setWebhookMenuOpen] = useState<string | null>(null)
  const [deleteWebhookDialogOpen, setDeleteWebhookDialogOpen] = useState(false)
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookEndpointListItem | null>(null)
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState<string | null>(null)
  const [webhookMenuPosition, setWebhookMenuPosition] = useState<{ top: number; left: number } | null>(null)

  // Receipts state
  const [receiptStatusFilter, setReceiptStatusFilter] = useState<string>('')
  const [receiptEndpointFilter, setReceiptEndpointFilter] = useState<string>('')
  const { receipts, isLoading: isLoadingReceipts, refetch: refetchReceipts } = useAllWebhookReceipts({
    status: receiptStatusFilter || undefined,
    endpoint: receiptEndpointFilter || undefined,
    limit: 100,
  })
  const [selectedReceipt, setSelectedReceipt] = useState<WebhookReceipt | null>(null)

  // Webhook endpoints columns
  const webhooksColumns = useMemo<ColumnDef<WebhookEndpointListItem, unknown>[]>(() => [
    webhooksColumnHelper.accessor('name', {
      header: 'Endpoint',
      cell: ({ row }) => (
        <div>
          <p className="text-[13px] font-medium text-gray-900 dark:text-gray-100">{row.original.name}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <code className="text-[11px] text-gray-500 dark:text-gray-400 font-mono truncate max-w-[200px]">
              {row.original.webhook_url}
            </code>
            <button
              onClick={(e) => {
                e.stopPropagation()
                const fullUrl = `${window.location.origin}${row.original.webhook_url}`
                navigator.clipboard.writeText(fullUrl)
                setCopiedWebhookUrl(row.original.id)
                setTimeout(() => setCopiedWebhookUrl(null), 2000)
              }}
              className="p-0.5 text-gray-400 dark:text-gray-500 hover:text-gray-600"
            >
              {copiedWebhookUrl === row.original.id ? (
                <Check className="w-3 h-3 text-green-600" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>
        </div>
      ),
      enableSorting: false,
    }),
    webhooksColumnHelper.accessor('target_action', {
      header: 'Target',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[11px] font-medium rounded">
            {row.original.target_action}
          </span>
          <span className="text-[12px] text-gray-600 dark:text-gray-400">
            {row.original.target_model_display}
          </span>
        </div>
      ),
      enableSorting: false,
    }),
    webhooksColumnHelper.accessor('auth_type', {
      header: 'Auth',
      cell: ({ row }) => (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
          row.original.auth_type === 'api_key'
            ? 'bg-green-50 text-green-700'
            : row.original.auth_type === 'hmac'
              ? 'bg-purple-50 text-purple-700'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
        }`}>
          {row.original.auth_type === 'api_key' && <Key className="w-3 h-3" />}
          {row.original.auth_type === 'hmac' && <Shield className="w-3 h-3" />}
          {row.original.auth_type === 'api_key' ? 'API Key' : row.original.auth_type === 'hmac' ? 'HMAC' : 'None'}
        </span>
      ),
      enableSorting: false,
    }),
    webhooksColumnHelper.accessor('is_active', {
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
    webhooksColumnHelper.accessor('total_received', {
      header: 'Received',
      cell: ({ row }) => (
        <div className="inline-flex items-center gap-2">
          <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100">{row.original.total_received}</span>
          <span className="text-[12px] text-green-600">{row.original.total_success}</span>
          <span className="text-gray-300">/</span>
          <span className="text-[12px] text-red-600">{row.original.total_failed}</span>
        </div>
      ),
      enableSorting: false,
    }),
    webhooksColumnHelper.accessor('last_received_at', {
      header: 'Last Received',
      cell: ({ row }) => (
        <span className="text-[12px] text-gray-500 dark:text-gray-400">
          {row.original.last_received_at
            ? formatDistanceToNow(new Date(row.original.last_received_at), { addSuffix: true })
            : 'Never'}
        </span>
      ),
      enableSorting: false,
    }),
    webhooksColumnHelper.display({
      id: 'menu',
      header: '',
      cell: ({ row }) => (
        <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => {
              const endpoint = row.original
              if (webhookMenuOpen === endpoint.id) {
                setWebhookMenuOpen(null)
                setWebhookMenuPosition(null)
              } else {
                const rect = e.currentTarget.getBoundingClientRect()
                setWebhookMenuPosition({ top: rect.bottom + 4, left: rect.right - 160 })
                setWebhookMenuOpen(endpoint.id)
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
  ], [copiedWebhookUrl, webhookMenuOpen])

  const webhooksTable = useReactTable({
    data: webhookSubTab === 'endpoints' ? endpoints : [],
    columns: webhooksColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    enableSorting: false,
  })

  // Webhook receipts columns
  const receiptsColumns = useMemo<ColumnDef<WebhookReceipt, unknown>[]>(() => [
    receiptsColumnHelper.accessor('status', {
      header: 'Status',
      cell: ({ row }) => (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${
          row.original.status === 'success'
            ? 'bg-green-50 text-green-700'
            : row.original.status === 'failed'
              ? 'bg-red-50 text-red-700'
              : row.original.status === 'invalid_auth'
                ? 'bg-orange-50 text-orange-700'
                : row.original.status === 'rate_limited'
                  ? 'bg-yellow-50 text-yellow-700'
                  : 'bg-amber-50 text-amber-700'
        }`}>
          {row.original.status === 'success' && <Check className="w-3 h-3" />}
          {row.original.status === 'failed' && <X className="w-3 h-3" />}
          {row.original.status === 'invalid_auth' && <Key className="w-3 h-3" />}
          {row.original.status === 'rate_limited' && <AlertCircle className="w-3 h-3" />}
          {row.original.status === 'validation_error' && <AlertCircle className="w-3 h-3" />}
          {row.original.status.replace('_', ' ')}
        </span>
      ),
      enableSorting: false,
    }),
    receiptsColumnHelper.accessor('endpoint_name', {
      header: 'Endpoint',
      cell: ({ row }) => (
        <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100">
          {row.original.endpoint_name || 'Unknown'}
        </span>
      ),
      enableSorting: false,
    }),
    receiptsColumnHelper.accessor('ip_address', {
      header: 'IP Address',
      cell: ({ row }) => (
        <code className="text-[12px] text-gray-600 dark:text-gray-400 font-mono">
          {row.original.ip_address}
        </code>
      ),
      enableSorting: false,
    }),
    receiptsColumnHelper.accessor('processing_time_ms', {
      header: 'Processing',
      cell: ({ row }) => (
        <span className="text-[12px] text-gray-600 dark:text-gray-400">
          {row.original.processing_time_ms ? `${row.original.processing_time_ms}ms` : '—'}
        </span>
      ),
      enableSorting: false,
    }),
    receiptsColumnHelper.accessor('created_object_id', {
      header: 'Created Record',
      cell: ({ row }) => (
        row.original.created_object_id ? (
          <code className="text-[11px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-mono">
            {row.original.created_object_id.substring(0, 8)}...
          </code>
        ) : (
          <span className="text-[12px] text-gray-400 dark:text-gray-500">—</span>
        )
      ),
      enableSorting: false,
    }),
    receiptsColumnHelper.accessor('created_at', {
      header: 'Received',
      cell: ({ row }) => (
        <span className="text-[12px] text-gray-500 dark:text-gray-400">
          {formatDistanceToNow(new Date(row.original.created_at), { addSuffix: true })}
        </span>
      ),
      enableSorting: false,
    }),
  ], [])

  const receiptsTable = useReactTable({
    data: webhookSubTab === 'history' ? receipts : [],
    columns: receiptsColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    enableSorting: false,
  })

  // Get open endpoint for menu
  const openEndpoint = webhookMenuOpen ? endpoints.find(e => e.id === webhookMenuOpen) : null

  return (
    <div>
      {/* Header with sub-tabs */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-md p-1">
            <button
              onClick={() => setWebhookSubTab('endpoints')}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                webhookSubTab === 'endpoints'
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm dark:shadow-gray-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              Endpoints
            </button>
            <button
              onClick={() => setWebhookSubTab('history')}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                webhookSubTab === 'history'
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm dark:shadow-gray-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              History
            </button>
          </div>
        </div>
        {webhookSubTab === 'endpoints' && (
          <button
            onClick={() => {
              setSelectedWebhookId(null)
              setWebhookDrawerOpen(true)
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800"
          >
            <Plus className="w-4 h-4" />
            New Webhook
          </button>
        )}
        {webhookSubTab === 'history' && (
          <button
            onClick={() => refetchReceipts()}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        )}
      </div>

      {/* Endpoints Sub-tab */}
      {webhookSubTab === 'endpoints' && (
        <DataTable
          table={webhooksTable}
          onRowClick={(row) => {
            setSelectedWebhookId(row.id)
            setWebhookDrawerOpen(true)
          }}
          stickyColumns={{ left: [], right: ['menu'] }}
          isLoading={isLoadingWebhooks}
          loadingMessage="Loading webhook endpoints..."
          emptyState={{
            icon: <Link2 className="w-6 h-6 text-gray-400 dark:text-gray-500" />,
            title: 'No webhook endpoints yet',
            description: 'Create a webhook endpoint to receive data from external systems like forms, Zapier, or other platforms.',
            action: (
              <button
                onClick={() => {
                  setSelectedWebhookId(null)
                  setWebhookDrawerOpen(true)
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-[13px] font-medium rounded-lg hover:bg-gray-800"
              >
                <Plus className="w-4 h-4" />
                Create Webhook Endpoint
              </button>
            ),
          }}
        />
      )}

      {/* History Sub-tab */}
      {webhookSubTab === 'history' && (
        <div className="flex gap-6">
          {/* Receipts List */}
          <div className="flex-1">
            {/* Filters */}
            <div className="flex items-center gap-3 mb-4">
              <select
                value={receiptStatusFilter}
                onChange={(e) => setReceiptStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              >
                <option value="">All statuses</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
                <option value="invalid_auth">Invalid Auth</option>
                <option value="validation_error">Validation Error</option>
                <option value="rate_limited">Rate Limited</option>
              </select>
              <select
                value={receiptEndpointFilter}
                onChange={(e) => setReceiptEndpointFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              >
                <option value="">All endpoints</option>
                {endpoints.map((ep) => (
                  <option key={ep.id} value={ep.id}>{ep.name}</option>
                ))}
              </select>
            </div>

            {/* Receipts Table */}
            <DataTable
              table={receiptsTable}
              onRowClick={(row) => setSelectedReceipt(row)}
              isLoading={isLoadingReceipts}
              loadingMessage="Loading webhook receipts..."
              emptyState={{
                icon: <History className="w-6 h-6 text-gray-400 dark:text-gray-500" />,
                title: 'No webhook receipts yet',
                description: 'Incoming webhook requests will appear here',
              }}
            />
          </div>

          {/* Receipt Detail Panel */}
          {selectedReceipt && (
            <div className="w-[400px] flex-shrink-0">
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg sticky top-4">
                {/* Header */}
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <h3 className="text-[13px] font-semibold text-gray-900 dark:text-gray-100">Receipt Details</h3>
                  <button
                    onClick={() => setSelectedReceipt(null)}
                    className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-4 max-h-[calc(100vh-200px)] overflow-y-auto space-y-4">
                  {/* Status */}
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Status</label>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[12px] font-medium ${
                      selectedReceipt.status === 'success'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-red-50 text-red-700'
                    }`}>
                      {selectedReceipt.status === 'success' ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                      {selectedReceipt.status.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Endpoint */}
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Endpoint</label>
                    <span className="text-[13px] text-gray-900 dark:text-gray-100">{selectedReceipt.endpoint_name}</span>
                  </div>

                  {/* IP Address */}
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">IP Address</label>
                    <code className="text-[12px] text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded font-mono">
                      {selectedReceipt.ip_address}
                    </code>
                  </div>

                  {/* Received At */}
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Received</label>
                    <span className="text-[13px] text-gray-900 dark:text-gray-100">
                      {new Date(selectedReceipt.created_at).toLocaleString()}
                    </span>
                  </div>

                  {/* Processing Time */}
                  {selectedReceipt.processing_time_ms && (
                    <div>
                      <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Processing Time</label>
                      <span className="text-[13px] text-gray-900 dark:text-gray-100">{selectedReceipt.processing_time_ms}ms</span>
                    </div>
                  )}

                  {/* Created Record */}
                  {selectedReceipt.created_object_id && (
                    <div>
                      <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Created Record ID</label>
                      <code className="text-[12px] text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded font-mono break-all">
                        {selectedReceipt.created_object_id}
                      </code>
                    </div>
                  )}

                  {/* Error Message */}
                  {selectedReceipt.error_message && (
                    <div>
                      <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Error</label>
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <pre className="text-[12px] text-red-700 whitespace-pre-wrap font-mono">
                          {selectedReceipt.error_message}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Payload */}
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Payload</label>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto">
                      <pre className="text-[11px] text-gray-700 dark:text-gray-300 font-mono">
                        {JSON.stringify(selectedReceipt.payload, null, 2)}
                      </pre>
                    </div>
                  </div>

                  {/* Headers */}
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Headers</label>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto">
                      <pre className="text-[11px] text-gray-700 dark:text-gray-300 font-mono">
                        {JSON.stringify(selectedReceipt.headers, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Webhooks Action Menu Portal */}
      {openEndpoint && webhookMenuPosition && createPortal(
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => {
              setWebhookMenuOpen(null)
              setWebhookMenuPosition(null)
            }}
          />
          <div
            className="fixed w-40 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-[9999]"
            style={{ top: webhookMenuPosition.top, left: webhookMenuPosition.left }}
          >
            <button
              onClick={() => {
                setSelectedWebhookId(openEndpoint.id)
                setWebhookDrawerOpen(true)
                setWebhookMenuOpen(null)
                setWebhookMenuPosition(null)
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>
            <button
              onClick={async () => {
                await toggleWebhook(openEndpoint.id)
                refetchWebhooks()
                setWebhookMenuOpen(null)
                setWebhookMenuPosition(null)
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              {openEndpoint.is_active ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  Deactivate
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  Activate
                </>
              )}
            </button>
            <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
            <button
              onClick={() => {
                setSelectedWebhook(openEndpoint)
                setDeleteWebhookDialogOpen(true)
                setWebhookMenuOpen(null)
                setWebhookMenuPosition(null)
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

      {/* Webhook Endpoint Drawer */}
      {webhookDrawerOpen && (
        <WebhookEndpointDrawer
          endpointId={selectedWebhookId}
          onClose={() => {
            setWebhookDrawerOpen(false)
            setSelectedWebhookId(null)
          }}
          onSaved={() => {
            refetchWebhooks()
            setWebhookDrawerOpen(false)
            setSelectedWebhookId(null)
          }}
        />
      )}

      {/* Delete Webhook Confirmation Dialog */}
      {deleteWebhookDialogOpen && selectedWebhook && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[300]">
          <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-sm mx-4">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Delete Webhook Endpoint</h2>
            </div>
            <div className="p-4">
              <p className="text-gray-600 dark:text-gray-400">
                Are you sure you want to delete "{selectedWebhook.name}"? This will remove the webhook
                endpoint and any external systems sending data to it will start receiving errors.
              </p>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button
                onClick={() => {
                  setDeleteWebhookDialogOpen(false)
                  setSelectedWebhook(null)
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (selectedWebhook) {
                    await deleteEndpoint(selectedWebhook.id)
                    setDeleteWebhookDialogOpen(false)
                    setSelectedWebhook(null)
                    refetchWebhooks()
                  }
                }}
                disabled={isDeletingWebhook}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isDeletingWebhook && <Loader2 className="w-4 h-4 animate-spin" />}
                {isDeletingWebhook ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
