import { CreditCard, Briefcase, Users } from 'lucide-react'

interface NoServiceTypeProps {
  companyName: string
  onSelectServiceType: (type: 'retained' | 'headhunting') => void
  isAdmin: boolean
  isUpdating?: boolean
  compact?: boolean
}

export function NoServiceType({
  companyName,
  onSelectServiceType,
  isAdmin,
  isUpdating = false,
  compact = false,
}: NoServiceTypeProps) {
  if (compact) {
    // Compact version for drawers
    return (
      <div className="text-center py-6">
        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <CreditCard className="w-5 h-5 text-gray-400" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">Choose Service Type</h3>
        <p className="text-sm text-gray-500 mb-4">
          Select a service type for <strong>{companyName}</strong>
        </p>

        {isAdmin ? (
          <div className="flex gap-3">
            <button
              onClick={() => onSelectServiceType('retained')}
              disabled={isUpdating}
              className="flex-1 p-3 border-2 border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all text-left group disabled:opacity-50"
            >
              <div className="flex items-center gap-2 mb-1">
                <Briefcase className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-semibold text-gray-900">Retained</span>
              </div>
              <p className="text-xs text-gray-500">Monthly retainer + reduced fees</p>
            </button>

            <button
              onClick={() => onSelectServiceType('headhunting')}
              disabled={isUpdating}
              className="flex-1 p-3 border-2 border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-all text-left group disabled:opacity-50"
            >
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-semibold text-gray-900">Headhunting</span>
              </div>
              <p className="text-xs text-gray-500">Pay per placement</p>
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            Contact an administrator to set up the service type.
          </p>
        )}
      </div>
    )
  }

  // Full version for tabs
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-8">
      <div className="text-center mb-8">
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CreditCard className="w-6 h-6 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Choose Service Type</h3>
        <p className="text-sm text-gray-500">
          Select a service type for <strong>{companyName}</strong> to enable features and billing.
        </p>
      </div>

      {isAdmin ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {/* Retained Option */}
          <button
            onClick={() => onSelectServiceType('retained')}
            disabled={isUpdating}
            className="p-6 border-2 border-gray-200 rounded-xl hover:border-purple-300 hover:bg-purple-50 transition-all text-left group disabled:opacity-50"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200">
                <Briefcase className="w-5 h-5 text-purple-600" />
              </div>
              <h4 className="text-base font-semibold text-gray-900">Retained</h4>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Monthly retainer fee plus reduced placement fees. Best for ongoing recruitment partnerships.
            </p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>• Monthly retainer (default R20,000)</li>
              <li>• 10% placement fee (15% C-Suite)</li>
              <li>• Contract term with renewal</li>
              <li>• Priority candidate access</li>
            </ul>
          </button>

          {/* Headhunting Option */}
          <button
            onClick={() => onSelectServiceType('headhunting')}
            disabled={isUpdating}
            className="p-6 border-2 border-gray-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-all text-left group disabled:opacity-50"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-200">
                <Users className="w-5 h-5 text-indigo-600" />
              </div>
              <h4 className="text-base font-semibold text-gray-900">Headhunting</h4>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Pay per successful placement. No monthly commitment required.
            </p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>• No monthly retainer</li>
              <li>• 20% placement fee (25% C-Suite)</li>
              <li>• Pay only for results</li>
              <li>• Flexible engagement</li>
            </ul>
          </button>
        </div>
      ) : (
        <p className="text-sm text-gray-500 text-center">
          Contact an administrator to set up the service type for this company.
        </p>
      )}
    </div>
  )
}
