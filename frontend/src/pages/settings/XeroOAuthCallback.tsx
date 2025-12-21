import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useXeroCallback } from '@/hooks/useXeroIntegration'
import { Check, X, Loader2 } from 'lucide-react'

export default function XeroOAuthCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { handleCallback, isProcessing, error } = useXeroCallback()
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const processCallback = async () => {
      const code = searchParams.get('code')
      const state = searchParams.get('state')
      const errorParam = searchParams.get('error')

      if (errorParam) {
        // User denied access or error occurred
        if (window.opener) {
          window.opener.postMessage({ type: 'xero_oauth_error', error: errorParam }, '*')
          window.close()
        } else {
          navigate('/dashboard/settings/integrations')
        }
        return
      }

      if (!code || !state) {
        if (window.opener) {
          window.opener.postMessage({ type: 'xero_oauth_error', error: 'Missing parameters' }, '*')
          window.close()
        } else {
          navigate('/dashboard/settings/integrations')
        }
        return
      }

      try {
        await handleCallback(code, state)
        setSuccess(true)

        // Notify parent window and close popup
        if (window.opener) {
          window.opener.postMessage({ type: 'xero_oauth_success' }, '*')
          setTimeout(() => window.close(), 1500)
        } else {
          // Not in popup, redirect to settings
          setTimeout(() => navigate('/dashboard/settings/integrations'), 1500)
        }
      } catch {
        // Error handled in hook
        if (window.opener) {
          window.opener.postMessage({ type: 'xero_oauth_error', error: 'Failed to connect' }, '*')
          setTimeout(() => window.close(), 3000)
        }
      }
    }

    processCallback()
  }, [searchParams, handleCallback, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          {isProcessing && (
            <>
              <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Connecting to Xero...
              </h2>
              <p className="text-gray-500">Please wait while we complete the connection.</p>
            </>
          )}

          {success && (
            <>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Successfully Connected!
              </h2>
              <p className="text-gray-500">Your Xero account has been connected.</p>
              <p className="text-sm text-gray-400 mt-2">This window will close automatically...</p>
            </>
          )}

          {error && (
            <>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="h-6 w-6 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Connection Failed
              </h2>
              <p className="text-gray-500 mb-4">{error}</p>
              <button
                onClick={() => window.close()}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Close Window
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
