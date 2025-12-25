import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOnboarding, type OnboardingStep } from '@/hooks/useOnboarding'
import type {
  OnboardingProfileStepData,
  OnboardingBillingStepData,
  OnboardingContractStepData,
} from '@/services/api'
import { OnboardingStepIndicator, STEPS } from './OnboardingStepIndicator'
import { ProfileStep } from './steps/ProfileStep'
import { BillingStep } from './steps/BillingStep'
import { ContractStep } from './steps/ContractStep'
import { TeamInviteStep } from './steps/TeamInviteStep'
import { BookingStep } from './steps/BookingStep'
import { CompletionStep } from './steps/CompletionStep'
import { Eye, X, Building2, Users, Calendar, CheckCircle2, ArrowRight, ArrowLeft, Loader2, CreditCard, FileText } from 'lucide-react'

interface OnboardingWizardProps {
  onComplete: () => void
  previewMode?: boolean
}

// Step info for the left panel
const STEP_INFO: Record<OnboardingStep, { title: string; subtitle: string; description: string; icon: React.ElementType; features: string[]; isOptional: boolean }> = {
  profile: {
    title: 'Company Profile',
    subtitle: 'Tell us about your company',
    description: 'Help us personalize your hiring experience',
    icon: Building2,
    features: [
      'Customized candidate matching',
      'Branded job listings',
      'Industry-specific insights',
    ],
    isOptional: false,
  },
  billing: {
    title: 'Billing Information',
    subtitle: 'Set up billing',
    description: 'Configure your invoicing details',
    icon: CreditCard,
    features: [
      'Automated invoicing',
      'Multiple payment methods',
      'Detailed billing history',
    ],
    isOptional: false,
  },
  contract: {
    title: 'Service Agreement',
    subtitle: 'Choose your service',
    description: 'Select the plan that fits your hiring needs',
    icon: FileText,
    features: [
      'Flexible pricing options',
      'No hidden fees',
      'Cancel anytime',
    ],
    isOptional: false,
  },
  team: {
    title: 'Invite Team',
    subtitle: 'Build your team',
    description: 'Invite colleagues to collaborate on hiring',
    icon: Users,
    features: [
      'Role-based permissions',
      'Collaborative workflows',
      'Real-time notifications',
    ],
    isOptional: true,
  },
  booking: {
    title: 'Book a Call',
    subtitle: 'Schedule your onboarding',
    description: 'Meet with your account manager',
    icon: Calendar,
    features: [
      'Personalized onboarding',
      'Review your hiring needs',
      'Get platform guidance',
    ],
    isOptional: true,
  },
}

export function OnboardingWizard({ onComplete, previewMode = false }: OnboardingWizardProps) {
  const navigate = useNavigate()
  const { status, isLoading, isSubmitting, completeStep, skipStep, error } = useOnboarding()
  const [showCompletion, setShowCompletion] = useState(false)

  // In preview mode, allow manual step navigation
  const [previewStep, setPreviewStep] = useState<OnboardingStep>('contract')

  // Allow navigating back to completed steps (null means use server's current_step)
  const [overrideStep, setOverrideStep] = useState<OnboardingStep | null>(null)

  // Form ref for triggering submission from left panel - must be before any early returns
  const formRef = useRef<HTMLFormElement>(null)

  // Get current step - use previewStep in preview mode, or overrideStep if set, otherwise server's current_step
  const serverCurrentStep = (status?.current_step || 'contract') as OnboardingStep
  const currentStep = previewMode ? previewStep : (overrideStep || serverCurrentStep)
  const stepsCompleted = status?.steps_completed || {}
  const contractOffer = status?.contract_offer || null

  // Calculate progress
  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep)
  const completedCount = Object.values(stepsCompleted).filter(Boolean).length
  const progressPercentage = showCompletion ? 100 : Math.round((completedCount / STEPS.length) * 100)

  // Handle step click in preview mode
  const handleStepClick = (step: OnboardingStep) => {
    if (previewMode) {
      setPreviewStep(step)
      setShowCompletion(false)
    }
  }

  // Handle step submission
  const handleProfileSubmit = async (data: OnboardingProfileStepData) => {
    const result = await completeStep('profile', data)
    setOverrideStep(null) // Reset to follow server's next step
    if (result?.is_complete) {
      setShowCompletion(true)
    }
  }

  const handleBillingSubmit = async (data: OnboardingBillingStepData) => {
    const result = await completeStep('billing', data)
    setOverrideStep(null) // Reset to follow server's next step
    if (result?.is_complete) {
      setShowCompletion(true)
    }
  }

  const handleContractSubmit = async (data: OnboardingContractStepData) => {
    const result = await completeStep('contract', data)
    setOverrideStep(null) // Reset to follow server's next step
    if (result?.is_complete) {
      setShowCompletion(true)
    }
  }

  const handleTeamSubmit = async () => {
    const result = await completeStep('team', {})
    setOverrideStep(null) // Reset to follow server's next step
    if (result?.is_complete) {
      setShowCompletion(true)
    }
  }

  const handleTeamSkip = async () => {
    const result = await skipStep('team')
    setOverrideStep(null) // Reset to follow server's next step
    if (result?.is_complete) {
      setShowCompletion(true)
    }
  }

  const handleBookingSubmit = async () => {
    const result = await completeStep('booking', {})
    setOverrideStep(null) // Reset to follow server's next step
    if (result?.is_complete) {
      setShowCompletion(true)
      // Navigate to dashboard after short delay
      setTimeout(() => {
        navigate('/dashboard/jobs/new')
      }, 500)
    }
  }

  const handleBookingSkip = async () => {
    const result = await skipStep('booking')
    setOverrideStep(null) // Reset to follow server's next step
    if (result?.is_complete) {
      setShowCompletion(true)
    }
  }

  const handleComplete = () => {
    onComplete()
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[300] flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-gray-700 border-t-white rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-sm text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Render current step content
  const renderStepContent = () => {
    if (showCompletion) {
      return (
        <CompletionStep
          onComplete={handleComplete}
          onBack={() => setShowCompletion(false)}
          previewMode={previewMode}
        />
      )
    }

    switch (currentStep) {
      case 'profile':
        return <ProfileStep onSubmit={handleProfileSubmit} isSubmitting={isSubmitting} previewMode={previewMode} formRef={formRef} />
      case 'billing':
        return <BillingStep onSubmit={handleBillingSubmit} isSubmitting={isSubmitting} previewMode={previewMode} formRef={formRef} />
      case 'contract':
        return (
          <ContractStep
            contractOffer={contractOffer}
            onSubmit={handleContractSubmit}
            isSubmitting={isSubmitting}
            previewMode={previewMode}
            formRef={formRef}
          />
        )
      case 'team':
        return (
          <TeamInviteStep
            onSubmit={handleTeamSubmit}
            onSkip={handleTeamSkip}
            isSubmitting={isSubmitting}
            previewMode={previewMode}
            formRef={formRef}
          />
        )
      case 'booking':
        return (
          <BookingStep
            inviter={status?.inviter || null}
            onSubmit={handleBookingSubmit}
            onSkip={handleBookingSkip}
            isSubmitting={isSubmitting}
            previewMode={previewMode}
            formRef={formRef}
          />
        )
      default:
        return <CompletionStep onComplete={handleComplete} />
    }
  }

  const stepInfo = STEP_INFO[currentStep]
  const StepIcon = stepInfo.icon

  const handleContinueClick = () => {
    if (previewMode) {
      // In preview mode, just navigate to next step
      const nextIndex = currentStepIndex + 1
      if (nextIndex < STEPS.length) {
        setPreviewStep(STEPS[nextIndex].id)
      } else {
        setShowCompletion(true)
      }
      return
    }
    formRef.current?.requestSubmit()
  }

  const handleSkipClick = () => {
    if (previewMode) {
      // In preview mode, just navigate to next step
      const nextIndex = currentStepIndex + 1
      if (nextIndex < STEPS.length) {
        setPreviewStep(STEPS[nextIndex].id)
      } else {
        setShowCompletion(true)
      }
      return
    }
    if (currentStep === 'team') {
      handleTeamSkip()
    } else if (currentStep === 'booking') {
      handleBookingSkip()
    }
  }

  const handleBackClick = () => {
    if (showCompletion) {
      setShowCompletion(false)
      return
    }
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      if (previewMode) {
        setPreviewStep(STEPS[prevIndex].id)
      } else {
        setOverrideStep(STEPS[prevIndex].id)
      }
    }
  }

  const canGoBack = currentStepIndex > 0 || showCompletion

  return (
    <div className="fixed inset-0 z-[300] flex bg-white">
      {/* Left Panel - Branding & Progress */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[540px] flex-col bg-gray-900 text-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        </div>

        {/* Content */}
        <div className="relative flex-1 flex flex-col p-8 xl:p-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
              <span className="text-gray-900 font-bold text-lg">O</span>
            </div>
            <span className="text-xl font-semibold">Oneo</span>
          </div>

          {/* Dynamic Step Info */}
          {!showCompletion && (
            <div className="flex-1 flex flex-col">
              {/* Step Counter */}
              <p className="text-gray-500 text-sm mb-4">Step {currentStepIndex + 1} of {STEPS.length}</p>

              {/* Stage Name & Icon */}
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                  <StepIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl xl:text-3xl font-semibold">{stepInfo.title}</h1>
                  {stepInfo.isOptional && (
                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Optional</span>
                  )}
                </div>
              </div>

              {/* Subtitle */}
              <h2 className="text-lg text-gray-300 mb-2">{stepInfo.subtitle}</h2>

              {/* Description */}
              <p className="text-gray-500 mb-8">{stepInfo.description}</p>

              {/* Features */}
              <div className="space-y-3 mb-8">
                {stepInfo.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-green-400" />
                    </div>
                    <span className="text-gray-400 text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="mt-auto space-y-3">
                <div className="flex items-center gap-3">
                  {canGoBack && (
                    <button
                      type="button"
                      onClick={handleBackClick}
                      disabled={isSubmitting}
                      className="p-3 text-gray-500 hover:text-white hover:bg-white/10 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleContinueClick}
                    disabled={isSubmitting}
                    className="flex-1 py-3 px-4 bg-white text-gray-900 text-sm font-semibold rounded-xl hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
                {stepInfo.isOptional && (
                  <button
                    type="button"
                    onClick={handleSkipClick}
                    disabled={isSubmitting}
                    className="w-full py-3 px-4 text-gray-400 text-sm font-medium rounded-xl hover:text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Skip for now
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Completion State */}
          {showCompletion && (
            <div className="flex-1 flex flex-col">
              <div className="flex-1 flex flex-col justify-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                </div>
                <h1 className="text-2xl xl:text-3xl font-semibold mb-3">All set!</h1>
                <p className="text-gray-400 mb-8">Your account is ready to go. Start hiring top talent today.</p>
              </div>

              {/* Completion Button */}
              <button
                type="button"
                onClick={handleComplete}
                className="w-full py-3 px-4 bg-white text-gray-900 text-sm font-semibold rounded-xl hover:bg-gray-100 flex items-center justify-center gap-2 transition-colors"
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Progress Bar */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-500">Progress</span>
              <span className="text-white font-medium">{progressPercentage}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form Content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-gray-200">
          {/* Preview Mode Banner with Navigation */}
          {previewMode && (
            <div className="px-6 py-3 bg-amber-50 border-b border-amber-200">
              <div className="flex items-center justify-between max-w-4xl mx-auto">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-amber-600" />
                  <span className="text-[13px] text-amber-800 font-medium">Preview Mode</span>
                </div>
                <div className="flex items-center gap-1">
                  {STEPS.map((step) => (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => {
                        setShowCompletion(false)
                        setPreviewStep(step.id)
                      }}
                      className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
                        currentStep === step.id && !showCompletion
                          ? 'bg-amber-200 text-amber-900'
                          : 'text-amber-700 hover:bg-amber-100'
                      }`}
                    >
                      {step.shortLabel}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setShowCompletion(true)}
                    className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
                      showCompletion
                        ? 'bg-amber-200 text-amber-900'
                        : 'text-amber-700 hover:bg-amber-100'
                    }`}
                  >
                    Complete
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mobile header with logo and close button */}
          <div className="px-6 py-4 lg:hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">O</span>
                </div>
                <span className="font-semibold text-gray-900">Oneo</span>
              </div>
              {previewMode && (
                <button
                  onClick={onComplete}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Close button for desktop preview */}
          {previewMode && (
            <button
              onClick={onComplete}
              className="hidden lg:flex absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 py-8">
            {error && (
              <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-[13px] text-red-700">{error}</p>
              </div>
            )}
            {renderStepContent()}
          </div>
        </div>

        {/* Mobile Progress & Navigation */}
        <div className="lg:hidden flex-shrink-0 border-t border-gray-200 bg-gray-50">
          {/* Progress bar */}
          <div className="px-6 pt-4 pb-2">
            <div className="max-w-xl mx-auto">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-500">Progress</span>
                <span className="text-gray-900 font-medium">{progressPercentage}%</span>
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gray-900 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Mobile action buttons */}
          {!showCompletion && (
            <div className="px-6 pb-4 pt-2">
              <div className="max-w-xl mx-auto space-y-2">
                <div className="flex items-center gap-3">
                  {canGoBack && (
                    <button
                      type="button"
                      onClick={handleBackClick}
                      disabled={isSubmitting}
                      className="p-3 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded-xl border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleContinueClick}
                    disabled={isSubmitting}
                    className="flex-1 py-3 px-4 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
                {stepInfo.isOptional && (
                  <button
                    type="button"
                    onClick={handleSkipClick}
                    disabled={isSubmitting}
                    className="w-full py-3 px-4 text-gray-500 text-sm font-medium rounded-xl hover:text-gray-900 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Skip for now
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Mobile completion button */}
          {showCompletion && (
            <div className="px-6 pb-4 pt-2">
              <div className="max-w-xl mx-auto">
                <button
                  type="button"
                  onClick={handleComplete}
                  className="w-full py-3 px-4 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 flex items-center justify-center gap-2 transition-colors"
                >
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
