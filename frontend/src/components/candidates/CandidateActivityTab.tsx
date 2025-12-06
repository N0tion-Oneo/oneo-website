import ActivityTimeline from '@/components/applications/ActivityTimeline'

interface CandidateActivityTabProps {
  candidateId: number
}

export default function CandidateActivityTab({ candidateId }: CandidateActivityTabProps) {
  return <ActivityTimeline candidateId={candidateId} />
}
