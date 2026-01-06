/**
 * EvaluationsPanel - Display and submit candidate evaluation ratings
 *
 * Shows star ratings from reviewers (evaluation criteria / shortlist screening).
 * Allows recruiters to submit their own ratings.
 * These are NOT the application answers from candidates.
 */

import { useState, useEffect, useMemo } from 'react'
import { Star, Loader2, User, Save, MessageSquare } from 'lucide-react'
import { StarRatingInput, StarRatingDisplay } from '@/components/forms'
import {
  useShortlistQuestions,
  useShortlistAnswers,
  useMyShortlistAnswers,
  useSubmitShortlistAnswers,
  useShortlistReviewSummary,
} from '@/hooks'
import type { ShortlistAnswer, ShortlistAnswerInput } from '@/types'

interface EvaluationsPanelProps {
  applicationId: string
  jobId: string
  currentUserId?: string
  isRecruiterView?: boolean
  onRefresh?: () => void
}

export function EvaluationsPanel({
  applicationId,
  jobId,
  currentUserId,
  isRecruiterView = true,
  onRefresh,
}: EvaluationsPanelProps) {
  const [localScores, setLocalScores] = useState<Record<string, { score: number | null; notes: string }>>({})
  const [hasChanges, setHasChanges] = useState(false)

  // Fetch data
  const { questions = [], isLoading: isLoadingQuestions } = useShortlistQuestions(jobId || null)
  const { answers: allAnswers = [], isLoading: isLoadingAnswers, refetch: refetchAnswers } = useShortlistAnswers(applicationId || null)
  const { answers: myAnswers = [], isLoading: isLoadingMyAnswers, refetch: refetchMyAnswers } = useMyShortlistAnswers(applicationId || null)
  const { summary, isLoading: isLoadingSummary, refetch: refetchSummary } = useShortlistReviewSummary(applicationId || null)
  const { submitAnswers, isSubmitting } = useSubmitShortlistAnswers()

  const isLoading = isLoadingQuestions || isLoadingAnswers || isLoadingMyAnswers || isLoadingSummary

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

  // Group answers by reviewer
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

  const hasMySubmission = myAnswers && myAnswers.length > 0

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

    if (answersToSubmit.length === 0) return

    try {
      await submitAnswers(applicationId, answersToSubmit)
      setHasChanges(false)
      refetchAnswers()
      refetchMyAnswers()
      refetchSummary()
      onRefresh?.()
    } catch (err) {
      console.error('Error saving evaluation:', err)
    }
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400 dark:text-gray-500" />
      </div>
    )
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 p-6">
        <Star className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
        <p className="text-[14px] font-medium text-gray-600 dark:text-gray-300">No Evaluation Criteria</p>
        <p className="text-[13px] text-gray-500 dark:text-gray-400 text-center mt-1">
          This job doesn't have any evaluation criteria configured.
        </p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[14px] font-medium text-gray-900 dark:text-gray-100">
            Candidate Evaluations
          </h3>
          <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">
            {summary?.total_reviewers || 0} reviewer{summary?.total_reviewers !== 1 ? 's' : ''}
            {summary?.average_overall_score != null && (
              <> &middot; Avg: {summary.average_overall_score.toFixed(1)} / 5</>
            )}
          </p>
        </div>
        {hasChanges && isRecruiterView && (
          <button
            onClick={handleSave}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 transition-colors"
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

      {/* Summary of all reviewers */}
      {summary && Array.isArray(summary.reviews) && summary.reviews.length > 0 && (
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-lg p-4">
          <p className="text-[11px] font-medium text-purple-700 dark:text-purple-300 uppercase tracking-wide mb-3">
            All Reviewers
          </p>
          <div className="flex flex-wrap gap-2">
            {summary.reviews.map((review) => (
              <div
                key={review.reviewer_id}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] ${
                  review.reviewer_id === currentUserId
                    ? 'bg-purple-100 dark:bg-purple-800/50 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-700'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                }`}
              >
                {review.reviewer_avatar ? (
                  <img
                    src={review.reviewer_avatar}
                    alt=""
                    className="w-5 h-5 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                    <User className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                  </div>
                )}
                <span className="font-medium">{review.reviewer_name}</span>
                {typeof review.average_score === 'number' && (
                  <>
                    <StarRatingDisplay value={review.average_score} size="sm" showValue={false} />
                    <span className="text-gray-500 dark:text-gray-400">
                      {review.average_score.toFixed(1)}
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Your Rating Form (for recruiters) */}
      {isRecruiterView && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[13px] font-medium text-gray-900 dark:text-gray-100">
              {hasMySubmission ? 'Your Rating' : 'Rate this Candidate'}
            </p>
            {!hasChanges && hasMySubmission && (
              <span className="text-[11px] text-green-600 dark:text-green-400">Saved</span>
            )}
          </div>

          <div className="space-y-4">
            {questions.map((question) => {
              const local = localScores[question.id] || { score: null, notes: '' }
              return (
                <div key={question.id} className="space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-gray-800 dark:text-gray-200">
                        {question.question_text}
                        {question.is_required && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </p>
                      {question.description && (
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                          {question.description}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
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
                    className="w-full px-3 py-2 text-[12px] text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 resize-none placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Question Averages Summary */}
      {summary && Array.isArray(summary.questions) && summary.questions.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <p className="text-[13px] font-medium text-gray-900 dark:text-gray-100 mb-3">
            Question Averages
          </p>
          <div className="space-y-2">
            {summary.questions.map((q) => (
              <div
                key={q.question_id}
                className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
              >
                <span className="text-[12px] text-gray-700 dark:text-gray-300 flex-1 min-w-0 pr-4">
                  {q.question_text}
                </span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <StarRatingDisplay value={q.average_score || 0} size="sm" showValue />
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                    ({q.response_count})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Individual Reviewer Details */}
      {Object.keys(answersByReviewer).length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <p className="text-[13px] font-medium text-gray-900 dark:text-gray-100 mb-3">
            Individual Reviews
          </p>
          <div className="space-y-4">
            {Object.entries(answersByReviewer).map(([reviewerId, reviewerAnswers]) => {
              const firstAnswer = reviewerAnswers[0]
              const reviewerName = firstAnswer?.reviewer_name || 'Unknown Reviewer'
              const reviewerAvatar = firstAnswer?.reviewer_avatar
              const avgScore = reviewerAnswers.reduce((sum, a) => sum + (a.score || 0), 0) / reviewerAnswers.length

              return (
                <div key={reviewerId} className="border-b border-gray-100 dark:border-gray-800 last:border-0 pb-4 last:pb-0">
                  <div className="flex items-center gap-2 mb-3">
                    {reviewerAvatar ? (
                      <img src={reviewerAvatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                      </div>
                    )}
                    <span className="text-[12px] font-medium text-gray-900 dark:text-gray-100">{reviewerName}</span>
                    <StarRatingDisplay value={avgScore} size="sm" showValue />
                  </div>
                  <div className="space-y-2 pl-8">
                    {reviewerAnswers.map((answer) => (
                      <div key={answer.id} className="flex items-start justify-between gap-2">
                        <span className="text-[11px] text-gray-600 dark:text-gray-400 flex-1">
                          {answer.question?.question_text}
                        </span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <StarRatingDisplay value={answer.score || 0} size="sm" />
                          {answer.notes && (
                            <span title={answer.notes}>
                              <MessageSquare className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default EvaluationsPanel
