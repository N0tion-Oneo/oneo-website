/**
 * LeadDrawer - Drawer for viewing and managing lead details
 * Follows the same design patterns as ApplicationDrawer and CompanyDetailDrawer
 */

import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  X,
  Building2,
  User,
  Mail,
  Phone,
  Globe,
  Briefcase,
  Calendar,
  Clock,
  Edit,
  Trash2,
  Send,
  Trophy,
  XCircle,
  ExternalLink,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  History,
  Loader2,
  Video,
  Plus,
  PhoneCall,
  ArrowRight,
  StickyNote,
  FileText,
  Copy,
  Check,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  useLead,
  useUpdateLead,
  useUpdateLeadStage,
  useDeleteLead,
  useLeadActivities,
  useAddLeadActivity,
  type LeadActivity,
} from '@/hooks/useLeads'
import { getOnboardingStages } from '@/services/api'
import { AssignedSelect } from '@/components/forms'
import type { OnboardingStage, AssignedUser } from '@/types'
import { useCreateInvitation } from '@/hooks/useInvitations'
import api from '@/services/api'

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getSourceLabel(source: string): string {
  const labels: Record<string, string> = {
    inbound: 'Inbound',
    referral: 'Referral',
    outbound: 'Outbound',
    event: 'Event',
    linkedin: 'LinkedIn',
    other: 'Other',
  }
  return labels[source] || source
}

function getSourceBadgeColor(source: string): string {
  const colors: Record<string, string> = {
    inbound: 'bg-green-100 text-green-700',
    referral: 'bg-purple-100 text-purple-700',
    outbound: 'bg-blue-100 text-blue-700',
    event: 'bg-orange-100 text-orange-700',
    linkedin: 'bg-cyan-100 text-cyan-700',
    other: 'bg-gray-100 text-gray-600',
  }
  return colors[source] || 'bg-gray-100 text-gray-600'
}

function getCompanySizeLabel(size: string | null): string {
  if (!size) return 'Not specified'
  return size.replace('_', '-') + ' employees'
}

// =====================================================
// TYPES
// =====================================================

interface LeadBooking {
  id: string
  meeting_type_name: string
  scheduled_at: string
  status: string
  attendee_name: string
}

type TabType = 'overview' | 'activity' | 'invitations'

// =====================================================
// ACTIVITY TIMELINE ENTRY COMPONENT
// =====================================================

function getActivityIcon(activityType: string) {
  switch (activityType) {
    case 'note_added':
      return StickyNote
    case 'stage_changed':
      return ArrowRight
    case 'meeting_scheduled':
    case 'meeting_completed':
    case 'meeting_cancelled':
      return Video
    case 'email_sent':
      return Mail
    case 'call_logged':
      return PhoneCall
    case 'invitation_sent':
      return Send
    case 'converted':
      return CheckCircle
    case 'assigned':
      return User
    case 'created':
      return Plus
    default:
      return History
  }
}

function getActivityColor(activityType: string): string {
  switch (activityType) {
    case 'note_added':
      return 'bg-yellow-100 text-yellow-600'
    case 'stage_changed':
      return 'bg-purple-100 text-purple-600'
    case 'meeting_scheduled':
      return 'bg-blue-100 text-blue-600'
    case 'meeting_completed':
      return 'bg-green-100 text-green-600'
    case 'meeting_cancelled':
      return 'bg-red-100 text-red-600'
    case 'email_sent':
      return 'bg-cyan-100 text-cyan-600'
    case 'call_logged':
      return 'bg-indigo-100 text-indigo-600'
    case 'invitation_sent':
      return 'bg-teal-100 text-teal-600'
    case 'converted':
      return 'bg-green-100 text-green-600'
    case 'assigned':
      return 'bg-orange-100 text-orange-600'
    case 'created':
      return 'bg-gray-100 text-gray-600'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

interface ActivityTimelineEntryProps {
  activity: LeadActivity
}

function ActivityTimelineEntry({ activity }: ActivityTimelineEntryProps) {
  const Icon = getActivityIcon(activity.activity_type)
  const iconColor = getActivityColor(activity.activity_type)

  const renderActivityContent = () => {
    switch (activity.activity_type) {
      case 'stage_changed':
        return (
          <div className="flex items-center gap-2 text-[13px] text-gray-700">
            {activity.previous_stage_name && activity.previous_stage_color && (
              <>
                <span
                  className="px-2 py-0.5 text-[11px] font-medium rounded"
                  style={{
                    backgroundColor: `${activity.previous_stage_color}20`,
                    color: activity.previous_stage_color,
                  }}
                >
                  {activity.previous_stage_name}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
              </>
            )}
            {activity.new_stage_name && activity.new_stage_color && (
              <span
                className="px-2 py-0.5 text-[11px] font-medium rounded"
                style={{
                  backgroundColor: `${activity.new_stage_color}20`,
                  color: activity.new_stage_color,
                }}
              >
                {activity.new_stage_name}
              </span>
            )}
          </div>
        )
      case 'note_added':
      case 'call_logged':
      case 'email_sent':
        return activity.content && (
          <p className="text-[13px] text-gray-600 mt-1 whitespace-pre-wrap">{activity.content}</p>
        )
      default:
        return activity.content && (
          <p className="text-[13px] text-gray-600 mt-1">{activity.content}</p>
        )
    }
  }

  return (
    <div className="relative pl-10">
      {/* Icon */}
      <div className={`absolute left-0 top-0 w-8 h-8 rounded-full flex items-center justify-center ${iconColor}`}>
        <Icon className="w-4 h-4" />
      </div>

      {/* Content */}
      <div className="pb-4">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-gray-900">
            {activity.activity_type_display}
          </span>
          <span className="text-[12px] text-gray-400">
            {formatDateTime(activity.created_at)}
          </span>
        </div>
        {activity.performer_name && (
          <p className="text-[12px] text-gray-500">by {activity.performer_name}</p>
        )}
        {renderActivityContent()}
      </div>
    </div>
  )
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export interface LeadDrawerProps {
  leadId: string
  onClose: () => void
  onRefresh?: () => void
  onDeleted?: () => void
}

export default function LeadDrawer({
  leadId,
  onClose,
  onRefresh,
  onDeleted,
}: LeadDrawerProps) {
  const { user } = useAuth()
  const { lead, isLoading, refetch } = useLead(leadId)
  const { updateLead, isUpdating } = useUpdateLead()
  const { updateStage, isUpdating: isUpdatingStage } = useUpdateLeadStage()
  const { deleteLead, isDeleting } = useDeleteLead()
  const { activities, isLoading: activitiesLoading, refetch: refetchActivities } = useLeadActivities(leadId)
  const { addActivity, isAdding: isAddingActivity } = useAddLeadActivity()
  const { createInvitation, isCreating: isCreatingInvitation, error: invitationError } = useCreateInvitation()

  const [stages, setStages] = useState<OnboardingStage[]>([])
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [notes, setNotes] = useState('')
  const [bookings, setBookings] = useState<LeadBooking[]>([])
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showConvertConfirm, setShowConvertConfirm] = useState(false)
  const [isStageDropdownOpen, setIsStageDropdownOpen] = useState(false)
  const [showAddActivityModal, setShowAddActivityModal] = useState(false)
  const [activityType, setActivityType] = useState<'note_added' | 'call_logged' | 'email_sent'>('note_added')
  const [activityContent, setActivityContent] = useState('')

  // Contract offer state for invitation
  const [showContractOffer, setShowContractOffer] = useState(false)
  const [serviceType, setServiceType] = useState<'headhunting' | 'retained' | ''>('')
  const [monthlyRetainer, setMonthlyRetainer] = useState('')
  const [placementFee, setPlacementFee] = useState('')
  const [csuitePlacementFee, setCsuitePlacementFee] = useState('')
  const [createdInvitationUrl, setCreatedInvitationUrl] = useState<string | null>(null)
  const [copiedInviteUrl, setCopiedInviteUrl] = useState(false)

  // Ref for click-outside handling
  const stageDropdownRef = useRef<HTMLDivElement>(null)

  // Close stage dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (stageDropdownRef.current && !stageDropdownRef.current.contains(event.target as Node)) {
        setIsStageDropdownOpen(false)
      }
    }

    if (isStageDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isStageDropdownOpen])

  // Fetch lead stages
  useEffect(() => {
    getOnboardingStages({ entity_type: 'lead' })
      .then(setStages)
      .catch((err) => console.error('Failed to fetch stages:', err))
  }, [])

  // Initialize notes when lead loads
  useEffect(() => {
    if (lead) {
      setNotes(lead.notes || '')
    }
  }, [lead])

  // Fetch bookings for this lead (using direct lead FK)
  useEffect(() => {
    if (lead?.id) {
      setBookingsLoading(true)
      api.get(`/scheduling/bookings/`, {
        params: {
          lead_id: lead.id
        }
      })
        .then((res) => setBookings(res.data))
        .catch(() => setBookings([]))
        .finally(() => setBookingsLoading(false))
    }
  }, [lead?.id])

  const handleStageChange = async (stageId: number) => {
    if (!lead) return
    try {
      await updateStage(lead.id, stageId)
      setIsStageDropdownOpen(false)
      refetch()
      onRefresh?.()
    } catch (err) {
      console.error('Failed to update stage:', err)
    }
  }

  const handleSaveNotes = async () => {
    if (!lead) return
    try {
      await updateLead(lead.id, { notes })
      setIsEditingNotes(false)
      refetch()
    } catch (err) {
      console.error('Failed to save notes:', err)
    }
  }

  const handleToggleRead = async () => {
    if (!lead) return
    try {
      await api.patch(`/companies/leads/${lead.id}/contact-status/`, {
        is_read: !lead.is_read,
      })
      refetch()
      onRefresh?.()
    } catch (err) {
      console.error('Failed to toggle read status:', err)
    }
  }

  const handleToggleReplied = async () => {
    if (!lead) return
    try {
      await api.patch(`/companies/leads/${lead.id}/contact-status/`, {
        is_replied: !lead.is_replied,
      })
      refetch()
      onRefresh?.()
    } catch (err) {
      console.error('Failed to toggle replied status:', err)
    }
  }

  const handleDelete = async () => {
    if (!lead) return
    try {
      await deleteLead(lead.id)
      onDeleted?.()
      onClose()
    } catch (err) {
      console.error('Failed to delete lead:', err)
    }
  }

  const handleMarkWon = async () => {
    if (!lead) return
    const wonStage = stages.find((s) => s.slug === 'won')
    if (wonStage) {
      await handleStageChange(wonStage.id)
    }
  }

  const handleMarkLost = async () => {
    if (!lead) return
    const lostStage = stages.find((s) => s.slug === 'lost')
    if (lostStage) {
      await handleStageChange(lostStage.id)
    }
  }

  const handleQuickConvert = async () => {
    if (!lead) return
    try {
      // Build invitation data with optional contract terms
      const invitationData: {
        email: string
        lead_id: string
        offered_service_type?: 'headhunting' | 'retained'
        offered_monthly_retainer?: number
        offered_placement_fee?: number
        offered_csuite_placement_fee?: number
      } = {
        email: lead.email,
        lead_id: lead.id,
      }

      // Include contract offer terms if provided
      if (serviceType) {
        invitationData.offered_service_type = serviceType
      }
      if (monthlyRetainer) {
        invitationData.offered_monthly_retainer = parseFloat(monthlyRetainer)
      }
      if (placementFee) {
        // Convert percentage to decimal (e.g., 20% -> 0.20)
        invitationData.offered_placement_fee = parseFloat(placementFee) / 100
      }
      if (csuitePlacementFee) {
        // Convert percentage to decimal (e.g., 25% -> 0.25)
        invitationData.offered_csuite_placement_fee = parseFloat(csuitePlacementFee) / 100
      }

      // 1. Send invitation using the hook
      const result = await createInvitation(invitationData)
      setCreatedInvitationUrl(result.signup_url)

      // 2. Update to invitation-sent stage (backend handles this via lead_id link)
      const invitationStage = stages.find((s) => s.slug === 'invitation-sent')
      if (invitationStage) {
        await updateStage(lead.id, invitationStage.id)
      }

      refetch()
      refetchActivities()
      onRefresh?.()
    } catch (err) {
      console.error('Failed to convert lead:', err)
    }
  }

  const handleCloseInvitationModal = () => {
    setShowConvertConfirm(false)
    setCreatedInvitationUrl(null)
    setShowContractOffer(false)
    setServiceType('')
    setMonthlyRetainer('')
    setPlacementFee('')
    setCsuitePlacementFee('')
    setCopiedInviteUrl(false)
  }

  const copyInviteUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedInviteUrl(true)
      setTimeout(() => setCopiedInviteUrl(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleAssignedChange = async (assignedTo: AssignedUser[]) => {
    if (!lead) return
    try {
      await api.patch(`/companies/leads/${lead.id}/update/`, {
        assigned_to_ids: assignedTo.map((u) => u.id),
      })
      refetch()
      onRefresh?.()
    } catch (err) {
      console.error('Failed to update assigned:', err)
    }
  }

  const handleAddActivity = async () => {
    if (!lead || !activityContent.trim()) return
    try {
      await addActivity(lead.id, {
        activity_type: activityType,
        content: activityContent,
      })
      setActivityContent('')
      setShowAddActivityModal(false)
      refetchActivities()
    } catch (err) {
      console.error('Failed to add activity:', err)
    }
  }

  // Build tabs
  const tabs: { id: TabType; label: string; icon: typeof User; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'activity', label: 'Activity', icon: History, count: activities.length },
    { id: 'invitations', label: 'Invitations', icon: Send, count: lead?.invitations.length },
  ]

  if (isLoading || !lead) {
    return (
      <>
        <div className="fixed inset-0 bg-black/30 z-[200]" onClick={onClose} />
        <div className="fixed inset-y-0 right-0 w-1/2 min-w-[640px] bg-white shadow-xl z-[201] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </>
    )
  }

  const isTerminal = lead.onboarding_stage?.slug === 'won' || lead.onboarding_stage?.slug === 'lost'
  const isWon = lead.onboarding_stage?.slug === 'won'
  const isLost = lead.onboarding_stage?.slug === 'lost'

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-[200] transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-1/2 min-w-[640px] bg-white shadow-xl z-[201] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div>
            <h2 className="text-[16px] font-semibold text-gray-900">{lead.name}</h2>
            <p className="text-[13px] text-gray-500 mt-0.5">
              {lead.company_name}
              {lead.job_title && ` · ${lead.job_title}`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Stage Selector Dropdown */}
            <div className="relative" ref={stageDropdownRef}>
              <button
                onClick={() => setIsStageDropdownOpen(!isStageDropdownOpen)}
                disabled={isUpdatingStage}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium rounded cursor-pointer hover:opacity-80 transition-opacity"
                style={lead.onboarding_stage ? {
                  backgroundColor: `${lead.onboarding_stage.color}20`,
                  color: lead.onboarding_stage.color,
                } : undefined}
              >
                {isWon && <Trophy className="w-3.5 h-3.5" />}
                {isLost && <XCircle className="w-3.5 h-3.5" />}
                {lead.onboarding_stage?.name || 'No Stage'}
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {isStageDropdownOpen && (
                <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
                  {stages.map((stage) => (
                    <button
                      key={stage.id}
                      onClick={() => handleStageChange(stage.id)}
                      disabled={lead.onboarding_stage?.id === stage.id}
                      className={`w-full text-left px-3 py-2 text-[12px] hover:bg-gray-50 ${
                        lead.onboarding_stage?.id === stage.id ? 'bg-gray-50 font-medium' : ''
                      }`}
                    >
                      <span
                        className="inline-block w-2 h-2 rounded-full mr-2"
                        style={{ backgroundColor: stage.color }}
                      />
                      {stage.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Source Badge */}
            <span className={`px-2 py-1 text-[11px] font-medium rounded ${getSourceBadgeColor(lead.source)}`}>
              {getSourceLabel(lead.source)}
            </span>

            {/* Converted Badge */}
            {lead.is_converted && (
              <span className="px-2 py-1 text-[11px] font-medium rounded bg-green-100 text-green-700">
                Converted
              </span>
            )}

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 py-3 border-b border-gray-200">
          <div className="flex gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 text-[13px] font-medium rounded-md transition-colors ${
                    activeTab === tab.id
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={`ml-1 px-1.5 py-0.5 text-[10px] font-medium rounded-full ${
                      activeTab === tab.id ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2">
                {/* Schedule Meeting - always show if user has booking slug */}
                {user?.booking_slug && (
                  <Link
                    to={`/meet/${user.booking_slug}?name=${encodeURIComponent(lead.name)}&email=${encodeURIComponent(lead.email)}&phone=${encodeURIComponent(lead.phone || '')}&company=${encodeURIComponent(lead.company_name)}`}
                    target="_blank"
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200"
                  >
                    <Video className="w-3.5 h-3.5" />
                    Schedule Meeting
                  </Link>
                )}
                {!isTerminal && (
                  <>
                    <button
                      onClick={() => setShowConvertConfirm(true)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Send Invitation & Convert
                    </button>
                    <button
                      onClick={handleMarkWon}
                      disabled={isUpdatingStage}
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium text-green-700 bg-green-100 rounded-md hover:bg-green-200"
                    >
                      <Trophy className="w-3.5 h-3.5" />
                      Mark Won
                    </button>
                    <button
                      onClick={handleMarkLost}
                      disabled={isUpdatingStage}
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Mark Lost
                    </button>
                  </>
                )}
                {!lead.is_converted && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                )}
              </div>

              {/* Assigned To */}
              <div>
                <h3 className="text-[13px] font-medium text-gray-900 mb-2">Assigned To</h3>
                <AssignedSelect
                  selected={lead.assigned_to as AssignedUser[]}
                  onChange={handleAssignedChange}
                  placeholder="Assign team member..."
                />
              </div>

              {/* Contact Information */}
              <div>
                <h3 className="text-[13px] font-medium text-gray-900 mb-2">Contact Information</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                  <a
                    href={`mailto:${lead.email}`}
                    className="flex items-center gap-2 text-[13px] text-gray-700 hover:text-gray-900"
                  >
                    <Mail className="w-4 h-4 text-gray-400" />
                    {lead.email}
                    <ExternalLink className="w-3 h-3 ml-auto text-gray-400" />
                  </a>
                  {lead.phone && (
                    <a
                      href={`tel:${lead.phone}`}
                      className="flex items-center gap-2 text-[13px] text-gray-700 hover:text-gray-900"
                    >
                      <Phone className="w-4 h-4 text-gray-400" />
                      {lead.phone}
                      <ExternalLink className="w-3 h-3 ml-auto text-gray-400" />
                    </a>
                  )}
                  {lead.job_title && (
                    <div className="flex items-center gap-2 text-[13px] text-gray-600">
                      <Briefcase className="w-4 h-4 text-gray-400" />
                      {lead.job_title}
                    </div>
                  )}
                </div>
              </div>

              {/* Company Information */}
              <div>
                <h3 className="text-[13px] font-medium text-gray-900 mb-2">Company Information</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-[13px] text-gray-900 font-medium">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    {lead.company_name}
                  </div>
                  {lead.company_website && (
                    <a
                      href={lead.company_website.startsWith('http') ? lead.company_website : `https://${lead.company_website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-[13px] text-blue-600 hover:text-blue-800"
                    >
                      <Globe className="w-4 h-4 text-gray-400" />
                      {lead.company_website}
                      <ExternalLink className="w-3 h-3 ml-auto" />
                    </a>
                  )}
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200">
                    <div>
                      <p className="text-[11px] text-gray-500 uppercase tracking-wide">Company Size</p>
                      <p className="text-[13px] text-gray-900 mt-0.5">{getCompanySizeLabel(lead.company_size)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-500 uppercase tracking-wide">Industry</p>
                      <p className="text-[13px] text-gray-900 mt-0.5">{lead.industry_name || 'Not specified'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Source Information */}
              <div>
                <h3 className="text-[13px] font-medium text-gray-900 mb-2">Source & Tracking</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[11px] text-gray-500 uppercase tracking-wide">Source</p>
                      <p className="text-[13px] text-gray-900 mt-0.5">{getSourceLabel(lead.source)}</p>
                    </div>
                    {lead.source_detail && (
                      <div>
                        <p className="text-[11px] text-gray-500 uppercase tracking-wide">Source Detail</p>
                        <p className="text-[13px] text-gray-900 mt-0.5">{lead.source_detail}</p>
                      </div>
                    )}
                  </div>
                  {lead.source_page && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-[11px] text-gray-500 uppercase tracking-wide">Source Page</p>
                      <p className="text-[13px] text-gray-600 mt-0.5 truncate">{lead.source_page}</p>
                    </div>
                  )}
                  {lead.subject && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-[11px] text-gray-500 uppercase tracking-wide">Subject</p>
                      <p className="text-[13px] text-gray-900 mt-0.5">{lead.subject}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Admin Status (for inbound leads) */}
              {lead.source === 'inbound' && (
                <div>
                  <h3 className="text-[13px] font-medium text-gray-900 mb-2">Admin Status</h3>
                  <div className="flex gap-3">
                    <button
                      onClick={handleToggleRead}
                      className={`flex items-center gap-2 px-3 py-2 text-[12px] font-medium rounded-lg border transition-colors ${
                        lead.is_read
                          ? 'bg-green-50 border-green-200 text-green-700'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {lead.is_read ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      {lead.is_read ? 'Read' : 'Unread'}
                    </button>
                    <button
                      onClick={handleToggleReplied}
                      className={`flex items-center gap-2 px-3 py-2 text-[12px] font-medium rounded-lg border transition-colors ${
                        lead.is_replied
                          ? 'bg-blue-50 border-blue-200 text-blue-700'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {lead.is_replied ? <CheckCircle className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                      {lead.is_replied ? 'Replied' : 'Not Replied'}
                    </button>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[13px] font-medium text-gray-900">Notes</h3>
                  {!isEditingNotes && (
                    <button
                      onClick={() => setIsEditingNotes(true)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {isEditingNotes ? (
                  <div className="space-y-2">
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 text-[13px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      placeholder="Add notes about this lead..."
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveNotes}
                        disabled={isUpdating}
                        className="px-3 py-1.5 text-[12px] font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 disabled:opacity-50"
                      >
                        {isUpdating ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => {
                          setNotes(lead.notes || '')
                          setIsEditingNotes(false)
                        }}
                        className="px-3 py-1.5 text-[12px] font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    {lead.notes ? (
                      <p className="text-[13px] text-gray-700 whitespace-pre-wrap">{lead.notes}</p>
                    ) : (
                      <p className="text-[13px] text-gray-400 italic">No notes yet</p>
                    )}
                  </div>
                )}
              </div>

              {/* Conversion Info */}
              {lead.is_converted && (
                <div>
                  <h3 className="text-[13px] font-medium text-gray-900 mb-2">Conversion</h3>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium text-[13px]">Converted on {formatDate(lead.converted_at!)}</span>
                    </div>
                    {lead.converted_to_company && (
                      <Link
                        to={`/dashboard/admin/companies/${lead.converted_to_company.id}`}
                        className="flex items-center gap-2 text-[13px] text-green-700 hover:text-green-800"
                      >
                        <Building2 className="w-4 h-4" />
                        {lead.converted_to_company.name}
                        <ChevronRight className="w-4 h-4 ml-auto" />
                      </Link>
                    )}
                    {lead.converted_to_user && (
                      <div className="flex items-center gap-2 text-[13px] text-green-700">
                        <User className="w-4 h-4" />
                        {lead.converted_to_user.name} ({lead.converted_to_user.email})
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div>
                <h3 className="text-[13px] font-medium text-gray-900 mb-2">Timeline</h3>
                <div className="space-y-2 text-[13px] text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    Created {formatDateTime(lead.created_at)}
                    {lead.created_by && (
                      <span className="text-gray-400">by {lead.created_by.name}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    Last updated {formatDateTime(lead.updated_at)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div className="space-y-6">
              {/* Add Activity Button */}
              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-medium text-gray-900">Activity Log</h3>
                <button
                  onClick={() => setShowAddActivityModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Note
                </button>
              </div>

              {/* Scheduled Meetings */}
              {(bookingsLoading || bookings.length > 0) && (
                <div>
                  <h4 className="text-[12px] font-medium text-gray-500 uppercase tracking-wide mb-2">Scheduled Meetings</h4>
                  {bookingsLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    </div>
                  ) : (
                  <div className="space-y-2">
                    {bookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
                      >
                        <div>
                          <p className="text-[13px] font-medium text-gray-900">{booking.meeting_type_name}</p>
                          <p className="text-[12px] text-gray-500">{formatDateTime(booking.scheduled_at)}</p>
                        </div>
                        <span className={`px-2 py-0.5 text-[11px] font-medium rounded ${
                          booking.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : booking.status === 'cancelled'
                            ? 'bg-red-100 text-red-700'
                            : booking.status === 'no_show'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {booking.status.replace('_', ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                  )}
                </div>
              )}

              {/* Activity Timeline */}
              {activitiesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 border border-gray-200 rounded-lg">
                  <History className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-[13px] text-gray-500">No activity recorded yet</p>
                  <button
                    onClick={() => setShowAddActivityModal(true)}
                    className="mt-3 inline-flex items-center gap-1.5 text-[13px] text-gray-600 hover:text-gray-900"
                  >
                    <Plus className="w-4 h-4" />
                    Add first note
                  </button>
                </div>
              ) : (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

                  {/* Activity entries */}
                  <div className="space-y-4">
                    {activities.map((activity) => (
                      <ActivityTimelineEntry key={activity.id} activity={activity} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Invitations Tab */}
          {activeTab === 'invitations' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-medium text-gray-900">Client Invitations</h3>
                <button
                  onClick={() => setShowConvertConfirm(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800"
                >
                  <Send className="w-3.5 h-3.5" />
                  Send Invitation
                </button>
              </div>

              {lead.invitations.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 border border-gray-200 rounded-lg">
                  <Send className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-[13px] text-gray-500">No invitations sent yet</p>
                  <button
                    onClick={() => setShowConvertConfirm(true)}
                    className="mt-3 inline-flex items-center gap-1.5 text-[13px] text-gray-600 hover:text-gray-900"
                  >
                    <Send className="w-4 h-4" />
                    Send first invitation
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {lead.invitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className={`p-4 border rounded-lg ${
                        invitation.used_at
                          ? 'bg-green-50 border-green-200'
                          : invitation.is_expired
                          ? 'bg-gray-50 border-gray-200'
                          : 'bg-blue-50 border-blue-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[13px] font-medium text-gray-900">{invitation.email}</p>
                          <p className="text-[12px] text-gray-500">
                            Sent {formatDateTime(invitation.created_at)}
                          </p>
                        </div>
                        <span className={`px-2 py-0.5 text-[11px] font-medium rounded ${
                          invitation.used_at
                            ? 'bg-green-100 text-green-700'
                            : invitation.is_expired
                            ? 'bg-gray-100 text-gray-600'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {invitation.used_at ? 'Used' : invitation.is_expired ? 'Expired' : 'Pending'}
                        </span>
                      </div>
                      {!invitation.used_at && (
                        <p className="mt-2 text-[12px] text-gray-500">
                          {invitation.is_expired ? 'Expired' : `Expires ${formatDateTime(invitation.expires_at)}`}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <>
          <div className="fixed inset-0 z-[300] bg-black/50" onClick={() => setShowDeleteConfirm(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[301] w-full max-w-md bg-white rounded-lg shadow-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Lead</h3>
            <p className="text-[13px] text-gray-600 mb-6">
              Are you sure you want to delete <strong>{lead.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-[13px] font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-[13px] font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Send Invitation Modal */}
      {showConvertConfirm && (
        <>
          <div className="fixed inset-0 z-[300] bg-black/50" onClick={handleCloseInvitationModal} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[301] w-full max-w-lg bg-white rounded-lg shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {createdInvitationUrl ? 'Invitation Sent' : 'Send Client Invitation'}
              </h3>
              <button
                onClick={handleCloseInvitationModal}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {createdInvitationUrl ? (
                /* Success State */
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                    <div>
                      <p className="text-[14px] font-medium text-green-800">Invitation sent successfully!</p>
                      <p className="text-[13px] text-green-700">
                        An email has been sent to {lead.email}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                      Signup Link
                    </label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-[13px] text-gray-700 overflow-x-auto">
                        {createdInvitationUrl}
                      </code>
                      <button
                        onClick={() => copyInviteUrl(createdInvitationUrl)}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                        title="Copy link"
                      >
                        {copiedInviteUrl ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {serviceType && (
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <p className="text-[13px] text-purple-700">
                        <strong>Contract terms included:</strong> {serviceType === 'retained' ? 'Retained' : 'Headhunting'}
                        {monthlyRetainer && ` · R${monthlyRetainer}/mo`}
                        {placementFee && ` · ${placementFee}% placement`}
                        {csuitePlacementFee && ` · ${csuitePlacementFee}% C-suite`}
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleCloseInvitationModal}
                      className="px-4 py-2 text-[13px] font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                /* Form State */
                <div className="space-y-4">
                  <p className="text-[13px] text-gray-600">
                    Send a client invitation to <strong>{lead.email}</strong>. They'll receive an email with a signup link.
                  </p>

                  {/* Lead Info */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="grid grid-cols-2 gap-2 text-[13px]">
                      <div>
                        <span className="text-gray-500">Name:</span>{' '}
                        <span className="text-gray-900">{lead.name}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Company:</span>{' '}
                        <span className="text-gray-900">{lead.company_name}</span>
                      </div>
                    </div>
                  </div>

                  {/* Contract Offer Toggle */}
                  <div className="border-t border-gray-200 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowContractOffer(!showContractOffer)}
                      className="flex items-center gap-2 text-[14px] font-medium text-gray-700 hover:text-gray-900 transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      Pre-negotiated Contract Terms
                      <ChevronDown className={`w-4 h-4 transition-transform ${showContractOffer ? 'rotate-180' : ''}`} />
                    </button>
                    <p className="text-[12px] text-gray-500 mt-1">
                      Include pre-agreed pricing that will be shown during client onboarding
                    </p>

                    {showContractOffer && (
                      <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-4">
                        {/* Service Type */}
                        <div>
                          <label className="block text-[13px] font-medium text-gray-700 mb-2">
                            Service Type
                          </label>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="leadServiceType"
                                value="headhunting"
                                checked={serviceType === 'headhunting'}
                                onChange={(e) => setServiceType(e.target.value as 'headhunting')}
                                className="w-4 h-4 text-gray-900 border-gray-300 focus:ring-gray-900"
                              />
                              <span className="text-[14px] text-gray-700">Headhunting</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="leadServiceType"
                                value="retained"
                                checked={serviceType === 'retained'}
                                onChange={(e) => setServiceType(e.target.value as 'retained')}
                                className="w-4 h-4 text-gray-900 border-gray-300 focus:ring-gray-900"
                              />
                              <span className="text-[14px] text-gray-700">Retained</span>
                            </label>
                            {serviceType && (
                              <button
                                type="button"
                                onClick={() => setServiceType('')}
                                className="text-[13px] text-gray-500 hover:text-gray-700"
                              >
                                Clear
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Pricing Fields */}
                        <div className="grid grid-cols-3 gap-3">
                          {/* Monthly Retainer - only show for retained */}
                          {serviceType === 'retained' && (
                            <div>
                              <label className="block text-[12px] font-medium text-gray-700 mb-1">
                                Monthly Retainer
                              </label>
                              <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[13px] text-gray-500">R</span>
                                <input
                                  type="number"
                                  value={monthlyRetainer}
                                  onChange={(e) => setMonthlyRetainer(e.target.value)}
                                  placeholder="0"
                                  min="0"
                                  step="1"
                                  className="w-full h-9 pl-6 pr-2 text-[13px] border border-gray-300 rounded-md bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
                                />
                              </div>
                            </div>
                          )}

                          {/* Placement Fee */}
                          <div>
                            <label className="block text-[12px] font-medium text-gray-700 mb-1">
                              Placement Fee
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                value={placementFee}
                                onChange={(e) => setPlacementFee(e.target.value)}
                                placeholder="20"
                                min="0"
                                max="100"
                                step="0.1"
                                className="w-full h-9 px-2.5 pr-7 text-[13px] border border-gray-300 rounded-md bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
                              />
                              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[13px] text-gray-500">%</span>
                            </div>
                          </div>

                          {/* C-Suite Fee */}
                          <div>
                            <label className="block text-[12px] font-medium text-gray-700 mb-1">
                              C-Suite Fee
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                value={csuitePlacementFee}
                                onChange={(e) => setCsuitePlacementFee(e.target.value)}
                                placeholder="25"
                                min="0"
                                max="100"
                                step="0.1"
                                className="w-full h-9 px-2.5 pr-7 text-[13px] border border-gray-300 rounded-md bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
                              />
                              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[13px] text-gray-500">%</span>
                            </div>
                          </div>
                        </div>

                        <p className="text-[11px] text-gray-500">
                          These terms will appear as "Custom Pricing" during the client's onboarding.
                        </p>
                      </div>
                    )}
                  </div>

                  {invitationError && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                      <p className="text-[13px] text-red-700">{invitationError}</p>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      onClick={handleCloseInvitationModal}
                      disabled={isCreatingInvitation}
                      className="px-4 py-2 text-[13px] font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleQuickConvert}
                      disabled={isCreatingInvitation}
                      className="px-4 py-2 text-[13px] font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      {isCreatingInvitation ? 'Sending...' : 'Send Invitation'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Add Activity Modal */}
      {showAddActivityModal && (
        <>
          <div className="fixed inset-0 z-[300] bg-black/50" onClick={() => setShowAddActivityModal(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[301] w-full max-w-md bg-white rounded-lg shadow-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Activity</h3>

            {/* Activity Type Selector */}
            <div className="mb-4">
              <label className="block text-[13px] font-medium text-gray-700 mb-2">Type</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setActivityType('note_added')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-[13px] font-medium rounded-lg border transition-colors ${
                    activityType === 'note_added'
                      ? 'bg-yellow-50 border-yellow-300 text-yellow-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <StickyNote className="w-4 h-4" />
                  Note
                </button>
                <button
                  onClick={() => setActivityType('call_logged')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-[13px] font-medium rounded-lg border transition-colors ${
                    activityType === 'call_logged'
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <PhoneCall className="w-4 h-4" />
                  Call
                </button>
                <button
                  onClick={() => setActivityType('email_sent')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-[13px] font-medium rounded-lg border transition-colors ${
                    activityType === 'email_sent'
                      ? 'bg-cyan-50 border-cyan-300 text-cyan-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Mail className="w-4 h-4" />
                  Email
                </button>
              </div>
            </div>

            {/* Content Input */}
            <div className="mb-6">
              <label className="block text-[13px] font-medium text-gray-700 mb-2">
                {activityType === 'note_added' ? 'Note' : activityType === 'call_logged' ? 'Call Summary' : 'Email Summary'}
              </label>
              <textarea
                value={activityContent}
                onChange={(e) => setActivityContent(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 text-[13px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder={
                  activityType === 'note_added'
                    ? 'Add a note about this lead...'
                    : activityType === 'call_logged'
                    ? 'Summarize the call...'
                    : 'Summarize the email...'
                }
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setActivityContent('')
                  setShowAddActivityModal(false)
                }}
                className="px-4 py-2 text-[13px] font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAddActivity}
                disabled={!activityContent.trim() || isAddingActivity}
                className="px-4 py-2 text-[13px] font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 disabled:opacity-50"
              >
                {isAddingActivity ? 'Adding...' : 'Add Activity'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
