import { Calendar, Clock, ExternalLink, User } from 'lucide-react'
import { useDashboardMeetingType } from '@/hooks'
import type { AssignedUser } from '@/types'

interface SchedulingCardProps {
  assignedUsers: AssignedUser[]
  category: 'recruitment' | 'sales'
}

/**
 * Card component for displaying scheduling links with assigned contacts.
 * Shows a list of assigned recruiters/staff with links to book meetings.
 *
 * Used in:
 * - Candidate dashboard sidebar (category='recruitment')
 * - Client/Company dashboard (category='sales')
 */
export default function SchedulingCard({ assignedUsers, category }: SchedulingCardProps) {
  const { meetingType, isLoading } = useDashboardMeetingType(category)

  // Don't show the card if:
  // 1. No assigned users
  // 2. No meeting type configured for dashboard
  // 3. No assigned users have a booking_slug
  const usersWithBookingSlug = assignedUsers.filter((user) => user.booking_slug)

  if (usersWithBookingSlug.length === 0 || (!isLoading && !meetingType)) {
    return null
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="w-4 h-4 text-blue-500" />
        <h3 className="text-[14px] font-medium text-gray-900">
          Schedule a Meeting
        </h3>
      </div>

      <p className="text-[12px] text-gray-500 mb-4">
        Book time with your assigned {category === 'recruitment' ? 'recruiter' : 'account manager'}
      </p>

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-12 bg-gray-100 rounded-lg" />
          <div className="h-12 bg-gray-100 rounded-lg" />
        </div>
      ) : meetingType ? (
        <div className="space-y-2">
          {usersWithBookingSlug.map((user) => (
            <a
              key={user.id}
              href={`${baseUrl}/meet/${user.booking_slug}/${meetingType.slug}`}
              className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
            >
              <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-gray-900 truncate">
                  {user.full_name}
                </p>
                <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>{meetingType.duration_minutes} min</span>
                  <span className="mx-1">-</span>
                  <span>{meetingType.name}</span>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-500 flex-shrink-0" />
            </a>
          ))}
        </div>
      ) : null}

      {!isLoading && meetingType && usersWithBookingSlug.length > 1 && (
        <p className="text-[11px] text-gray-400 mt-3 text-center">
          Choose any available contact to schedule
        </p>
      )}
    </div>
  )
}
