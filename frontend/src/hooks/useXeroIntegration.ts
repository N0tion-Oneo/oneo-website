import { useState, useEffect, useCallback } from 'react'
import api from '@/services/api'

// Types
export interface XeroConnection {
  id: string
  tenant_id: string
  tenant_name: string
  is_active: boolean
  last_sync_at: string | null
  connected_by_name: string | null
  created_at: string
}

export interface XeroSyncResult {
  synced: number
  skipped: number
  errors: number
  message: string
}

export interface XeroInvoiceMapping {
  id: string
  invoice_number: string
  company_name: string
  xero_invoice_id: string
  xero_invoice_number: string
  sync_status: 'pending' | 'synced' | 'error'
  sync_error: string
  last_synced_at: string | null
  created_at: string
}

// Get Xero connection status
interface UseXeroConnectionReturn {
  connection: XeroConnection | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useXeroConnection(): UseXeroConnectionReturn {
  const [connection, setConnection] = useState<XeroConnection | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchConnection = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<XeroConnection>('/integrations/xero/status/')
      setConnection(response.data)
    } catch (err) {
      const axiosError = err as { response?: { status?: number } }
      if (axiosError.response?.status === 404) {
        // No connection found - this is expected
        setConnection(null)
      } else {
        setError('Failed to load Xero connection status')
        console.error('Error fetching Xero connection:', err)
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConnection()
  }, [fetchConnection])

  return { connection, isLoading, error, refetch: fetchConnection }
}

// Connect to Xero
interface UseConnectXeroReturn {
  connect: () => Promise<void>
  isConnecting: boolean
  error: string | null
}

export function useConnectXero(): UseConnectXeroReturn {
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const connect = useCallback(async (): Promise<void> => {
    setIsConnecting(true)
    setError(null)
    try {
      // Get the OAuth URL from the backend
      const response = await api.get<{ auth_url: string; state: string }>(
        '/integrations/xero/auth/'
      )

      // Store state for verification
      sessionStorage.setItem('xero_oauth_state', response.data.state)

      // Open OAuth in a popup window
      const width = 600
      const height = 700
      const left = window.screenX + (window.outerWidth - width) / 2
      const top = window.screenY + (window.outerHeight - height) / 2

      window.open(
        response.data.auth_url,
        'xero_oauth',
        `width=${width},height=${height},left=${left},top=${top}`
      )
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to initiate Xero authorization'
      setError(message)
      console.error('Error connecting to Xero:', err)
      throw err
    } finally {
      setIsConnecting(false)
    }
  }, [])

  return { connect, isConnecting, error }
}

// Disconnect from Xero
interface UseDisconnectXeroReturn {
  disconnect: () => Promise<void>
  isDisconnecting: boolean
  error: string | null
}

export function useDisconnectXero(): UseDisconnectXeroReturn {
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const disconnect = useCallback(async (): Promise<void> => {
    setIsDisconnecting(true)
    setError(null)
    try {
      await api.post('/integrations/xero/disconnect/')
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to disconnect Xero'
      setError(message)
      console.error('Error disconnecting Xero:', err)
      throw err
    } finally {
      setIsDisconnecting(false)
    }
  }, [])

  return { disconnect, isDisconnecting, error }
}

// Sync invoices to Xero
interface UseSyncInvoicesReturn {
  syncInvoices: () => Promise<XeroSyncResult>
  isSyncing: boolean
  error: string | null
}

export function useSyncXeroInvoices(): UseSyncInvoicesReturn {
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const syncInvoices = useCallback(async (): Promise<XeroSyncResult> => {
    setIsSyncing(true)
    setError(null)
    try {
      const response = await api.post<XeroSyncResult>('/integrations/xero/sync/invoices/')
      return response.data
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to sync invoices'
      setError(message)
      console.error('Error syncing invoices:', err)
      throw err
    } finally {
      setIsSyncing(false)
    }
  }, [])

  return { syncInvoices, isSyncing, error }
}

// Sync payments from Xero
interface UseSyncPaymentsReturn {
  syncPayments: () => Promise<XeroSyncResult>
  isSyncing: boolean
  error: string | null
}

export function useSyncXeroPayments(): UseSyncPaymentsReturn {
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const syncPayments = useCallback(async (): Promise<XeroSyncResult> => {
    setIsSyncing(true)
    setError(null)
    try {
      const response = await api.post<XeroSyncResult>('/integrations/xero/sync/payments/')
      return response.data
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to sync payments'
      setError(message)
      console.error('Error syncing payments:', err)
      throw err
    } finally {
      setIsSyncing(false)
    }
  }, [])

  return { syncPayments, isSyncing, error }
}

// Get invoice sync status
interface UseInvoiceSyncStatusReturn {
  mappings: XeroInvoiceMapping[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useXeroInvoiceStatus(
  statusFilter?: 'pending' | 'synced' | 'error'
): UseInvoiceSyncStatusReturn {
  const [mappings, setMappings] = useState<XeroInvoiceMapping[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMappings = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = statusFilter ? { status: statusFilter } : {}
      const response = await api.get<XeroInvoiceMapping[]>('/integrations/xero/invoices/', { params })
      setMappings(response.data)
    } catch (err) {
      setError('Failed to load invoice sync status')
      console.error('Error fetching invoice mappings:', err)
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchMappings()
  }, [fetchMappings])

  return { mappings, isLoading, error, refetch: fetchMappings }
}

// Handle OAuth callback
interface UseXeroCallbackReturn {
  handleCallback: (code: string, state: string) => Promise<XeroConnection>
  isProcessing: boolean
  error: string | null
}

export function useXeroCallback(): UseXeroCallbackReturn {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCallback = useCallback(async (code: string, state: string): Promise<XeroConnection> => {
    setIsProcessing(true)
    setError(null)
    try {
      const response = await api.post<XeroConnection>('/integrations/xero/callback/', {
        code,
        state,
      })
      return response.data
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to complete Xero authorization'
      setError(message)
      console.error('Error handling Xero callback:', err)
      throw err
    } finally {
      setIsProcessing(false)
    }
  }, [])

  return { handleCallback, isProcessing, error }
}
