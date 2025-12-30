import { useRecruiterProfile } from '@/hooks'
import { RecruiterProfileForm } from '@/components/recruiter'

export default function RecruiterProfilePage() {
  const { profile, isLoading, error, updateProfile, isUpdating } = useRecruiterProfile()

  if (isLoading) {
    return (
      <div className="max-w-xl">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-xl">
        <div className="px-4 py-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-[13px] text-red-700 dark:text-red-400">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xl">
      <RecruiterProfileForm
        profile={profile}
        onSave={updateProfile}
        isUpdating={isUpdating}
      />
    </div>
  )
}
