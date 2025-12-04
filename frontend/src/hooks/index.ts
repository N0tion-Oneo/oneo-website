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
} from './useJobs'

// Application hooks
export {
  useApplyToJob,
  useMyApplications,
  useApplication,
  useWithdrawApplication,
  useJobApplications,
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
