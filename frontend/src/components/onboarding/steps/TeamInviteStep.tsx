import { useState, type RefObject } from 'react'
import { Loader2, Plus, X, Mail, ArrowRight, Shield, Edit3, Eye } from 'lucide-react'

interface TeamInviteStepProps {
  onSubmit: () => Promise<void>
  onSkip: () => Promise<void>
  isSubmitting: boolean
  previewMode?: boolean
  formRef?: RefObject<HTMLFormElement | null>
}

interface TeamMember {
  email: string
  role: 'admin' | 'editor' | 'viewer'
}

export function TeamInviteStep({ onSubmit, onSkip, isSubmitting, previewMode = false, formRef }: TeamInviteStepProps) {
  const [members, setMembers] = useState<TeamMember[]>([{ email: '', role: 'viewer' }])

  const addMember = () => {
    setMembers([...members, { email: '', role: 'viewer' }])
  }

  const removeMember = (index: number) => {
    setMembers(members.filter((_, i) => i !== index))
  }

  const updateMember = (index: number, field: keyof TeamMember, value: string) => {
    const updated = [...members]
    updated[index] = { ...updated[index], [field]: value } as TeamMember
    setMembers(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (previewMode) return
    // For now, just mark as complete - actual invites can be sent from company settings
    await onSubmit()
  }

  const validMembers = members.filter((m) => m.email.trim())
  const hasValidMembers = validMembers.length > 0

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      {/* Team Members Card */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <h3 className="text-[13px] font-medium text-gray-900 mb-3">Team Members</h3>
        <div className="space-y-3">
          {members.map((member, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="flex-1">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={member.email}
                    onChange={(e) => updateMember(index, 'email', e.target.value)}
                    placeholder="colleague@company.com"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
              </div>
              <select
                value={member.role}
                onChange={(e) => updateMember(index, 'role', e.target.value)}
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              >
                <option value="admin">Admin</option>
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
              {members.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeMember(index)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add Another */}
        <button
          type="button"
          onClick={addMember}
          className="mt-3 flex items-center gap-2 text-[13px] text-gray-600 hover:text-gray-800"
        >
          <Plus className="w-4 h-4" />
          Add another team member
        </button>
      </div>

      {/* Role Descriptions Card */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <h3 className="text-[13px] font-medium text-gray-900 mb-3">Role Permissions</h3>
        <div className="space-y-2">
          <div className="flex items-start gap-3 p-2 bg-white border border-gray-200 rounded-lg">
            <Shield className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[13px] font-medium text-gray-900">Admin</p>
              <p className="text-[12px] text-gray-500">Full access including billing and team management</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-2 bg-white border border-gray-200 rounded-lg">
            <Edit3 className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[13px] font-medium text-gray-900">Editor</p>
              <p className="text-[12px] text-gray-500">Can manage jobs and view candidates</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-2 bg-white border border-gray-200 rounded-lg">
            <Eye className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[13px] font-medium text-gray-900">Viewer</p>
              <p className="text-[12px] text-gray-500">Read-only access to jobs and candidates</p>
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
          ) : hasValidMembers ? (
            <>
              Send Invites
              <ArrowRight className="w-4 h-4" />
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </form>
  )
}
