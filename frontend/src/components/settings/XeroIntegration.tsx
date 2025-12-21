import { useState, useEffect } from 'react'
import {
  Check,
  X,
  ExternalLink,
  RefreshCw,
  FileText,
  CreditCard,
  AlertCircle,
  Clock,
} from 'lucide-react'
import {
  useXeroConnection,
  useConnectXero,
  useDisconnectXero,
  useSyncXeroInvoices,
  useSyncXeroPayments,
  useXeroInvoiceStatus,
  type XeroSyncResult,
} from '@/hooks/useXeroIntegration'

function formatDate(dateString: string | null): string {
  if (!dateString) return 'Never'
  return new Date(dateString).toLocaleString()
}

interface XeroIntegrationProps {
  className?: string
}

export default function XeroIntegration({ className = '' }: XeroIntegrationProps) {
  const { connection, isLoading, refetch } = useXeroConnection()
  const { connect, isConnecting } = useConnectXero()
  const { disconnect, isDisconnecting } = useDisconnectXero()
  const { syncInvoices, isSyncing: isSyncingInvoices } = useSyncXeroInvoices()
  const { syncPayments, isSyncing: isSyncingPayments } = useSyncXeroPayments()
  const { mappings, refetch: refetchMappings } = useXeroInvoiceStatus()

  const [syncResult, setSyncResult] = useState<XeroSyncResult | null>(null)
  const [showSyncResult, setShowSyncResult] = useState(false)

  // Listen for OAuth callback messages from popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'xero_oauth_success') {
        refetch()
        refetchMappings()
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [refetch, refetchMappings])

  const handleConnect = async () => {
    try {
      await connect()
    } catch {
      // Error handled in hook
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Xero? Invoice syncing will stop.')) {
      return
    }
    try {
      await disconnect()
      await refetch()
    } catch {
      // Error handled in hook
    }
  }

  const handleSyncInvoices = async () => {
    try {
      const result = await syncInvoices()
      setSyncResult(result)
      setShowSyncResult(true)
      await refetchMappings()
      setTimeout(() => setShowSyncResult(false), 5000)
    } catch {
      // Error handled in hook
    }
  }

  const handleSyncPayments = async () => {
    try {
      const result = await syncPayments()
      setSyncResult(result)
      setShowSyncResult(true)
      await refetch()
      setTimeout(() => setShowSyncResult(false), 5000)
    } catch {
      // Error handled in hook
    }
  }

  // Count sync statuses
  const pendingCount = mappings.filter((m) => m.sync_status === 'pending').length
  const errorCount = mappings.filter((m) => m.sync_status === 'error').length
  const syncedCount = mappings.filter((m) => m.sync_status === 'synced').length

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <span className="text-lg">X</span>
          </div>
          <h3 className="text-lg font-medium">Xero Integration</h3>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-16 bg-gray-100 rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <span className="text-lg font-bold text-blue-600">X</span>
          </div>
          <h3 className="text-lg font-medium">Xero Integration</h3>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <p className="text-sm text-gray-500 mb-6">
        Connect Xero to automatically sync invoices and import payments.
      </p>

      {/* Sync Result Toast */}
      {showSyncResult && syncResult && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">{syncResult.message}</p>
          {syncResult.errors > 0 && (
            <p className="text-xs text-blue-600 mt-1">
              {syncResult.errors} error(s) occurred
            </p>
          )}
        </div>
      )}

      {/* Connection Status */}
      <div
        className={`rounded-lg border transition-colors ${
          connection
            ? 'bg-green-50 border-green-200'
            : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
        }`}
      >
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-gray-200">
              <span className="text-xl font-bold text-blue-600">X</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Xero</span>
                {connection && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    <Check className="h-3 w-3" />
                    Connected
                  </span>
                )}
              </div>
              {connection ? (
                <p className="text-sm text-gray-600 mt-0.5">
                  {connection.tenant_name}
                  {connection.connected_by_name && (
                    <span className="text-gray-400">
                      {' '}
                      &bull; Connected by {connection.connected_by_name}
                    </span>
                  )}
                </p>
              ) : (
                <p className="text-sm text-gray-500 mt-0.5">
                  Two-way sync for invoices and payments
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {connection ? (
              <button
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
              >
                {isDisconnecting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Disconnecting...
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4" />
                    Disconnect
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-md transition-colors disabled:opacity-50"
              >
                {isConnecting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4" />
                    Connect
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Connected Details */}
        {connection && (
          <div className="px-4 pb-4 border-t border-green-200 pt-4">
            {/* Sync Status Summary */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 bg-white rounded-lg border border-gray-100">
                <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                  <Check className="h-4 w-4" />
                  <span className="text-lg font-semibold">{syncedCount}</span>
                </div>
                <p className="text-xs text-gray-500">Synced</p>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border border-gray-100">
                <div className="flex items-center justify-center gap-1 text-yellow-600 mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-lg font-semibold">{pendingCount}</span>
                </div>
                <p className="text-xs text-gray-500">Pending</p>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border border-gray-100">
                <div className="flex items-center justify-center gap-1 text-red-600 mb-1">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-lg font-semibold">{errorCount}</span>
                </div>
                <p className="text-xs text-gray-500">Errors</p>
              </div>
            </div>

            {/* Last Sync Info */}
            <div className="text-sm text-gray-600 mb-4">
              <p>
                <span className="text-gray-500">Last payment sync:</span>{' '}
                {formatDate(connection.last_sync_at)}
              </p>
            </div>

            {/* Manual Sync Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleSyncInvoices}
                disabled={isSyncingInvoices}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {isSyncingInvoices ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4" />
                    Sync Invoices
                  </>
                )}
              </button>
              <button
                onClick={handleSyncPayments}
                disabled={isSyncingPayments}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {isSyncingPayments ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    Sync Payments
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2">How it works</h4>
        <ul className="text-sm text-gray-500 space-y-1">
          <li>&bull; Invoices are automatically pushed to Xero when sent</li>
          <li>&bull; Payments recorded in Xero are synced hourly</li>
          <li>&bull; Invoice status updates automatically when payments are received</li>
          <li>&bull; Companies are created as Xero contacts automatically</li>
        </ul>
      </div>
    </div>
  )
}
