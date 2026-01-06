/**
 * JobScreeningPanel - Shortlist screening questions configuration panel
 *
 * Uses ShortlistQuestionBuilder for creating/editing screening questions
 * that reviewers use to rate shortlisted candidates (1-5 stars).
 */

import { useState, useEffect } from 'react'
import { Loader2, Save, Star } from 'lucide-react'
import ShortlistQuestionBuilder from '@/components/jobs/ShortlistQuestionBuilder'
import {
  useShortlistQuestions,
  useBulkUpdateShortlistQuestions,
  useShortlistTemplates,
  useShortlistTemplate,
} from '@/hooks'
import type { ShortlistQuestionInput, Job, ShortlistQuestion } from '@/types'

interface JobScreeningPanelProps {
  jobId: string
  job: Job | null | undefined
  onRefresh?: () => void
}

export function JobScreeningPanel({ jobId, onRefresh }: JobScreeningPanelProps) {
  const { questions: existingQuestions, isLoading, refetch } = useShortlistQuestions(jobId)
  const { updateQuestions, isUpdating, error } = useBulkUpdateShortlistQuestions()
  const { templates } = useShortlistTemplates({ is_active: true })

  const [questions, setQuestions] = useState<ShortlistQuestionInput[]>([])
  const [hasChanges, setHasChanges] = useState(false)
  const [loadingTemplateId, setLoadingTemplateId] = useState<string | null>(null)

  // Fetch template when selected
  const { template: selectedTemplate } = useShortlistTemplate(loadingTemplateId)

  // Initialize from existing questions
  useEffect(() => {
    if (existingQuestions && existingQuestions.length > 0) {
      const mapped: ShortlistQuestionInput[] = existingQuestions.map((q: ShortlistQuestion) => ({
        id: q.id,
        question_text: q.question_text,
        description: q.description || '',
        is_required: q.is_required,
        order: q.order,
      }))
      setQuestions(mapped)
      setHasChanges(false)
    } else if (!isLoading && existingQuestions?.length === 0) {
      setQuestions([])
      setHasChanges(false)
    }
  }, [existingQuestions, isLoading])

  // Handle template loading
  useEffect(() => {
    if (selectedTemplate && loadingTemplateId) {
      // Load questions from the template
      if (selectedTemplate.questions && selectedTemplate.questions.length > 0) {
        const templateQuestions: ShortlistQuestionInput[] = selectedTemplate.questions.map((q, i) => ({
          question_text: q.question_text,
          description: q.description || '',
          is_required: q.is_required,
          order: i + 1,
        }))
        setQuestions(templateQuestions)
        setHasChanges(true)
      }
      setLoadingTemplateId(null)
    }
  }, [selectedTemplate, loadingTemplateId])

  const handleQuestionsChange = (updatedQuestions: ShortlistQuestionInput[]) => {
    setQuestions(updatedQuestions)
    setHasChanges(true)
  }

  const handleLoadTemplate = (templateId: string) => {
    setLoadingTemplateId(templateId)
  }

  const handleSave = async () => {
    try {
      // Convert to the format expected by the API
      const questionsToSave = questions.map((q) => ({
        id: q.id,
        question_text: q.question_text,
        description: q.description || '',
        is_required: q.is_required ?? false,
        order: q.order ?? 0,
      }))
      await updateQuestions(jobId, questionsToSave as ShortlistQuestion[])
      setHasChanges(false)
      refetch()
      onRefresh?.()
    } catch (err) {
      console.error('Failed to save screening questions:', err)
    }
  }

  if (isLoading) {
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
            Screening Questions
          </h3>
          <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">
            Questions for reviewing shortlisted candidates
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
      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-2">
        <Star className="w-4 h-4 text-amber-500 dark:text-amber-400 mt-0.5 flex-shrink-0" />
        <div className="text-[12px] text-amber-700 dark:text-amber-300">
          <p className="font-medium">Shortlist Screening</p>
          <p className="mt-0.5 text-amber-600 dark:text-amber-400">
            These questions help Admins, Recruiters, and Clients evaluate shortlisted candidates using a 1-5 star rating system.
          </p>
        </div>
      </div>

      {/* Shortlist question builder */}
      <ShortlistQuestionBuilder
        questions={questions}
        onChange={handleQuestionsChange}
        templates={templates}
        onLoadTemplate={handleLoadTemplate}
      />
    </div>
  )
}

export default JobScreeningPanel
