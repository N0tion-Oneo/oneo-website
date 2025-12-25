import { CheckCircle, ArrowRight, ArrowLeft, Briefcase, Building2, Calendar, Sparkles } from 'lucide-react'

interface CompletionStepProps {
  onComplete: () => void
  onBack?: () => void
  previewMode?: boolean
}

export function CompletionStep({ onComplete, onBack, previewMode = false }: CompletionStepProps) {
  return (
    <div className="py-4">
      {/* Success Animation */}
      <div className="text-center mb-6">
        <div className="relative inline-block">
          <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-white" />
          </div>
        </div>

        <h2 className="text-xl font-semibold text-gray-900 mt-4 mb-2">You're all set!</h2>
        <p className="text-[13px] text-gray-500 max-w-sm mx-auto">
          Your account is ready. Start exploring your dashboard, post jobs, and find great candidates.
        </p>
      </div>

      {/* What's Next Card */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
        <h3 className="text-[13px] font-medium text-gray-900 mb-3">What's next?</h3>
        <div className="space-y-2">
          <div className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Briefcase className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-gray-900">Post your first job listing</p>
              <p className="text-[12px] text-gray-500">Start attracting top talent immediately</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Building2 className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-gray-900">Complete your company profile</p>
              <p className="text-[12px] text-gray-500">Help candidates learn more about you</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-gray-900">Schedule a call with your account manager</p>
              <p className="text-[12px] text-gray-500">Get personalized support and guidance</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-3">
        {previewMode && onBack && (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-gray-700 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Steps
          </button>
        )}
        <button
          onClick={onComplete}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          {previewMode ? 'Exit Preview' : 'Go to Dashboard'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
