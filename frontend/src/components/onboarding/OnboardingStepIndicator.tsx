import { Check, Building2, CreditCard, FileText, Users, Calendar } from 'lucide-react'
import type { OnboardingStep } from '@/hooks/useOnboarding'

interface StepConfig {
  id: OnboardingStep
  label: string
  shortLabel: string
  required: boolean
  icon: React.ElementType
}

const STEPS: StepConfig[] = [
  { id: 'contract', label: 'Service Agreement', shortLabel: 'Service', required: true, icon: FileText },
  { id: 'profile', label: 'Company Profile', shortLabel: 'Profile', required: true, icon: Building2 },
  { id: 'billing', label: 'Billing Info', shortLabel: 'Billing', required: true, icon: CreditCard },
  { id: 'team', label: 'Invite Team', shortLabel: 'Team', required: false, icon: Users },
  { id: 'booking', label: 'Book a Call', shortLabel: 'Booking', required: false, icon: Calendar },
]

interface OnboardingStepIndicatorProps {
  currentStep: OnboardingStep
  stepsCompleted: Record<string, boolean>
  onStepClick?: (step: OnboardingStep) => void
  isClickable?: boolean
}

export function OnboardingStepIndicator({
  currentStep,
  stepsCompleted,
  onStepClick,
  isClickable = false,
}: OnboardingStepIndicatorProps) {
  return (
    <nav aria-label="Progress" className="flex justify-center">
      <div className="inline-flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
        {STEPS.map((step) => {
          const isCompleted = stepsCompleted[step.id]
          const isCurrent = step.id === currentStep
          const canClick = isClickable && onStepClick
          const Icon = step.icon

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => canClick && onStepClick(step.id)}
              disabled={!canClick}
              className={`relative flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-md transition-all ${
                isCurrent
                  ? 'bg-white text-gray-900 shadow-sm'
                  : isCompleted
                  ? 'text-green-700 hover:bg-white/50'
                  : 'text-gray-500 hover:bg-white/50'
              } ${canClick ? 'cursor-pointer' : 'cursor-default'}`}
            >
              {isCompleted ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Icon className={`w-4 h-4 ${isCurrent ? 'text-gray-700' : 'text-gray-400'}`} />
              )}
              <span className="hidden sm:inline">{step.shortLabel}</span>
              {!step.required && (
                <span className="hidden md:inline text-[10px] text-gray-400 ml-0.5">(opt)</span>
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export { STEPS }
export type { StepConfig }
