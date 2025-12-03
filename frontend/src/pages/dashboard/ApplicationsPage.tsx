import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMyApplications, useWithdrawApplication } from '@/hooks'
import { ApplicationStatus } from '@/types'
import {
  Briefcase,
  Building2,
  Calendar,
  ChevronRight,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowRight,
  X,
} from 'lucide-react'

const getStatusBadge = (status: ApplicationStatus) => {
  const statusConfig = {
    [ApplicationStatus.APPLIED]: {
      label: 'Applied',
      className: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: Clock,
    },
    [ApplicationStatus.IN_PROGRESS]: {
      label: 'In Progress',
      className: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      icon: ArrowRight,
    },
    [ApplicationStatus.OFFER]: {
      label: 'Offer',
      className: 'bg-green-50 text-green-700 border-green-200',
      icon: CheckCircle,
    },
    [ApplicationStatus.ACCEPTED]: {
      label: 'Accepted',
      className: 'bg-green-50 text-green-700 border-green-200',
      icon: CheckCircle,
    },
    [ApplicationStatus.REJECTED]: {
      label: 'Rejected',
      className: 'bg-red-50 text-red-700 border-red-200',
      icon: XCircle,
    },
    [ApplicationStatus.WITHDRAWN]: {
      label: 'Withdrawn',
      className: 'bg-gray-50 text-gray-700 border-gray-200',
      icon: X,
    },
  }

  const config = statusConfig[status] || statusConfig[ApplicationStatus.APPLIED]
  const Icon = config.icon

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 text-[12px] font-medium rounded border ${config.className}`}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  )
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function ApplicationsPage() {
  const { applications, isLoading, error, refetch } = useMyApplications()
  const { withdraw, isLoading: isWithdrawing } = useWithdrawApplication()
  const [confirmWithdraw, setConfirmWithdraw] = useState<string | null>(null)
  const [withdrawError, setWithdrawError] = useState<string | null>(null)

  const handleWithdraw = async (applicationId: string) => {
    try {
      setWithdrawError(null)
      await withdraw(applicationId)
      setConfirmWithdraw(null)
      refetch()
    } catch (err) {
      setWithdrawError((err as Error).message)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-[14px] text-gray-500">Loading applications...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold text-gray-900">My Applications</h1>
        <p className="text-[14px] text-gray-500 mt-1">
          Track the status of your job applications
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {applications.length === 0 ? (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
          <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-[15px] text-gray-700 mb-1">No applications yet</p>
          <p className="text-[13px] text-gray-500 mb-4">
            Start applying to jobs to track your progress here
          </p>
          <Link
            to="/jobs"
            className="inline-flex items-center gap-2 px-4 py-2 text-[14px] font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 transition-colors"
          >
            Browse Jobs
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-[12px] font-medium text-gray-500 uppercase tracking-wider">
                    Job
                  </th>
                  <th className="px-4 py-3 text-left text-[12px] font-medium text-gray-500 uppercase tracking-wider">
                    Stage
                  </th>
                  <th className="px-4 py-3 text-left text-[12px] font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-[12px] font-medium text-gray-500 uppercase tracking-wider">
                    Applied
                  </th>
                  <th className="px-4 py-3 text-right text-[12px] font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {applications.map((application) => (
                  <tr key={application.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {application.job.company?.logo ? (
                          <img
                            src={application.job.company.logo}
                            alt={application.job.company.name}
                            className="w-10 h-10 rounded-lg object-cover border border-gray-100"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Building2 className="w-4 h-4 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <Link
                            to={`/jobs/${application.job.slug}`}
                            className="text-[14px] font-medium text-gray-900 hover:text-gray-700"
                          >
                            {application.job.title}
                          </Link>
                          <p className="text-[12px] text-gray-500">
                            {application.job.company?.name}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-[13px] text-gray-700">
                        {application.current_stage_name}
                      </span>
                      {application.interview_stages &&
                        application.interview_stages.length > 0 && (
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            Step {application.current_stage_order} of{' '}
                            {application.interview_stages.length}
                          </p>
                        )}
                    </td>
                    <td className="px-4 py-4">
                      {getStatusBadge(application.status)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1 text-[13px] text-gray-500">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(application.applied_at)}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      {application.status === ApplicationStatus.APPLIED ||
                      application.status === ApplicationStatus.IN_PROGRESS ? (
                        <button
                          onClick={() => setConfirmWithdraw(application.id)}
                          className="text-[13px] text-red-600 hover:text-red-700 font-medium"
                        >
                          Withdraw
                        </button>
                      ) : (
                        <Link
                          to={`/jobs/${application.job.slug}`}
                          className="text-[13px] text-gray-600 hover:text-gray-900 font-medium"
                        >
                          View Job
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Withdraw Confirmation Modal */}
      {confirmWithdraw && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-[16px] font-medium text-gray-900">
                Withdraw Application?
              </h3>
            </div>
            <div className="px-6 py-4">
              {withdrawError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{withdrawError}</p>
                </div>
              )}
              <p className="text-[14px] text-gray-600">
                Are you sure you want to withdraw this application? This action
                cannot be undone.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => {
                  setConfirmWithdraw(null)
                  setWithdrawError(null)
                }}
                disabled={isWithdrawing}
                className="px-4 py-2 text-[14px] font-medium text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleWithdraw(confirmWithdraw)}
                disabled={isWithdrawing}
                className="px-4 py-2 text-[14px] font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isWithdrawing ? 'Withdrawing...' : 'Withdraw'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
