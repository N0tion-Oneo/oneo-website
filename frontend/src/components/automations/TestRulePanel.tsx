import { useState } from 'react'
import {
  Play,
  Loader2,
  ChevronDown,
  Send,
  Bell,
  Pencil,
  FileText,
  Check,
  AlertCircle,
  RefreshCw,
  Globe,
  User,
  Mail,
  ArrowRight,
} from 'lucide-react'
import { SampleRecord, TestResult } from '@/hooks/useAutomations'

interface TestRulePanelProps {
  triggerModel: string | null
  sampleRecords: SampleRecord[]
  isLoadingRecords: boolean
  isTesting: boolean
  testResult: TestResult | undefined
  onTest: (recordId?: string, dryRun?: boolean) => Promise<TestResult | undefined>
  onRefreshRecords: () => void
  onReset: () => void
}

export default function TestRulePanel({
  triggerModel,
  sampleRecords,
  isLoadingRecords,
  isTesting,
  testResult,
  onTest,
  onRefreshRecords,
  onReset,
}: TestRulePanelProps) {
  const [selectedRecordId, setSelectedRecordId] = useState<string>('')
  const [isExpanded, setIsExpanded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedRecord = sampleRecords.find(r => r.id === selectedRecordId)

  const handleTest = async (dryRun: boolean = true) => {
    setError(null)
    console.log('Starting test...', { triggerModel, selectedRecordId, dryRun })
    try {
      const result = await onTest(selectedRecordId || undefined, dryRun)
      console.log('Test result:', result)
      if (result) {
        setIsExpanded(true)
      } else {
        setError('No result returned. Make sure the rule is saved first.')
      }
    } catch (err) {
      console.error('Test failed:', err)
      setError(err instanceof Error ? err.message : 'Test failed. Check the console for details.')
    }
  }

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'send_webhook':
        return <Send className="w-4 h-4" />
      case 'send_notification':
        return <Bell className="w-4 h-4" />
      case 'update_field':
        return <Pencil className="w-4 h-4" />
      case 'create_activity':
        return <FileText className="w-4 h-4" />
      default:
        return null
    }
  }

  const getActionLabel = (actionType: string) => {
    switch (actionType) {
      case 'send_webhook':
        return 'Webhook Request'
      case 'send_notification':
        return 'Notification'
      case 'update_field':
        return 'Field Update'
      case 'create_activity':
        return 'Activity Log'
      default:
        return 'Action'
    }
  }

  const renderPreview = () => {
    if (!testResult?.preview) return null

    const { preview } = testResult

    switch (preview.action_type) {
      case 'send_webhook':
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-[11px] font-mono font-medium">
                {preview.method || 'POST'}
              </span>
              <span className="text-[12px] font-mono text-gray-700 truncate flex-1">
                {preview.url || '(no URL configured)'}
              </span>
            </div>
            {preview.headers && Object.keys(preview.headers).length > 0 && (
              <div>
                <div className="text-[11px] font-medium text-gray-500 mb-1">Headers</div>
                <div className="bg-gray-800 rounded-lg p-3 overflow-x-auto">
                  <pre className="text-[11px] text-gray-300 font-mono">
                    {JSON.stringify(preview.headers, null, 2)}
                  </pre>
                </div>
              </div>
            )}
            <div>
              <div className="text-[11px] font-medium text-gray-500 mb-1">Payload</div>
              <div className="bg-gray-800 rounded-lg p-3 overflow-x-auto">
                <pre className="text-[11px] text-green-400 font-mono">
                  {JSON.stringify(preview.payload, null, 2) || '{}'}
                </pre>
              </div>
            </div>
          </div>
        )

      case 'send_notification':
        const showInApp = preview.channel === 'in_app' || preview.channel === 'both'
        const showEmail = preview.channel === 'email' || preview.channel === 'both'

        return (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-[12px]">
                {preview.channel === 'both' ? (
                  <>
                    <Bell className="w-3.5 h-3.5 text-gray-500" />
                    <span>+</span>
                    <Mail className="w-3.5 h-3.5 text-gray-500" />
                  </>
                ) : preview.channel === 'email' ? (
                  <Mail className="w-3.5 h-3.5 text-gray-500" />
                ) : (
                  <Bell className="w-3.5 h-3.5 text-gray-500" />
                )}
                <span className="capitalize">{preview.channel === 'both' ? 'Email + In-App' : preview.channel}</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
              <div className="flex items-center gap-1.5 text-[12px]">
                <User className="w-3.5 h-3.5 text-gray-500" />
                <span className="capitalize">{preview.recipient_type?.replace(/_/g, ' ')}</span>
              </div>
              {preview.using_template && (
                <span className="ml-auto px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-medium rounded">
                  {preview.template_name}
                </span>
              )}
            </div>

            {/* In-App Preview */}
            {showInApp && (
              <div>
                <div className="text-[11px] font-medium text-gray-500 mb-1.5 flex items-center gap-1.5">
                  <Bell className="w-3 h-3" />
                  In-App Notification
                </div>
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-3 py-2.5 border-b border-gray-200 bg-gray-50">
                    <div className="text-[13px] font-medium text-gray-900">
                      {preview.title || '(no title)'}
                    </div>
                  </div>
                  <div className="px-3 py-2.5">
                    <div className="text-[12px] text-gray-700 whitespace-pre-wrap">
                      {preview.body || '(no body)'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Email Preview */}
            {showEmail && (
              <div>
                <div className="text-[11px] font-medium text-gray-500 mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3 h-3" />
                  Email
                </div>
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-3 py-2.5 border-b border-gray-200 bg-gray-50">
                    <div className="text-[11px] text-gray-500 mb-0.5">Subject</div>
                    <div className="text-[13px] font-medium text-gray-900">
                      {preview.email_subject || preview.title || '(no subject)'}
                    </div>
                  </div>
                  <div className="px-3 py-2.5">
                    <div className="text-[11px] text-gray-500 mb-0.5">Body</div>
                    <div className="text-[12px] text-gray-700 whitespace-pre-wrap max-h-40 overflow-auto">
                      {preview.email_body || preview.body || '(no body)'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )

      case 'update_field':
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[12px]">
              <span className="text-gray-500">Target:</span>
              <span className="font-medium text-gray-700">
                {preview.target === 'related'
                  ? `Related ${preview.related_model} (via ${preview.relation_field})`
                  : 'Same record'}
              </span>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="text-[11px] text-gray-500 mb-0.5">Field</div>
                  <div className="font-mono text-[12px] font-medium text-gray-900">{preview.field || '(not set)'}</div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
                <div className="flex-1">
                  <div className="text-[11px] text-gray-500 mb-0.5">New Value</div>
                  <div className="font-mono text-[12px] font-medium text-green-600">
                    {String(preview.value) || '(empty)'}
                  </div>
                </div>
              </div>
              {preview.value_type && preview.value_type !== 'static' && (
                <div className="mt-2 pt-2 border-t border-gray-100 text-[11px] text-gray-500">
                  Value type: <span className="font-medium">{preview.value_type}</span>
                </div>
              )}
            </div>
          </div>
        )

      case 'create_activity':
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-[11px] font-medium capitalize">
                {preview.activity_type}
              </span>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="text-[12px] text-gray-700 whitespace-pre-wrap">
                {preview.content || '(no content)'}
              </div>
            </div>
          </div>
        )

      default:
        return (
          <div className="text-[12px] text-gray-500">
            Unknown action type: {preview.action_type}
          </div>
        )
    }
  }

  const renderExecutionResult = (result: Record<string, unknown>, actionType: string) => {
    // Handle notification results with the new format
    if (actionType === 'send_notification') {
      const status = result.status as string
      const notificationsCreated = result.notifications_created as number | undefined
      const emailsSent = result.emails_sent as number | undefined
      const emailsFailed = result.emails_failed as number | undefined
      const recipientEmails = result.recipient_emails as string[] | undefined
      const channel = result.channel as string | undefined

      if (status === 'no_recipients') {
        return (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertCircle className="w-4 h-4" />
              <span className="text-[12px] font-medium">No recipients found</span>
            </div>
            <p className="text-[11px] text-amber-700 mt-1">
              The recipient type "{String(result.recipient_type)}" did not resolve to any users for this record.
            </p>
          </div>
        )
      }

      if (status === 'sent') {
        return (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
            <div className="flex items-center gap-2 text-blue-800">
              <Check className="w-4 h-4" />
              <span className="text-[12px] font-medium">Notification Sent</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white rounded-lg p-2 text-center">
                <div className="text-lg font-semibold text-blue-700">{notificationsCreated ?? 0}</div>
                <div className="text-[10px] text-gray-500 font-medium">Created</div>
              </div>
              <div className="bg-white rounded-lg p-2 text-center">
                <div className="text-lg font-semibold text-green-600">{emailsSent ?? 0}</div>
                <div className="text-[10px] text-gray-500 font-medium">Emails Sent</div>
              </div>
              {(emailsFailed ?? 0) > 0 && (
                <div className="bg-white rounded-lg p-2 text-center">
                  <div className="text-lg font-semibold text-red-600">{emailsFailed}</div>
                  <div className="text-[10px] text-gray-500 font-medium">Failed</div>
                </div>
              )}
            </div>

            {recipientEmails && recipientEmails.length > 0 && (
              <div>
                <div className="text-[11px] text-blue-600 font-medium mb-1">
                  Recipients ({channel === 'email' ? 'Email' : channel === 'in_app' ? 'In-App' : 'Email + In-App'})
                </div>
                <div className="flex flex-wrap gap-1">
                  {recipientEmails.map((email, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 bg-white rounded text-[11px] text-gray-700">
                      <Mail className="w-3 h-3" />
                      {email}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      }
    }

    // Handle webhook results
    if (actionType === 'send_webhook') {
      const statusCode = result.status_code as number | undefined
      const responseTime = result.response_time_ms as number | undefined

      if (statusCode !== undefined) {
        const isSuccess = statusCode >= 200 && statusCode < 300
        return (
          <div className={`p-3 rounded-lg border ${isSuccess ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              {isSuccess ? (
                <Check className="w-4 h-4 text-blue-700" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-700" />
              )}
              <span className={`text-[12px] font-medium ${isSuccess ? 'text-blue-800' : 'text-red-800'}`}>
                Webhook {isSuccess ? 'Delivered' : 'Failed'}
              </span>
              <span className={`ml-auto px-2 py-0.5 rounded text-[11px] font-mono ${isSuccess ? 'bg-blue-200 text-blue-800' : 'bg-red-200 text-red-800'}`}>
                {statusCode}
              </span>
            </div>
            {responseTime !== undefined && (
              <div className="text-[11px] text-gray-500">
                Response time: {responseTime}ms
              </div>
            )}
          </div>
        )
      }
    }

    // Handle field update results
    if (actionType === 'update_field' && result.status === 'updated') {
      return (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 text-blue-800">
            <Check className="w-4 h-4" />
            <span className="text-[12px] font-medium">Field Updated</span>
          </div>
          {result.field !== undefined && (
            <div className="text-[11px] text-blue-700 mt-1">
              <span className="font-mono">{String(result.field)}</span> = <span className="font-mono">{String(result.new_value ?? '')}</span>
            </div>
          )}
        </div>
      )
    }

    // Handle activity log results
    if (actionType === 'create_activity' && result.status === 'created') {
      return (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 text-blue-800">
            <Check className="w-4 h-4" />
            <span className="text-[12px] font-medium">Activity Logged</span>
          </div>
          {result.activity_id !== undefined && (
            <div className="text-[11px] text-blue-700 mt-1">
              Activity ID: <span className="font-mono">{String(result.activity_id)}</span>
            </div>
          )}
        </div>
      )
    }

    // Fallback: show raw JSON for unhandled formats
    return (
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="text-[11px] text-blue-600 font-medium mb-1">Execution Result</div>
        <pre className="text-[11px] text-blue-800 overflow-x-auto font-mono">
          {JSON.stringify(result, null, 2)}
        </pre>
      </div>
    )
  }

  if (!triggerModel) {
    return (
      <div className="bg-gray-50 rounded-lg border border-dashed border-gray-300 p-6 text-center">
        <Globe className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-[13px] text-gray-500">
          Select a trigger model to test this rule
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] font-semibold text-gray-900 flex items-center gap-2">
            <Play className="w-4 h-4 text-gray-500" />
            Test Rule
          </h3>
          {testResult && (
            <button
              onClick={() => {
                onReset()
                setIsExpanded(false)
              }}
              className="text-[11px] text-gray-500 hover:text-gray-700"
            >
              Reset
            </button>
          )}
        </div>

        {/* Record Selector */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <select
              value={selectedRecordId}
              onChange={(e) => setSelectedRecordId(e.target.value)}
              disabled={isLoadingRecords}
              className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent appearance-none bg-white"
            >
              <option value="">
                {isLoadingRecords ? 'Loading records...' : 'Select a sample record (optional)'}
              </option>
              {sampleRecords.map((record) => (
                <option key={record.id} value={record.id}>
                  {record.display}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <button
            onClick={onRefreshRecords}
            disabled={isLoadingRecords}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh records"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingRecords ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => handleTest(true)}
            disabled={isTesting}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-[13px] font-medium transition-colors"
            title="Preview only - no action will be executed"
          >
            {isTesting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Preview
          </button>
          <button
            onClick={() => handleTest(false)}
            disabled={isTesting || !selectedRecordId}
            className="flex items-center gap-2 px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 text-[13px] font-medium transition-colors"
            title="Execute the action for real"
          >
            {isTesting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Run Live
          </button>
        </div>

        {/* Selected Record Info */}
        {selectedRecord && (
          <div className="mt-3 p-2.5 bg-gray-50 rounded-lg">
            <div className="text-[11px] text-gray-500 mb-0.5">Testing with:</div>
            <div className="text-[12px] font-medium text-gray-900">{selectedRecord.display}</div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="text-[12px] text-red-700">{error}</div>
          </div>
        )}
      </div>

      {/* Results */}
      {testResult && (
        <div className="p-4">
          {/* Status Banner */}
          <div
            className={`flex items-center gap-2 p-3 rounded-lg mb-4 ${
              testResult.status === 'success'
                ? testResult.executed
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-gray-50 text-gray-700 border border-gray-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {testResult.status === 'success' ? (
              <Check className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span className="text-[12px] font-medium">
              {testResult.status === 'success'
                ? testResult.executed
                  ? 'Action executed successfully!'
                  : 'Preview generated'
                : 'Test failed'}
            </span>
            {testResult.dry_run && (
              <span className="ml-auto text-[11px] opacity-75">(Preview only)</span>
            )}
            {testResult.executed && (
              <span className="ml-auto text-[11px] font-medium">(Live execution)</span>
            )}
          </div>

          {/* Execution Result */}
          {testResult.executed && testResult.execution_result && typeof testResult.execution_result === 'object' && (
            <div className="mb-4">
              {renderExecutionResult(testResult.execution_result as Record<string, unknown>, testResult.preview.action_type)}
            </div>
          )}

          {/* Preview Toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              {getActionIcon(testResult.preview.action_type)}
              <span className="text-[12px] font-medium text-gray-700">
                {getActionLabel(testResult.preview.action_type)} Preview
              </span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-gray-500 transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Preview Content */}
          {isExpanded && (
            <div className="mt-3 p-4 bg-gray-50 rounded-lg">
              {renderPreview()}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
