/**
 * PlatformTeamMembersTable Component
 *
 * Displays platform staff members (admins and recruiters) with their RecruiterProfiles,
 * and handles staff invitations using the RecruiterInvitation system.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  UserPlus,
  Shield,
  Users,
  AlertCircle,
  Clock,
  Mail,
  CheckCircle,
  Copy,
  Check,
  ExternalLink,
  X,
  Pencil,
  UserMinus,
  UserCheck,
  AlertTriangle,
  Trash2,
  Archive,
  Eye,
  EyeOff,
} from 'lucide-react'
import { useRecruiterInvitations, useCreateRecruiterInvitation, useCancelRecruiterInvitation } from '@/hooks/useInvitations'
import {
  useStaffWithProfiles,
  useUpdateStaffUser,
  useStaffRecruiterProfile,
  useUpdateStaffProfile,
  useDeactivateStaffUser,
  useReactivateStaffUser,
} from '@/hooks/useStaffUsers'
import { RecruiterProfileForm } from '@/components/recruiter'
import type { RecruiterInvitation } from '@/hooks/useInvitations'
import type { StaffUserWithProfile } from '@/hooks/useStaffUsers'
import type { RecruiterProfileUpdate } from '@/types'

interface PlatformTeamMembersTableProps {
  platformCompanyId: string
  currentUserId: string
}

// Role display config based on user's system role
const USER_ROLE_CONFIG: Record<string, { label: string; color: string }> = {
  admin: { label: 'Admin', color: 'text-purple-700 bg-purple-50' },
  recruiter: { label: 'Recruiter', color: 'text-blue-700 bg-blue-50' },
}

export default function PlatformTeamMembersTable({
  platformCompanyId: _platformCompanyId,
  currentUserId,
}: PlatformTeamMembersTableProps) {
  // Toggle for showing archived users
  const [showArchived, setShowArchived] = useState(false)

  // Fetch staff with full profile data
  const { staffUsers, isLoading: usersLoading, error: usersError, refetch: refetchUsers } = useStaffWithProfiles({ includeArchived: showArchived })
  const { invitations, isLoading: invitationsLoading, error: invitationsError, refetch: refetchInvitations } = useRecruiterInvitations()
  const { createInvitation, isCreating, error: createError } = useCreateRecruiterInvitation()

  // Update hooks
  const { updateStaffUser, isUpdating: isUpdatingUser } = useUpdateStaffUser()
  const { updateStaffProfile, isUpdating: isUpdatingProfile } = useUpdateStaffProfile()

  // Deactivation and cancel invitation hooks
  const { deactivateStaffUser, isDeactivating, error: deactivateError } = useDeactivateStaffUser()
  const { reactivateStaffUser, isReactivating, error: reactivateError } = useReactivateStaffUser()
  const { cancelInvitation, isCancelling, error: cancelError } = useCancelRecruiterInvitation()

  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState<{ signup_url: string; email: string } | null>(null)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)

  // Edit staff member state
  const [editingMember, setEditingMember] = useState<StaffUserWithProfile | null>(null)
  const [editRole, setEditRole] = useState<'admin' | 'recruiter'>('recruiter')
  const [roleUpdateError, setRoleUpdateError] = useState<string | null>(null)

  // Deactivation confirmation modal state
  const [deactivatingMember, setDeactivatingMember] = useState<StaffUserWithProfile | null>(null)

  // Reactivation confirmation modal state
  const [reactivatingMember, setReactivatingMember] = useState<StaffUserWithProfile | null>(null)

  // Cancel invitation confirmation modal state
  const [cancellingInvitation, setCancellingInvitation] = useState<RecruiterInvitation | null>(null)

  // Fetch the full profile for the editing member
  const {
    profile: editingProfile,
    isLoading: profileLoading,
    error: profileError,
  } = useStaffRecruiterProfile(editingMember?.id ?? null)

  // Filter to only pending invitations
  const pendingInvitations = invitations.filter((inv) => inv.is_valid && !inv.used_at)

  const handleInvite = async () => {
    try {
      const result = await createInvitation(inviteEmail || undefined)
      setInviteSuccess({ signup_url: result.signup_url, email: result.email })
      setInviteEmail('')
      refetchInvitations()
    } catch {
      // Error handled by hook
    }
  }

  const openEditModal = (member: StaffUserWithProfile) => {
    setEditingMember(member)
    setEditRole(member.role)
    setRoleUpdateError(null)
  }

  const closeEditModal = () => {
    setEditingMember(null)
    setRoleUpdateError(null)
  }

  // Handle role change
  const handleRoleChange = async (newRole: 'admin' | 'recruiter') => {
    if (!editingMember || newRole === editRole) return

    try {
      setRoleUpdateError(null)
      await updateStaffUser(editingMember.id, { role: newRole })
      setEditRole(newRole)
      refetchUsers()
    } catch (err) {
      setRoleUpdateError(err instanceof Error ? err.message : 'Failed to update role')
    }
  }

  // Handle profile save from the form
  const handleProfileSave = async (data: RecruiterProfileUpdate) => {
    if (!editingMember) return

    await updateStaffProfile(editingMember.id, data)
    refetchUsers()
  }

  // Handle staff deactivation
  const handleDeactivate = async () => {
    if (!deactivatingMember) return

    try {
      await deactivateStaffUser(deactivatingMember.id)
      setDeactivatingMember(null)
      refetchUsers()
    } catch {
      // Error handled by hook
    }
  }

  // Handle cancel invitation
  const handleCancelInvitation = async () => {
    if (!cancellingInvitation) return

    try {
      await cancelInvitation(cancellingInvitation.token)
      setCancellingInvitation(null)
      refetchInvitations()
    } catch {
      // Error handled by hook
    }
  }

  // Handle staff reactivation
  const handleReactivate = async () => {
    if (!reactivatingMember) return

    try {
      await reactivateStaffUser(reactivatingMember.id)
      setReactivatingMember(null)
      refetchUsers()
    } catch {
      // Error handled by hook
    }
  }

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedUrl(url)
      setTimeout(() => setCopiedUrl(null), 2000)
    } catch {
      // Fallback
      const textArea = document.createElement('textarea')
      textArea.value = url
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopiedUrl(url)
      setTimeout(() => setCopiedUrl(null), 2000)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getInvitationStatusBadge = (invitation: RecruiterInvitation) => {
    if (invitation.used_at) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-100 text-green-700">
          <CheckCircle className="w-3 h-3" />
          Used
        </span>
      )
    }
    if (invitation.is_expired) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600">
          <Clock className="w-3 h-3" />
          Expired
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-100 text-purple-700">
        <Clock className="w-3 h-3" />
        Active
      </span>
    )
  }

  const isLoading = usersLoading || invitationsLoading
  const error = usersError || invitationsError

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-gray-900" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="flex items-center justify-center gap-2 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Staff Members Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-[16px] font-semibold text-gray-900">Staff Members</h3>
            <p className="text-[13px] text-gray-500">
              {staffUsers.filter(u => u.is_active).length} active
              {showArchived && staffUsers.filter(u => !u.is_active).length > 0 && (
                <span className="text-gray-400"> • {staffUsers.filter(u => !u.is_active).length} deactivated</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`inline-flex items-center gap-2 px-3 py-2 text-[13px] font-medium rounded-md transition-colors ${
                showArchived
                  ? 'text-purple-700 bg-purple-50 hover:bg-purple-100'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {showArchived ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showArchived ? 'Hide Deactivated' : 'Show Deactivated'}
            </button>
            <button
              onClick={() => setShowInviteModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-[14px] font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Invite Staff
            </button>
          </div>
        </div>

        {/* Table */}
        {staffUsers.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-[14px] text-gray-500">No staff members yet</p>
              <p className="text-[13px] text-gray-400 mt-1">Invite your first staff member to get started</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-[12px] font-medium text-gray-500 uppercase tracking-wider">
                    Member
                  </th>
                  <th className="px-6 py-3 text-left text-[12px] font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-[12px] font-medium text-gray-500 uppercase tracking-wider">
                    Professional Title
                  </th>
                  {showArchived && (
                    <th className="px-6 py-3 text-left text-[12px] font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  )}
                  <th className="px-6 py-3 text-right text-[12px] font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {staffUsers.map((member) => {
                  const isCurrentUser = member.id === currentUserId
                  const isArchived = !member.is_active
                  const roleConfig = USER_ROLE_CONFIG[member.role] || USER_ROLE_CONFIG.recruiter

                  return (
                    <tr key={member.id} className={`hover:bg-gray-50 ${isArchived ? 'bg-gray-50/50' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {member.avatar ? (
                            <img
                              src={member.avatar}
                              alt=""
                              className={`w-10 h-10 rounded-full object-cover ${isArchived ? 'opacity-50 grayscale' : ''}`}
                            />
                          ) : (
                            <div className={`w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center ${isArchived ? 'opacity-50' : ''}`}>
                              <span className="text-[14px] font-medium text-gray-600">
                                {member.first_name?.[0]}
                                {member.last_name?.[0]}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className={`text-[14px] font-medium ${isArchived ? 'text-gray-500' : 'text-gray-900'}`}>
                              {member.full_name}
                              {isCurrentUser && (
                                <span className="ml-2 text-[12px] text-gray-500">(you)</span>
                              )}
                            </p>
                            <p className="text-[13px] text-gray-500">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium ${isArchived ? 'opacity-60' : ''} ${roleConfig.color}`}
                        >
                          <Shield className="w-3.5 h-3.5" />
                          {roleConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className={`text-[14px] ${isArchived ? 'text-gray-400' : 'text-gray-600'}`}>
                          {member.profile?.professional_title || (
                            <span className="text-gray-400 italic">Not set</span>
                          )}
                        </p>
                      </td>
                      {showArchived && (
                        <td className="px-6 py-4">
                          {isArchived ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium bg-gray-100 text-gray-600">
                              <Archive className="w-3.5 h-3.5" />
                              Deactivated
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium bg-green-100 text-green-700">
                              <CheckCircle className="w-3.5 h-3.5" />
                              Active
                            </span>
                          )}
                        </td>
                      )}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isArchived ? (
                            <button
                              onClick={() => setReactivatingMember(member)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-green-600 hover:text-green-700 hover:bg-green-50 rounded-md transition-colors"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              Reactivate
                            </button>
                          ) : isCurrentUser ? (
                            <Link
                              to="/dashboard/settings/recruiter-profile"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                            >
                              Edit Profile
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          ) : (
                            <>
                              <button
                                onClick={() => openEditModal(member)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                Edit
                              </button>
                              <button
                                onClick={() => setDeactivatingMember(member)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                              >
                                <UserMinus className="w-3.5 h-3.5" />
                                Deactivate
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pending Invitations Section */}
      {pendingInvitations.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h4 className="text-[14px] font-medium text-gray-700 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pending Invitations ({pendingInvitations.length})
            </h4>
          </div>
          <div className="divide-y divide-gray-100">
            {pendingInvitations.map((invitation) => (
              <div key={invitation.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-[14px] text-gray-900">
                      {invitation.email || <span className="italic text-gray-500">No email specified</span>}
                    </p>
                    <p className="text-[12px] text-gray-500">
                      Created {formatDate(invitation.created_at)} • Expires {formatDate(invitation.expires_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getInvitationStatusBadge(invitation)}
                  <button
                    onClick={() => copyToClipboard(invitation.signup_url)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    {copiedUrl === invitation.signup_url ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-600" />
                        <span className="text-green-600">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy Link
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setCancellingInvitation(invitation)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Invitations History */}
      {invitations.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h4 className="text-[14px] font-medium text-gray-700">Invitation History</h4>
          </div>
          <div className="divide-y divide-gray-100">
            {invitations.map((invitation) => (
              <div key={invitation.id} className="px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-[14px] text-gray-900">
                      {invitation.email || <span className="italic text-gray-500">No email</span>}
                    </p>
                    <p className="text-[12px] text-gray-500">
                      Created {formatDate(invitation.created_at)}
                      {invitation.used_at && ` • Used ${formatDate(invitation.used_at)}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getInvitationStatusBadge(invitation)}
                  {invitation.is_valid && (
                    <button
                      onClick={() => copyToClipboard(invitation.signup_url)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                    >
                      {copiedUrl === invitation.signup_url ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-600" />
                          <span className="text-green-600">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-[16px] font-semibold text-gray-900">Invite Staff Member</h3>
              <button
                onClick={() => {
                  setShowInviteModal(false)
                  setInviteSuccess(null)
                  setInviteEmail('')
                }}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {inviteSuccess ? (
                <div className="text-center py-4">
                  <div className="w-12 h-12 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-4">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <h4 className="text-[16px] font-medium text-gray-900 mb-2">Invitation Created!</h4>
                  <p className="text-[14px] text-gray-600 mb-4">
                    Share this signup link with the new staff member. They'll be able to create their account with recruiter privileges.
                  </p>
                  <div className="mt-4">
                    <label className="block text-[13px] font-medium text-gray-700 mb-1.5 text-left">
                      Signup Link
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={inviteSuccess.signup_url}
                        readOnly
                        className="flex-1 px-3 py-2 text-[13px] border border-gray-200 rounded-md bg-gray-50 text-gray-600"
                      />
                      <button
                        onClick={() => copyToClipboard(inviteSuccess.signup_url)}
                        className="px-3 py-2 text-[14px] font-medium text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-1.5"
                      >
                        {copiedUrl === inviteSuccess.signup_url ? (
                          <>
                            <Check className="w-4 h-4 text-green-600" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-[12px] text-gray-500 mt-2 text-left">Link expires in 7 days</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <UserPlus className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-[14px] text-gray-600">
                        Generate a unique signup link for a new staff member. They'll join as a recruiter and can be promoted to admin later.
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                      Email Address (optional)
                    </label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="colleague@company.com"
                      className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                    <p className="text-[12px] text-gray-500 mt-1">
                      If provided, the email will be pre-filled on the signup form
                    </p>
                  </div>
                  {createError && (
                    <p className="text-[13px] text-red-600 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" />
                      {createError}
                    </p>
                  )}
                </>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              {inviteSuccess ? (
                <>
                  <button
                    onClick={() => setInviteSuccess(null)}
                    className="px-4 py-2 text-[14px] font-medium text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Invite Another
                  </button>
                  <button
                    onClick={() => {
                      setShowInviteModal(false)
                      setInviteSuccess(null)
                    }}
                    className="px-4 py-2 text-[14px] font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 transition-colors"
                  >
                    Done
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setShowInviteModal(false)
                      setInviteEmail('')
                    }}
                    className="px-4 py-2 text-[14px] font-medium text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleInvite}
                    disabled={isCreating}
                    className="px-4 py-2 text-[14px] font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isCreating ? 'Creating...' : 'Create Invitation'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Staff Member Modal */}
      {editingMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                {editingMember.avatar ? (
                  <img
                    src={editingMember.avatar}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-[14px] font-medium text-gray-600">
                      {editingMember.first_name?.[0]}
                      {editingMember.last_name?.[0]}
                    </span>
                  </div>
                )}
                <div>
                  <h3 className="text-[16px] font-semibold text-gray-900">
                    {editingMember.full_name}
                  </h3>
                  <p className="text-[13px] text-gray-500">{editingMember.email}</p>
                </div>
              </div>
              <button
                onClick={closeEditModal}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {/* Role Selection */}
              <div className="mb-6">
                <label className="block text-[13px] font-medium text-gray-700 mb-2">
                  System Role
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleRoleChange('admin')}
                    disabled={isUpdatingUser}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors disabled:opacity-50 ${
                      editRole === 'admin'
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Shield className={`w-4 h-4 ${editRole === 'admin' ? 'text-purple-600' : 'text-gray-400'}`} />
                      <span className={`text-[14px] font-medium ${editRole === 'admin' ? 'text-purple-700' : 'text-gray-700'}`}>
                        Admin
                      </span>
                    </div>
                    <p className="text-[12px] text-gray-500 mt-1 text-left">
                      Full access to settings
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRoleChange('recruiter')}
                    disabled={isUpdatingUser}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors disabled:opacity-50 ${
                      editRole === 'recruiter'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Users className={`w-4 h-4 ${editRole === 'recruiter' ? 'text-blue-600' : 'text-gray-400'}`} />
                      <span className={`text-[14px] font-medium ${editRole === 'recruiter' ? 'text-blue-700' : 'text-gray-700'}`}>
                        Recruiter
                      </span>
                    </div>
                    <p className="text-[12px] text-gray-500 mt-1 text-left">
                      Manage jobs & candidates
                    </p>
                  </button>
                </div>
                {roleUpdateError && (
                  <p className="text-[13px] text-red-600 flex items-center gap-1.5 mt-2">
                    <AlertCircle className="w-4 h-4" />
                    {roleUpdateError}
                  </p>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-[14px] font-medium text-gray-900 mb-4">Recruiter Profile</h4>

                {profileLoading ? (
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-20 bg-gray-200 rounded"></div>
                  </div>
                ) : profileError ? (
                  <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-[13px] text-red-700">{profileError}</p>
                  </div>
                ) : (
                  <RecruiterProfileForm
                    profile={editingProfile}
                    onSave={handleProfileSave}
                    isUpdating={isUpdatingProfile}
                    compact
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate Staff Member Confirmation Modal */}
      {deactivatingMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-[16px] font-semibold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Deactivate Staff Member
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                {deactivatingMember.avatar ? (
                  <img
                    src={deactivatingMember.avatar}
                    alt=""
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-[16px] font-medium text-gray-600">
                      {deactivatingMember.first_name?.[0]}
                      {deactivatingMember.last_name?.[0]}
                    </span>
                  </div>
                )}
                <div>
                  <p className="text-[14px] font-medium text-gray-900">{deactivatingMember.full_name}</p>
                  <p className="text-[13px] text-gray-500">{deactivatingMember.email}</p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="text-[13px] font-medium text-amber-800 mb-2">This action will:</h4>
                <ul className="text-[13px] text-amber-700 space-y-1 list-disc list-inside">
                  <li>Prevent {deactivatingMember.first_name} from logging in</li>
                  <li>Remove them from active staff list</li>
                  <li>Preserve their historical data (bookings, etc.)</li>
                </ul>
              </div>

              {deactivateError && (
                <p className="text-[13px] text-red-600 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  {deactivateError}
                </p>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setDeactivatingMember(null)}
                disabled={isDeactivating}
                className="px-4 py-2 text-[14px] font-medium text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeactivate}
                disabled={isDeactivating}
                className="px-4 py-2 text-[14px] font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {isDeactivating ? 'Deactivating...' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Invitation Confirmation Modal */}
      {cancellingInvitation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-[16px] font-semibold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Cancel Invitation
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-[14px] text-gray-600">
                Are you sure you want to cancel this invitation?
              </p>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-gray-900">
                      {cancellingInvitation.email || <span className="italic text-gray-500">No email specified</span>}
                    </p>
                    <p className="text-[12px] text-gray-500">
                      Created {formatDate(cancellingInvitation.created_at)}
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-[13px] text-gray-500">
                The invitation link will no longer work. You can create a new invitation if needed.
              </p>

              {cancelError && (
                <p className="text-[13px] text-red-600 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  {cancelError}
                </p>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setCancellingInvitation(null)}
                disabled={isCancelling}
                className="px-4 py-2 text-[14px] font-medium text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Keep Invitation
              </button>
              <button
                onClick={handleCancelInvitation}
                disabled={isCancelling}
                className="px-4 py-2 text-[14px] font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {isCancelling ? 'Cancelling...' : 'Cancel Invitation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reactivate Staff Member Confirmation Modal */}
      {reactivatingMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-[16px] font-semibold text-gray-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-green-500" />
                Reactivate Staff Member
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                {reactivatingMember.avatar ? (
                  <img
                    src={reactivatingMember.avatar}
                    alt=""
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-[16px] font-medium text-gray-600">
                      {reactivatingMember.first_name?.[0]}
                      {reactivatingMember.last_name?.[0]}
                    </span>
                  </div>
                )}
                <div>
                  <p className="text-[14px] font-medium text-gray-900">{reactivatingMember.full_name}</p>
                  <p className="text-[13px] text-gray-500">{reactivatingMember.email}</p>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="text-[13px] font-medium text-green-800 mb-2">This action will:</h4>
                <ul className="text-[13px] text-green-700 space-y-1 list-disc list-inside">
                  <li>Allow {reactivatingMember.first_name} to log in again</li>
                  <li>Restore them to the active staff list</li>
                  <li>Restore access to all platform features</li>
                </ul>
              </div>

              {reactivateError && (
                <p className="text-[13px] text-red-600 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  {reactivateError}
                </p>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setReactivatingMember(null)}
                disabled={isReactivating}
                className="px-4 py-2 text-[14px] font-medium text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReactivate}
                disabled={isReactivating}
                className="px-4 py-2 text-[14px] font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {isReactivating ? 'Reactivating...' : 'Reactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
