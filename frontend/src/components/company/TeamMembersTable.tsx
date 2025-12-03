import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { UserPlus, MoreVertical, Shield, Pencil, Eye, Trash2, AlertCircle, X, Clock, Mail, CheckCircle, Copy, Check } from 'lucide-react'
import { useCompanyUsers, useCompanyUserMutations, useCompanyInvitations } from '@/hooks'
import { CompanyUserRole } from '@/types'
import type { CompanyUser, CompanyUserUpdate } from '@/types'
import type { CompanyInvitation, InviteResult } from '@/hooks'

interface TeamMembersTableProps {
  currentUserId: string
  isAdmin: boolean
  companyId?: string  // Optional - for admin viewing other companies
}

const ROLE_LABELS: Record<CompanyUserRole, string> = {
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Viewer',
}

const ROLE_ICONS: Record<CompanyUserRole, typeof Shield> = {
  admin: Shield,
  editor: Pencil,
  viewer: Eye,
}

const ROLE_COLORS: Record<CompanyUserRole, string> = {
  admin: 'text-purple-700 bg-purple-50',
  editor: 'text-blue-700 bg-blue-50',
  viewer: 'text-gray-700 bg-gray-50',
}

export default function TeamMembersTable({ currentUserId, isAdmin, companyId }: TeamMembersTableProps) {
  const { users, isLoading, error, refetch } = useCompanyUsers(companyId)
  const { inviteUser, updateUserRole, updateUser, removeUser, isSubmitting } = useCompanyUserMutations(companyId)
  const { invitations, refetch: refetchInvitations, cancelInvitation, isCancelling } = useCompanyInvitations(companyId)

  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<CompanyUserRole>(CompanyUserRole.VIEWER)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<InviteResult | null>(null)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null)
  const menuButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  const [confirmCancelInvite, setConfirmCancelInvite] = useState<string | null>(null)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)

  // Edit member state
  const [editingMember, setEditingMember] = useState<CompanyUser | null>(null)
  const [editForm, setEditForm] = useState({
    user_first_name: '',
    user_last_name: '',
    user_phone: '',
    job_title: '',
    role: CompanyUserRole.VIEWER,
  })
  const [editError, setEditError] = useState<string | null>(null)

  // Populate edit form when opening modal
  useEffect(() => {
    if (editingMember) {
      setEditForm({
        user_first_name: editingMember.user_first_name || '',
        user_last_name: editingMember.user_last_name || '',
        user_phone: editingMember.user_phone || '',
        job_title: editingMember.job_title || '',
        role: editingMember.role,
      })
      setEditError(null)
    }
  }, [editingMember])

  const handleInvite = async () => {
    setInviteError(null)
    setInviteSuccess(null)
    try {
      const result = await inviteUser(inviteEmail, inviteRole)
      setInviteSuccess(result)
      setInviteEmail('')
      setInviteRole(CompanyUserRole.VIEWER)
      // Refetch both users (if added directly) and invitations (if pending invite created)
      refetch()
      refetchInvitations()
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to invite user'
      setInviteError(message)
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      await cancelInvitation(invitationId)
      setConfirmCancelInvite(null)
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
      // Fallback for older browsers
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

  const openMenu = (userId: string) => {
    const button = menuButtonRefs.current.get(userId)
    if (button) {
      const rect = button.getBoundingClientRect()
      setMenuPosition({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      })
      setActiveMenu(userId)
    }
  }

  const closeMenu = () => {
    setActiveMenu(null)
    setMenuPosition(null)
  }

  const handleRoleChange = async (user: CompanyUser, newRole: CompanyUserRole) => {
    try {
      await updateUserRole(user.id, newRole)
      closeMenu()
      refetch()
    } catch {
      // Error is handled by the hook
    }
  }

  const handleRemove = async (userId: string) => {
    try {
      await removeUser(userId)
      setConfirmRemove(null)
      refetch()
    } catch {
      // Error is handled by the hook
    }
  }

  const handleEditSave = async () => {
    if (!editingMember) return
    setEditError(null)
    try {
      const updateData: CompanyUserUpdate = {
        user_first_name: editForm.user_first_name,
        user_last_name: editForm.user_last_name,
        user_phone: editForm.user_phone || undefined,
        job_title: editForm.job_title || undefined,
        role: editForm.role,
      }
      await updateUser(editingMember.id, updateData)
      setEditingMember(null)
      refetch()
    } catch {
      setEditError('Failed to update member. Please try again.')
    }
  }

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
    <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div>
          <h3 className="text-[16px] font-semibold text-gray-900">Team Members</h3>
          <p className="text-[13px] text-gray-500">{users.length} members</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-[14px] font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Invite Member
          </button>
        )}
      </div>

      {/* Table */}
      <div>
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-6 py-3 text-left text-[12px] font-medium text-gray-500 uppercase tracking-wider">
                Member
              </th>
              <th className="px-6 py-3 text-left text-[12px] font-medium text-gray-500 uppercase tracking-wider">
                Job Title
              </th>
              <th className="px-6 py-3 text-left text-[12px] font-medium text-gray-500 uppercase tracking-wider">
                Phone
              </th>
              <th className="px-6 py-3 text-left text-[12px] font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-[12px] font-medium text-gray-500 uppercase tracking-wider">
                Joined
              </th>
              <th className="px-6 py-3 text-left text-[12px] font-medium text-gray-500 uppercase tracking-wider">
                Invited By
              </th>
              {isAdmin && (
                <th className="px-6 py-3 text-right text-[12px] font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => {
              const RoleIcon = ROLE_ICONS[user.role as CompanyUserRole]
              const isCurrentUser = user.user === currentUserId

              return (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {user.user_avatar ? (
                        <img
                          src={user.user_avatar}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-[14px] font-medium text-gray-600">
                            {user.user_first_name?.[0]}
                            {user.user_last_name?.[0]}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="text-[14px] font-medium text-gray-900">
                          {user.user_first_name} {user.user_last_name}
                          {isCurrentUser && (
                            <span className="ml-2 text-[12px] text-gray-500">(you)</span>
                          )}
                        </p>
                        <p className="text-[13px] text-gray-500">{user.user_email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[14px] text-gray-600">
                    {user.job_title || '-'}
                  </td>
                  <td className="px-6 py-4 text-[14px] text-gray-600">
                    {user.user_phone || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium ${
                        ROLE_COLORS[user.role as CompanyUserRole]
                      }`}
                    >
                      <RoleIcon className="w-3.5 h-3.5" />
                      {ROLE_LABELS[user.role as CompanyUserRole]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[14px] text-gray-600">
                    {new Date(user.joined_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-[14px] text-gray-600">
                    {user.invited_by_email || '-'}
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 text-right">
                      {!isCurrentUser && (
                        <button
                          ref={(el) => {
                            if (el) menuButtonRefs.current.set(user.id, el)
                            else menuButtonRefs.current.delete(user.id)
                          }}
                          onClick={() => activeMenu === user.id ? closeMenu() : openMenu(user.id)}
                          className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pending Invitations Section */}
      {isAdmin && invitations.length > 0 && (
        <div className="border-t border-gray-200">
          <div className="px-6 py-4 bg-gray-50">
            <h4 className="text-[14px] font-medium text-gray-700 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pending Invitations ({invitations.length})
            </h4>
          </div>
          <div className="divide-y divide-gray-100">
            {invitations.map((invitation) => (
              <div key={invitation.id} className="px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-[14px] text-gray-900">{invitation.email}</p>
                    <p className="text-[12px] text-gray-500">
                      Invited as {ROLE_LABELS[invitation.role]} • {new Date(invitation.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(invitation.signup_url)}
                    className="text-[13px] text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1"
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
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={() => setConfirmCancelInvite(invitation.id)}
                    className="text-[13px] text-gray-500 hover:text-red-600 transition-colors"
                  >
                    Cancel
                  </button>
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
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-[16px] font-semibold text-gray-900">Invite Team Member</h3>
            </div>
            <div className="p-6 space-y-4">
              {inviteSuccess ? (
                <div className="text-center py-4">
                  <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-4 ${
                    inviteSuccess.type === 'added' ? 'bg-green-100' : 'bg-blue-100'
                  }`}>
                    {inviteSuccess.type === 'added' ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : (
                      <Mail className="w-6 h-6 text-blue-600" />
                    )}
                  </div>
                  <h4 className="text-[16px] font-medium text-gray-900 mb-2">
                    {inviteSuccess.type === 'added' ? 'Member Added!' : 'Invitation Created!'}
                  </h4>
                  <p className="text-[14px] text-gray-600 mb-4">
                    {inviteSuccess.type === 'added'
                      ? 'The user has been added to your team.'
                      : 'Share this signup link with them. They will be added to your team when they create their account.'}
                  </p>
                  {inviteSuccess.type === 'invited' && (
                    <div className="mt-4">
                      <label className="block text-[13px] font-medium text-gray-700 mb-1.5 text-left">
                        Signup Link
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={(inviteSuccess.data as CompanyInvitation).signup_url}
                          readOnly
                          className="flex-1 px-3 py-2 text-[13px] border border-gray-200 rounded-md bg-gray-50 text-gray-600"
                        />
                        <button
                          onClick={() => copyToClipboard((inviteSuccess.data as CompanyInvitation).signup_url)}
                          className="px-3 py-2 text-[14px] font-medium text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-1.5"
                        >
                          {copiedUrl === (inviteSuccess.data as CompanyInvitation).signup_url ? (
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
                      <p className="text-[12px] text-gray-500 mt-2 text-left">
                        Link expires in 7 days
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="colleague@company.com"
                      className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                    <p className="text-[12px] text-gray-500 mt-1">
                      If they already have an account, they'll be added immediately. Otherwise, an invitation will be sent.
                    </p>
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Role</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as CompanyUserRole)}
                      className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    >
                      <option value="viewer">Viewer - Can view company profile</option>
                      <option value="editor">Editor - Can edit company profile</option>
                      <option value="admin">Admin - Full access including team management</option>
                    </select>
                  </div>
                  {inviteError && (
                    <p className="text-[13px] text-red-600 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" />
                      {inviteError}
                    </p>
                  )}
                </>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              {inviteSuccess ? (
                <>
                  <button
                    onClick={() => {
                      setInviteSuccess(null)
                    }}
                    className="px-4 py-2 text-[14px] font-medium text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Invite Another
                  </button>
                  <button
                    onClick={() => {
                      setShowInviteModal(false)
                      setInviteSuccess(null)
                      setInviteError(null)
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
                      setInviteError(null)
                    }}
                    className="px-4 py-2 text-[14px] font-medium text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleInvite}
                    disabled={!inviteEmail.trim() || isSubmitting}
                    className="px-4 py-2 text-[14px] font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmitting ? 'Inviting...' : 'Send Invite'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Remove Modal */}
      {confirmRemove && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-[16px] font-semibold text-gray-900">Remove Member</h3>
                  <p className="text-[14px] text-gray-600">
                    Are you sure you want to remove this team member?
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setConfirmRemove(null)}
                className="px-4 py-2 text-[14px] font-medium text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRemove(confirmRemove)}
                disabled={isSubmitting}
                className="px-4 py-2 text-[14px] font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Removing...' : 'Remove Member'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Cancel Invitation Modal */}
      {confirmCancelInvite && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <h3 className="text-[16px] font-semibold text-gray-900">Cancel Invitation</h3>
                  <p className="text-[14px] text-gray-600">
                    Are you sure you want to cancel this invitation?
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setConfirmCancelInvite(null)}
                className="px-4 py-2 text-[14px] font-medium text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
              >
                Keep Invitation
              </button>
              <button
                onClick={() => handleCancelInvitation(confirmCancelInvite)}
                disabled={isCancelling}
                className="px-4 py-2 text-[14px] font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isCancelling ? 'Cancelling...' : 'Cancel Invitation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {editingMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-[16px] font-semibold text-gray-900">Edit Team Member</h3>
              <button
                onClick={() => setEditingMember(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Email (read-only) */}
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={editingMember.user_email}
                  disabled
                  className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>

              {/* Name fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={editForm.user_first_name}
                    onChange={(e) => setEditForm({ ...editForm, user_first_name: e.target.value })}
                    className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={editForm.user_last_name}
                    onChange={(e) => setEditForm({ ...editForm, user_last_name: e.target.value })}
                    className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                  Phone
                </label>
                <input
                  type="tel"
                  value={editForm.user_phone}
                  onChange={(e) => setEditForm({ ...editForm, user_phone: e.target.value })}
                  placeholder="+27 12 345 6789"
                  className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>

              {/* Job Title */}
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                  Job Title
                </label>
                <input
                  type="text"
                  value={editForm.job_title}
                  onChange={(e) => setEditForm({ ...editForm, job_title: e.target.value })}
                  placeholder="e.g. Marketing Manager"
                  className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                  Role
                </label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value as CompanyUserRole })}
                  className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                >
                  <option value="viewer">Viewer - Can view company profile</option>
                  <option value="editor">Editor - Can edit company profile</option>
                  <option value="admin">Admin - Full access including team management</option>
                </select>
              </div>

              {editError && (
                <p className="text-[13px] text-red-600 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  {editError}
                </p>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setEditingMember(null)}
                className="px-4 py-2 text-[14px] font-medium text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                disabled={isSubmitting}
                className="px-4 py-2 text-[14px] font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Actions Dropdown Menu (rendered via portal to avoid overflow clipping) */}
      {activeMenu && menuPosition && createPortal(
        <>
          {/* Backdrop to close menu */}
          <div className="fixed inset-0 z-[100]" onClick={closeMenu} />
          {/* Dropdown menu */}
          <div
            className="fixed w-48 bg-white rounded-md shadow-lg border border-gray-200 z-[101]"
            style={{ top: menuPosition.top, right: menuPosition.right }}
          >
            <div className="py-1">
              <button
                onClick={() => {
                  const user = users.find(u => u.id === activeMenu)
                  if (user) {
                    closeMenu()
                    setEditingMember(user)
                  }
                }}
                className="w-full px-4 py-2 text-left text-[14px] hover:bg-gray-50 flex items-center gap-2"
              >
                <Pencil className="w-4 h-4" />
                Edit Profile
              </button>
              <hr className="my-1" />
              <p className="px-4 py-2 text-[12px] font-medium text-gray-500 uppercase">
                Change Role
              </p>
              {(['admin', 'editor', 'viewer'] as CompanyUserRole[]).map((role) => {
                const activeUser = users.find(u => u.id === activeMenu)
                return (
                  <button
                    key={role}
                    onClick={() => activeUser && handleRoleChange(activeUser, role)}
                    disabled={isSubmitting || activeUser?.role === role}
                    className={`w-full px-4 py-2 text-left text-[14px] hover:bg-gray-50 disabled:opacity-50 ${
                      activeUser?.role === role ? 'bg-gray-50 font-medium' : ''
                    }`}
                  >
                    {ROLE_LABELS[role]}
                  </button>
                )
              })}
              <hr className="my-1" />
              <button
                onClick={() => {
                  const userId = activeMenu
                  closeMenu()
                  setConfirmRemove(userId)
                }}
                className="w-full px-4 py-2 text-left text-[14px] text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Remove Member
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}
