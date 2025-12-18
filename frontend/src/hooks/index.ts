// Export custom hooks here
export {
  useSkills,
  useIndustries,
  useTechnologies,
  useMyProfile,
  useCandidates,
  useAllCandidates,
  useCompanyCandidates,
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
  useAllCompanies,
  useCompanyById,
} from './useCompanies'
export type { CompanyInvitation, InviteResult } from './useCompanies'

// Client Invitation hooks
export { useInvitations, useCreateInvitation, useCancelInvitation, useResendInvitation } from './useInvitations'
export type { ClientInvitation, CreateInvitationResponse } from './useInvitations'

// Recruiter Invitation hooks
export {
  useRecruiterInvitations,
  useCreateRecruiterInvitation,
  useValidateRecruiterInvitation,
  useRecruiterSignup,
  useRecruiters,
  useCancelRecruiterInvitation,
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
  useUpdateStageFeedback,
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
  usePlatformCompany,
  useCreatePlatformCompany,
} from './useBranding'
export type { PlatformCompany } from './useBranding'

// Profile Suggestions hooks
export {
  useAdminSuggestions,
  useCandidateSuggestions,
} from './useProfileSuggestions'

// Recruiter Profile hooks
export { useRecruiterProfile } from './useRecruiterProfile'

// Staff Users hooks (for assignment dropdowns and team management)
export {
  useStaffUsers,
  useUpdateStaffUser,
  useStaffWithProfiles,
  useUpdateStaffProfile,
  useStaffRecruiterProfile,
  useDeactivateStaffUser,
  useReactivateStaffUser,
} from './useStaffUsers'
export type {
  UpdateStaffUserData,
  StaffUserWithProfile,
  StaffRecruiterProfile,
  UpdateStaffProfileData,
} from './useStaffUsers'

// Recruiter Booking hooks (public booking pages)
export {
  useMeetingTypes,
  useRecruiterBookings,
  useRecruiterBooking,
  usePublicBookingPage,
  usePublicAvailability,
  useCreatePublicBooking,
  useCandidateInvitations,
  useDashboardMeetingType,
} from './useRecruiterBookings'

// Analytics hooks
export {
  useAnalyticsOverview,
  usePipelineFunnel,
  useRecruiterPerformance,
  useTimeMetrics,
  useAnalyticsTrends,
  getDateRangeFromPreset,
  // Onboarding Analytics
  useOnboardingOverview,
  useOnboardingTimeInStage,
  useOnboardingFunnel,
  useOnboardingTrends,
  useOnboardingBottlenecks,
} from './useAnalytics'

// Optimistic Update hooks
export { useOptimisticUpdate, useAssignedUpdate } from './useOptimisticUpdate'

// Recruiter Dashboard hooks
export {
  useDashboardSettings,
  useTodaysBookings,
  useTodaysInterviews,
  useInvitationsSummary,
  useNewApplications,
  usePipelineOverview,
  useRecentActivity,
  useCandidatesAttention,
} from './useRecruiterDashboard'
export type {
  DashboardSettings,
  TodaysBooking,
  TodaysInterview,
  InvitationItem,
  InvitationsSummary,
  NewApplication,
  JobPipeline,
  PipelineOverview,
  ActivityItem,
  CandidateAttentionItem,
  CandidatesNeedingAttention,
  TimeFilter,
} from './useRecruiterDashboard'

// Client Dashboard hooks
export {
  useActiveJobs,
  useClientRecentApplications,
  useClientUpcomingInterviews,
  useClientPipeline,
  usePendingOffers,
  useProfileCompletion,
  useTeamActivity,
  useAssignedRecruiter,
  useHiringMetrics,
} from './useClientDashboard'

// Stage Feedback hooks (threaded comments)
export {
  useApplicationFeedback,
  useStatusFeedback,
  useStageInstanceFeedback,
  useCreateFeedback,
  useUpdateFeedback,
  useDeleteFeedback,
} from './useStageFeedback'

// Shortlist Template hooks (company-level screening question templates)
export {
  useShortlistTemplates,
  useShortlistTemplate,
  useCreateShortlistTemplate,
  useUpdateShortlistTemplate,
  useDeleteShortlistTemplate,
} from './useShortlistTemplates'

// Shortlist Answer hooks (application-level screening scores)
export {
  useShortlistQuestions,
  useBulkUpdateShortlistQuestions,
  useShortlistAnswers,
  useMyShortlistAnswers,
  useSubmitShortlistAnswers,
  useShortlistReviewSummary,
} from './useShortlistAnswers'
export type {
  ActiveJob,
  RecentApplication,
  UpcomingInterview,
  PipelineCounts,
  JobPipelineItem,
  PendingOffer,
  ProfileCompletion,
  TeamActivity,
  AssignedRecruiter,
  HiringMetrics,
} from './useClientDashboard'

// Feed hooks
export {
  useFeed,
  useFeedSummary,
  useFeedPost,
  useMyPosts,
  useMyPost,
  useCreateFeedPost,
  useUpdateFeedPost,
  useDeleteFeedPost,
  // Comment hooks
  useComments,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
} from './useFeed'
