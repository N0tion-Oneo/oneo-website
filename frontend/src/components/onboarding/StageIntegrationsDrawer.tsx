import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  X,
  Calendar,
  Wand2,
  Building2,
  Users,
  UserCircle,
  ChevronRight,
  Loader2,
  Link2,
  AlertCircle,
} from 'lucide-react'
import { getStageIntegrations } from '@/services/api'
import type { StageIntegration, OnboardingStage } from '@/types'

interface StageIntegrationsDrawerProps {
  stage: OnboardingStage
  onClose: () => void
}

const WIZARD_STEP_LABELS: Record<string, string> = {
  contract: 'Contract Step',
  profile: 'Profile Step',
  billing: 'Billing Step',
  team: 'Team Step',
  booking: 'Booking Step',
}

export function StageIntegrationsDrawer({ stage, onClose }: StageIntegrationsDrawerProps) {
  const [data, setData] = useState<StageIntegration | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsLoading(true)
    setError(null)
    getStageIntegrations(stage.id)
      .then(setData)
      .catch((err) => {
        console.error('Failed to fetch stage integrations:', err)
        setError('Failed to load integrations')
      })
      .finally(() => setIsLoading(false))
  }, [stage.id])

  const totalEntities =
    (data?.entity_counts.companies || 0) +
    (data?.entity_counts.leads || 0) +
    (data?.entity_counts.candidates || 0)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-[200] transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-[480px] max-w-full bg-white shadow-xl z-[201] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <span
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: stage.color }}
            />
            <div>
              <h2 className="text-[16px] font-semibold text-gray-900">{stage.name}</h2>
              <p className="text-[13px] text-gray-500 mt-0.5">Stage Integrations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <AlertCircle className="w-8 h-8 mb-2" />
              <p>{error}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Meeting Types Section */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <h3 className="text-[13px] font-semibold text-gray-900 uppercase tracking-wide">
                    Meeting Types
                  </h3>
                  {data?.meeting_types && data.meeting_types.length > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-gray-200 text-gray-600">
                      {data.meeting_types.length}
                    </span>
                  )}
                </div>
                {data?.meeting_types && data.meeting_types.length > 0 ? (
                  <div className="space-y-2">
                    {data.meeting_types.map((mt) => (
                      <Link
                        key={`${mt.id}-${mt.type}`}
                        to={`/dashboard/scheduling/meeting-types/${mt.id}`}
                        className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors group"
                      >
                        <div>
                          <p className="text-[13px] font-medium text-gray-900">{mt.name}</p>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            Target for {mt.type === 'authenticated' ? 'authenticated' : 'unauthenticated'} users
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-[13px] text-gray-500 italic">
                    No meeting types advance to this stage
                  </p>
                )}
              </section>

              {/* Wizard Step Section */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Wand2 className="w-4 h-4 text-gray-400" />
                  <h3 className="text-[13px] font-semibold text-gray-900 uppercase tracking-wide">
                    Wizard Step
                  </h3>
                </div>
                {data?.wizard_step ? (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-[13px] font-medium text-purple-900">
                      {WIZARD_STEP_LABELS[data.wizard_step] || data.wizard_step}
                    </p>
                    <p className="text-[11px] text-purple-600 mt-0.5">
                      Companies completing this wizard step move to this stage
                    </p>
                  </div>
                ) : (
                  <p className="text-[13px] text-gray-500 italic">
                    Not mapped to a wizard step
                  </p>
                )}
              </section>

              {/* Entities at Stage Section */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Link2 className="w-4 h-4 text-gray-400" />
                  <h3 className="text-[13px] font-semibold text-gray-900 uppercase tracking-wide">
                    Entities at This Stage
                  </h3>
                  {totalEntities > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-gray-200 text-gray-600">
                      {totalEntities}
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {stage.entity_type === 'company' && (
                    <Link
                      to={`/dashboard/companies?stage=${stage.id}`}
                      className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <Building2 className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-[13px] font-medium text-gray-900">Companies</p>
                          <p className="text-[11px] text-gray-500">Currently at this stage</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-semibold text-gray-900">
                          {data?.entity_counts.companies || 0}
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                      </div>
                    </Link>
                  )}
                  {stage.entity_type === 'lead' && (
                    <Link
                      to={`/dashboard/leads?stage=${stage.id}`}
                      className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-[13px] font-medium text-gray-900">Leads</p>
                          <p className="text-[11px] text-gray-500">Currently at this stage</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-semibold text-gray-900">
                          {data?.entity_counts.leads || 0}
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                      </div>
                    </Link>
                  )}
                  {stage.entity_type === 'candidate' && (
                    <Link
                      to={`/dashboard/candidates?stage=${stage.id}`}
                      className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <UserCircle className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-[13px] font-medium text-gray-900">Candidates</p>
                          <p className="text-[11px] text-gray-500">Currently at this stage</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-semibold text-gray-900">
                          {data?.entity_counts.candidates || 0}
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                      </div>
                    </Link>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
