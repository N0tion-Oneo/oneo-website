import React, { useEffect, useState } from 'react'
import { useSearchParams, useParams } from 'react-router-dom'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import api from '@/services/api'

type OAuthStatus = 'loading' | 'success' | 'error'

export default function CalendarOAuthCallback() {
  const [searchParams] = useSearchParams()
  const { provider } = useParams<{ provider: string }>()
  const [status, setStatus] = useState<OAuthStatus>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const errorParam = searchParams.get('error')

    if (errorParam) {
      setStatus('error')
      setError(searchParams.get('error_description') || 'Authorization was denied')
      return
    }

    if (!code) {
      setStatus('error')
      setError('No authorization code received')
      return
    }

    // Exchange code for tokens
    const exchangeCode = async () => {
      try {
        await api.post(`/scheduling/auth/${provider}/callback/`, {
          code,
          state,
        })

        setStatus('success')

        // Notify parent window if this is a popup
        if (window.opener) {
          window.opener.postMessage({ type: 'calendar_oauth_success', provider }, '*')
          // Close popup after short delay
          setTimeout(() => window.close(), 2000)
        }
      } catch (err) {
        const axiosError = err as { response?: { data?: { error?: string } } }
        setStatus('error')
        setError(axiosError.response?.data?.error || 'Failed to connect calendar')
      }
    }

    exchangeCode()
  }, [searchParams, provider])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="h-12 w-12 text-gray-400 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Connecting Calendar...
            </h2>
            <p className="text-gray-500">
              Please wait while we complete the authorization.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Calendar Connected!
            </h2>
            <p className="text-gray-500 mb-4">
              Your {provider === 'google' ? 'Google' : 'Microsoft'} calendar has been successfully connected.
            </p>
            {window.opener ? (
              <p className="text-sm text-gray-400">
                This window will close automatically...
              </p>
            ) : (
              <a
                href="/dashboard/settings"
                className="inline-flex items-center justify-center px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
              >
                Back to Settings
              </a>
            )}
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Connection Failed
            </h2>
            <p className="text-gray-500 mb-4">
              {error || 'Something went wrong while connecting your calendar.'}
            </p>
            <div className="space-x-3">
              {window.opener ? (
                <button
                  onClick={() => window.close()}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Close Window
                </button>
              ) : (
                <a
                  href="/dashboard/settings"
                  className="inline-flex items-center justify-center px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
                >
                  Back to Settings
                </a>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
