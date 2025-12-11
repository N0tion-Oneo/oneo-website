import { useState, useEffect, useMemo } from 'react'
import { Star, ChevronDown, ChevronUp, Loader2, User, Save } from 'lucide-react'
import { StarRatingInput, StarRatingDisplay } from '@/components/forms'
import {
  useShortlistQuestions,
  useShortlistAnswers,
  useMyShortlistAnswers,
  useSubmitShortlistAnswers,
  useShortlistReviewSummary,
} from '@/hooks'
import type { ShortlistAnswer, ShortlistAnswerInput } from '@/types'

interface ShortlistScreeningSectionProps {
  applicationId: string
  jobId: string
  isRecruiterView?: boolean
  currentUserId?: string
}

export default function ShortlistScreeningSection({
  applicationId,
  jobId,
  isRecruiterView = false,
  currentUserId,
}: ShortlistScreeningSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [localScores, setLocalScores] = useState<Record<string, { score: number | null; notes: string }>>({})
  const [hasChanges, setHasChanges] = useState(false)

  // Early return if no jobId provided
  const { questions = [], isLoading: isLoadingQuestions, error: questionsError } = useShortlistQuestions(jobId || null)
  const { answers: allAnswers = [], isLoading: isLoadingAnswers, refetch: refetchAnswers } = useShortlistAnswers(applicationId || null)
  const { answers: myAnswers = [], isLoading: isLoadingMyAnswers, refetch: refetchMyAnswers } = useMyShortlistAnswers(applicationId || null)
  const { summary, isLoading: isLoadingSummary, refetch: refetchSummary } = useShortlistReviewSummary(applicationId || null)
  const { submitAnswers, isSubmitting } = useSubmitShortlistAnswers()

  // Initialize local scores from myAnswers
  useEffect(() => {
    if (myAnswers && myAnswers.length > 0) {
      const initial: Record<string, { score: number | null; notes: string }> = {}
      myAnswers.forEach((answer) => {
        if (answer?.question?.id) {
          initial[answer.question.id] = {
            score: answer.score,
            notes: answer.notes || '',
          }
        }
      })
      setLocalScores(initial)
    }
  }, [myAnswers])

  // Group answers by reviewer - must be before any conditional returns
  const answersByReviewer = useMemo(() => {
    const grouped: Record<string, ShortlistAnswer[]> = {}
    allAnswers.forEach((answer) => {
      const reviewerId = answer.reviewer || 'unknown'
      if (!grouped[reviewerId]) {
        grouped[reviewerId] = []
      }
      grouped[reviewerId].push(answer)
    })
    return grouped
  }, [allAnswers])

  const isLoading = isLoadingQuestions || isLoadingAnswers || isLoadingMyAnswers || isLoadingSummary

  // Check if current user has submitted
  const hasMySubmission = myAnswers && myAnswers.length > 0

  // Don't render if no jobId, error, or no questions configured
  if (!jobId || questionsError || (!isLoading && (!questions || questions.length === 0))) {
    return null
  }

  const handleScoreChange = (questionId: string, score: number) => {
    setLocalScores((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], score, notes: prev[questionId]?.notes || '' },
    }))
    setHasChanges(true)
  }

  const handleNotesChange = (questionId: string, notes: string) => {
    setLocalScores((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], score: prev[questionId]?.score ?? null, notes },
    }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    const answersToSubmit: ShortlistAnswerInput[] = []
    questions.forEach((q) => {
      const local = localScores[q.id]
      if (local?.score) {
        answersToSubmit.push({
          question_id: q.id,
          score: local.score,
          notes: local.notes || '',
        })
      }
    })

    if (answersToSubmit.length === 0) {
      return
    }

    try {
      await submitAnswers(applicationId, answersToSubmit)
      setHasChanges(false)
      // Refresh data
      refetchAnswers()
      refetchMyAnswers()
      refetchSummary()
    } catch (err) {
      console.error('Error saving shortlist answers:', err)
    }
  }

  return (
    <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-purple-50 hover:bg-purple-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-purple-600" />
          <span className="text-[13px] font-medium text-purple-900">
            Shortlist Screening
          </span>
          {summary && typeof summary.total_reviewers === 'number' && summary.total_reviewers > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-purple-200 text-purple-800 text-[11px] rounded-full">
              {summary.total_reviewers} reviewer{summary.total_reviewers !== 1 ? 's' : ''}
              {typeof summary.average_overall_score === 'number' && (
                <> &middot; Avg: {summary.average_overall_score.toFixed(1)}</>
              )}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-purple-600" />
        ) : (
          <ChevronDown className="w-4 h-4 text-purple-600" />
        )}
      </button>

      {isExpanded && (
        <div className="p-4 space-y-4 bg-white">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              {/* Summary of all reviewers */}
              {summary && Array.isArray(summary.reviews) && summary.reviews.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-2">
                    All Reviewers
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {summary.reviews.map((review) => (
                      <div
                        key={review.reviewer_id}
                        className={`flex items-center gap-2 px-2 py-1 rounded-full text-[12px] ${
                          review.reviewer_id === currentUserId
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {review.reviewer_avatar ? (
                          <img
                            src={review.reviewer_avatar}
                            alt=""
                            className="w-5 h-5 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center">
                            <User className="w-3 h-3 text-gray-500" />
                          </div>
                        )}
                        <span>{review.reviewer_name}</span>
                        {typeof review.average_score === 'number' && (
                          <StarRatingDisplay
                            value={review.average_score}
                            size="sm"
                            showValue={false}
                          />
                        )}
                        <span className="text-gray-500">
                          {typeof review.average_score === 'number' ? review.average_score.toFixed(1) : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Your Rating Form */}
              {isRecruiterView && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[13px] font-medium text-gray-900">
                      {hasMySubmission ? 'Your Rating' : 'Rate this Candidate'}
                    </p>
                    {hasChanges && (
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSubmitting}
                        className="flex items-center gap-1 px-3 py-1.5 text-[12px] font-medium bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Save className="w-3.5 h-3.5" />
                        )}
                        Save
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    {questions.map((question) => {
                      const local = localScores[question.id] || { score: null, notes: '' }
                      return (
                        <div key={question.id} className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-[13px] font-medium text-gray-800">
                                {question.question_text}
                                {question.is_required && (
                                  <span className="text-red-500 ml-1">*</span>
                                )}
                              </p>
                              {question.description && (
                                <p className="text-[11px] text-gray-500 mt-0.5">
                                  {question.description}
                                </p>
                              )}
                            </div>
                            <div className="ml-4">
                              <StarRatingInput
                                value={local.score}
                                onChange={(score) => handleScoreChange(question.id, score)}
                                size="md"
                              />
                            </div>
                          </div>
                          <textarea
                            value={local.notes}
                            onChange={(e) => handleNotesChange(question.id, e.target.value)}
                            placeholder="Add notes (optional)"
                            rows={2}
                            className="w-full px-3 py-2 text-[12px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                          />
                        </div>
                      )
                    })}
                  </div>

                  {!hasChanges && hasMySubmission && (
                    <p className="text-[11px] text-gray-500 mt-3 text-center">
                      Your rating has been saved
                    </p>
                  )}
                </div>
              )}

              {/* All Reviews (collapsed view) */}
              {!isRecruiterView && summary && Array.isArray(summary.questions) && summary.questions.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[12px] font-medium text-gray-600">Question Averages</p>
                  {summary.questions.map((q) => (
                    <div key={q.question_id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <span className="text-[13px] text-gray-700">{q.question_text}</span>
                      <div className="flex items-center gap-2">
                        <StarRatingDisplay
                          value={q.average_score}
                          size="sm"
                          showValue={true}
                        />
                        <span className="text-[11px] text-gray-500">
                          ({q.response_count} review{q.response_count !== 1 ? 's' : ''})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
