import { type RefObject } from 'react'
import { Loader2, ArrowRight, Zap, Users, BarChart3 } from 'lucide-react'

interface PostJobStepProps {
  onSubmit: () => Promise<void>
  onSkip: () => Promise<void>
  isSubmitting: boolean
  previewMode?: boolean
  formRef?: RefObject<HTMLFormElement | null>
}

export function PostJobStep({ onSubmit, onSkip, isSubmitting, previewMode = false, formRef }: PostJobStepProps) {
  const handlePostJob = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (previewMode) return
    // Mark step as complete
    await onSubmit()
    // Navigation to job creation will happen in parent after completion
  }

  return (
    <form ref={formRef} onSubmit={handlePostJob} className="space-y-6">
      {/* Benefits Card */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <h3 className="text-[13px] font-medium text-gray-900 mb-3">Why post a job now?</h3>
        <div className="space-y-2">
          <div className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-gray-900">Immediate Visibility</p>
              <p className="text-[12px] text-gray-500">Get instant access to our curated talent pool</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-gray-900">Active Sourcing</p>
              <p className="text-[12px] text-gray-500">Our team will start sourcing candidates right away</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-gray-900">Track Progress</p>
              <p className="text-[12px] text-gray-500">Manage applications through our intuitive pipeline</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Buttons - Hidden on desktop where left panel has buttons */}
      <div className="pt-2 flex gap-3 lg:hidden">
        <button
          type="button"
          onClick={onSkip}
          disabled={isSubmitting || previewMode}
          className="flex-1 py-2.5 px-4 text-gray-700 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Skip for now
        </button>
        <button
          type="submit"
          disabled={isSubmitting || previewMode}
          className="flex-1 py-2.5 px-4 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Post a Job
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </form>
  )
}
