import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@/types'
import { useDashboardSettings } from '@/hooks'
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react'

export default function DashboardSettingsPage() {
  const { user } = useAuth()
  const { settings, isLoading, error, updateSettings, isUpdating } = useDashboardSettings()

  const [daysWithoutContact, setDaysWithoutContact] = useState(7)
  const [daysStuckInStage, setDaysStuckInStage] = useState(14)
  const [daysBeforeInterviewPrep, setDaysBeforeInterviewPrep] = useState(2)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState('')

  // Sync local state with fetched settings
  useEffect(() => {
    if (settings) {
      setDaysWithoutContact(settings.days_without_contact)
      setDaysStuckInStage(settings.days_stuck_in_stage)
      setDaysBeforeInterviewPrep(settings.days_before_interview_prep)
    }
  }, [settings])

  // Permission check - only admins can access this page
  if (user?.role !== UserRole.ADMIN) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">You don't have permission to view this page.</p>
      </div>
    )
  }

  const handleSave = async () => {
    setSaveSuccess(false)
    setSaveError('')
    try {
      await updateSettings({
        days_without_contact: daysWithoutContact,
        days_stuck_in_stage: daysStuckInStage,
        days_before_interview_prep: daysBeforeInterviewPrep,
      })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch {
      setSaveError('Failed to save settings')
    }
  }

  const hasChanges = settings && (
    daysWithoutContact !== settings.days_without_contact ||
    daysStuckInStage !== settings.days_stuck_in_stage ||
    daysBeforeInterviewPrep !== settings.days_before_interview_prep
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        <AlertCircle className="w-5 h-5 mr-2" />
        {error}
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure thresholds for the recruiter dashboard alerts and notifications.
        </p>
      </div>

      {/* Success/Error Messages */}
      {saveSuccess && (
        <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-md flex items-center gap-2 text-green-700">
          <CheckCircle className="w-5 h-5" />
          <span className="text-sm">Settings saved successfully</span>
        </div>
      )}
      {saveError && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm">{saveError}</span>
        </div>
      )}

      {/* Settings Form */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Candidates Needing Attention</h2>
          <p className="text-sm text-gray-500 mt-1">
            Configure thresholds that determine when candidates appear in the "Needs Attention" section on the recruiter dashboard.
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Days Without Contact */}
          <div>
            <label htmlFor="daysWithoutContact" className="block text-sm font-medium text-gray-700 mb-1">
              Days without contact
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Candidates who haven't been contacted in this many days will appear in the "Not Contacted" section.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                id="daysWithoutContact"
                min={1}
                max={365}
                value={daysWithoutContact}
                onChange={(e) => setDaysWithoutContact(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
              <span className="text-sm text-gray-500">days</span>
            </div>
          </div>

          {/* Days Stuck in Stage */}
          <div>
            <label htmlFor="daysStuckInStage" className="block text-sm font-medium text-gray-700 mb-1">
              Days stuck in stage
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Candidates who have been in the same stage for this many days will appear in the "Stuck in Stage" section.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                id="daysStuckInStage"
                min={1}
                max={365}
                value={daysStuckInStage}
                onChange={(e) => setDaysStuckInStage(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
              <span className="text-sm text-gray-500">days</span>
            </div>
          </div>

          {/* Days Before Interview Prep */}
          <div>
            <label htmlFor="daysBeforeInterviewPrep" className="block text-sm font-medium text-gray-700 mb-1">
              Days before interview for prep
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Candidates with interviews scheduled within this many days will appear in the "Needs Interview Prep" section.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                id="daysBeforeInterviewPrep"
                min={1}
                max={30}
                value={daysBeforeInterviewPrep}
                onChange={(e) => setDaysBeforeInterviewPrep(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
              <span className="text-sm text-gray-500">days</span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {settings?.updated_at && (
              <>Last updated: {new Date(settings.updated_at).toLocaleString()}</>
            )}
          </p>
          <button
            onClick={handleSave}
            disabled={isUpdating || !hasChanges}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isUpdating && <Loader2 className="w-4 h-4 animate-spin" />}
            {isUpdating ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Help Text */}
      <p className="mt-4 text-xs text-gray-500">
        These settings apply globally to all recruiters in the system. Changes will take effect immediately.
      </p>
    </div>
  )
}
