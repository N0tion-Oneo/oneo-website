/**
 * JobQuestionsPanel - Application questions configuration panel
 *
 * Uses QuestionBuilder for creating/editing application questions
 * that candidates answer when applying to the job.
 */

import { useState, useEffect } from 'react'
import { Loader2, Save, HelpCircle } from 'lucide-react'
import QuestionBuilder from '@/components/jobs/QuestionBuilder'
import { useUpdateJob } from '@/hooks/useJobs'
import type { ApplicationQuestionInput, Job, ApplicationQuestion } from '@/types'

interface JobQuestionsPanelProps {
  jobId: string
  job: Job | null | undefined
  onRefresh?: () => void
}

export function JobQuestionsPanel({ jobId, job, onRefresh }: JobQuestionsPanelProps) {
  const { updateJob, isUpdating, error } = useUpdateJob()

  const [questions, setQuestions] = useState<ApplicationQuestionInput[]>([])
  const [hasChanges, setHasChanges] = useState(false)

  // Initialize from job questions
  useEffect(() => {
    if (job?.questions && job.questions.length > 0) {
      const mapped: ApplicationQuestionInput[] = job.questions.map((q: ApplicationQuestion) => ({
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options || [],
        placeholder: q.placeholder || '',
        helper_text: q.helper_text || '',
        is_required: q.is_required,
        order: q.order,
      }))
      setQuestions(mapped)
      setHasChanges(false)
    } else if (job && (!job.questions || job.questions.length === 0)) {
      setQuestions([])
      setHasChanges(false)
    }
  }, [job])

  const handleQuestionsChange = (updatedQuestions: ApplicationQuestionInput[]) => {
    setQuestions(updatedQuestions)
    setHasChanges(true)
  }

  const handleSave = async () => {
    try {
      await updateJob(jobId, { questions })
      setHasChanges(false)
      onRefresh?.()
    } catch (err) {
      console.error('Failed to save questions:', err)
    }
  }

  if (!job) {
    return (
      <div className="h-full flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Header with save button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[14px] font-medium text-gray-900 dark:text-gray-100">
            Application Questions
          </h3>
          <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">
            Questions candidates answer when applying
          </p>
        </div>
        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={isUpdating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            {isUpdating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Save Changes
          </button>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-[13px] text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Info box */}
      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-start gap-2">
        <HelpCircle className="w-4 h-4 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="text-[12px] text-blue-700 dark:text-blue-300">
          <p className="font-medium">Application Questions</p>
          <p className="mt-0.5 text-blue-600 dark:text-blue-400">
            These questions appear on the job application form. Candidates must answer them before submitting their application.
          </p>
        </div>
      </div>

      {/* Question builder */}
      <QuestionBuilder
        questions={questions}
        onChange={handleQuestionsChange}
      />
    </div>
  )
}

export default JobQuestionsPanel
