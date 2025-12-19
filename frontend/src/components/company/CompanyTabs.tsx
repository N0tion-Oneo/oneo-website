import { useState } from 'react'
import { Edit, Users, Receipt, CreditCard } from 'lucide-react'
import CompanyForm from './CompanyForm'
import TeamMembersTable from './TeamMembersTable'
import BillingLegalForm from './BillingLegalForm'
import SubscriptionTab from './SubscriptionTab'
import type { Company, CompanyInput } from '@/types'
import type { BillingLegalInput } from './BillingLegalForm'

type Tab = 'profile' | 'team' | 'billing' | 'subscription'

interface CompanyTabsProps {
  company: Company
  onSave: (data: CompanyInput) => Promise<void>
  isUpdating: boolean
  currentUserId: string
  isAdmin: boolean
  companyId?: string  // For admin viewing other companies
  isStaff?: boolean   // Whether user is platform admin/recruiter (can edit subscriptions)
}

export default function CompanyTabs({
  company,
  onSave,
  isUpdating,
  currentUserId,
  isAdmin,
  companyId,
  isStaff = false,
}: CompanyTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('profile')

  const handleBillingSave = async (data: BillingLegalInput) => {
    await onSave(data as unknown as CompanyInput)
  }

  return (
    <>
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-3 text-[14px] font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'profile'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Edit className="w-4 h-4" />
            Profile
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`pb-3 text-[14px] font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'team'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users className="w-4 h-4" />
            Team
          </button>
          <button
            onClick={() => setActiveTab('billing')}
            className={`pb-3 text-[14px] font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'billing'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Receipt className="w-4 h-4" />
            Billing & Legal
          </button>
          <button
            onClick={() => setActiveTab('subscription')}
            className={`pb-3 text-[14px] font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'subscription'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Subscription
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'profile' && (
        <CompanyForm company={company} onSave={onSave} isSubmitting={isUpdating} isAdmin={isAdmin} />
      )}

      {activeTab === 'team' && (
        <TeamMembersTable
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          companyId={companyId}
        />
      )}

      {activeTab === 'billing' && (
        <BillingLegalForm company={company} onSave={handleBillingSave} isSubmitting={isUpdating} />
      )}

      {activeTab === 'subscription' && (
        <SubscriptionTab company={company} isAdmin={isStaff} />
      )}
    </>
  )
}
