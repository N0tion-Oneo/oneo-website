// Export custom hooks here
export {
  useSkills,
  useIndustries,
  useTechnologies,
  useMyProfile,
  useCandidates,
  useAllCandidates,
  useCandidate,
  useExperiences,
  useExperienceMutations,
  useEducation,
  useEducationMutations,
} from './useCandidates'
export type { ProfileUpdateData } from './useCandidates'

// Company hooks
export {
  useCompanies,
  useCompany,
  useMyCompany,
  useCompanyUsers,
  useCompanyUserMutations,
  useCompanyInvitations,
  useCreateCompany,
  useCountries,
  useCities,
} from './useCompanies'
export type { CompanyInvitation, InviteResult } from './useCompanies'

// Client Invitation hooks
export { useInvitations, useCreateInvitation } from './useInvitations'
export type { ClientInvitation, CreateInvitationResponse } from './useInvitations'

// Recruiter Invitation hooks
export {
  useRecruiterInvitations,
  useCreateRecruiterInvitation,
  useValidateRecruiterInvitation,
  useRecruiterSignup,
  useRecruiters,
} from './useInvitations'
export type { RecruiterInvitation, CreateRecruiterInvitationResponse } from './useInvitations'

// Job hooks
export {
  useJobs,
  useJob,
  useCompanyJobs,
  useJobDetail,
  useCreateJob,
  useUpdateJob,
  useDeleteJob,
  useJobStatus,
  useJobStages,
} from './useJobs'
export type { JobStage } from './useJobs'

// Application hooks
export {
  useApplyToJob,
  useMyApplications,
  useApplication,
  useWithdrawApplication,
  useJobApplications,
  useAllApplications,
  useShortlistApplication,
  useRejectApplication,
  useMakeOffer,
  useAcceptOffer,
  useMoveToStage,
  useUpdateApplicationNotes,
} from './useApplications'

// Activity Log hooks
export {
  useActivityLog,
  useAddActivityNote,
  useRecordApplicationView,
} from './useActivityLog'

// Question Template hooks
export {
  useQuestionTemplates,
  useQuestionTemplate,
  useCreateQuestionTemplate,
  useUpdateQuestionTemplate,
  useDeleteQuestionTemplate,
} from './useQuestionTemplates'

// Stage Template hooks
export {
  useStageTemplates,
  useCreateStageTemplate,
  useUpdateStageTemplate,
  useDeleteStageTemplate,
  useBulkUpdateStageTemplates,
  useReorderStageTemplates,
} from './useStageTemplates'

// Stage Instance hooks
export {
  useStageInstances,
  useStageInstance,
  useScheduleStage,
  useRescheduleStage,
  useCancelStage,
  useCompleteStage,
  useReopenStage,
  useAssignAssessment,
  useSubmitAssessment,
  useMoveToStageTemplate,
  useJobInterviewers,
} from './useStageInstances'
export type { Interviewer } from './useStageInstances'

// Calendar Connection hooks
export {
  useCalendarConnections,
  useInitiateCalendarOAuth,
  useConnectCalendar,
  useDisconnectCalendar,
  useHasCalendarConnection,
} from './useCalendarConnections'

// Notification hooks
export {
  useNotifications,
  useUnreadCount,
  useUnreadCountPolling,
  useNotification,
  useMarkNotificationsRead,
} from './useNotifications'

// Admin Notification hooks
export {
  useAdminNotifications,
  useSendNotification,
  useBroadcast,
  useBulkDeleteNotifications,
  useNotificationTemplates,
  useNotificationTemplate,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useSearchUsers,
} from './useNotificationsAdmin'

// Booking hooks (Calendly-like self-scheduling)
export {
  useBookingInfo,
  useBookSlot,
  useSendBookingLink,
} from './useBooking'
export type { BookingInfo, BookingResult, SendBookingLinkResult } from './useBooking'

// Branding hooks
export {
  useBrandingSettings,
  useUpdateBranding,
  useResetBranding,
  usePublicBranding,
  useBrandingCSS,
} from './useBranding'

// Profile Suggestions hooks
export {
  useAdminSuggestions,
  useCandidateSuggestions,
} from './useProfileSuggestions'

// Recruiter Profile hooks
export { useRecruiterProfile } from './useRecruiterProfile'

// Staff Users hooks (for assignment dropdowns)
export { useStaffUsers } from './useStaffUsers'

// Recruiter Booking hooks (public booking pages)
export {
  useMeetingTypes,
  useRecruiterBookings,
  useRecruiterBooking,
  usePublicBookingPage,
  usePublicAvailability,
  useCreatePublicBooking,
  useCandidateInvitations,
} from './useRecruiterBookings'
