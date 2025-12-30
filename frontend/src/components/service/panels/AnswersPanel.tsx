import { Paperclip, ExternalLink, FileText, HelpCircle } from 'lucide-react'
import type { ApplicationAnswer } from '@/types'
import { QuestionType } from '@/types'

// =============================================================================
// Types
// =============================================================================

interface AnswersPanelProps {
  answers: ApplicationAnswer[]
  isLoading?: boolean
}

// =============================================================================
// Helper Functions
// =============================================================================

function getQuestionTypeLabel(type: QuestionType): string {
  const labels: Record<QuestionType, string> = {
    [QuestionType.TEXT]: 'Short Text',
    [QuestionType.TEXTAREA]: 'Long Text',
    [QuestionType.SELECT]: 'Single Select',
    [QuestionType.MULTI_SELECT]: 'Multi Select',
    [QuestionType.FILE]: 'File Upload',
    [QuestionType.EXTERNAL_LINK]: 'Link',
  }
  return labels[type] || type
}

function getQuestionTypeIcon(type: QuestionType) {
  switch (type) {
    case QuestionType.FILE:
      return <Paperclip className="w-3 h-3" />
    case QuestionType.EXTERNAL_LINK:
      return <ExternalLink className="w-3 h-3" />
    default:
      return <FileText className="w-3 h-3" />
  }
}

// =============================================================================
// Answer Value Renderer
// =============================================================================

function AnswerValue({ answer }: { answer: ApplicationAnswer }) {
  const { question, answer_text, answer_file } = answer

  // Handle file answers
  if (question.question_type === QuestionType.FILE) {
    if (answer_file) {
      return (
        <a
          href={answer_file}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[13px] text-blue-600 hover:text-blue-800 hover:underline"
        >
          <Paperclip className="w-4 h-4" />
          View uploaded file
        </a>
      )
    }
    if (answer_text) {
      return (
        <a
          href={answer_text}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[13px] text-blue-600 hover:text-blue-800 hover:underline"
        >
          <Paperclip className="w-4 h-4" />
          {answer_text}
        </a>
      )
    }
    return <span className="text-[13px] text-gray-400 italic">No file provided</span>
  }

  // Handle external links
  if (question.question_type === QuestionType.EXTERNAL_LINK) {
    if (answer_text) {
      return (
        <a
          href={answer_text}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[13px] text-blue-600 hover:text-blue-800 hover:underline break-all"
        >
          <ExternalLink className="w-4 h-4 flex-shrink-0" />
          {answer_text}
        </a>
      )
    }
    return <span className="text-[13px] text-gray-400 italic">No link provided</span>
  }

  // Handle multi-select (comma-separated values displayed as tags)
  if (question.question_type === QuestionType.MULTI_SELECT && answer_text) {
    const values = answer_text.split(',').filter(Boolean)
    if (values.length === 0) {
      return <span className="text-[13px] text-gray-400 italic">No selection</span>
    }
    return (
      <div className="flex flex-wrap gap-1.5">
        {values.map((value, idx) => (
          <span
            key={idx}
            className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium text-gray-700 bg-gray-100 rounded-md"
          >
            {value.trim()}
          </span>
        ))}
      </div>
    )
  }

  // Handle select (single value)
  if (question.question_type === QuestionType.SELECT && answer_text) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium text-gray-700 bg-gray-100 rounded-md">
        {answer_text}
      </span>
    )
  }

  // Handle text/textarea
  if (answer_text) {
    return (
      <p className="text-[13px] text-gray-700 whitespace-pre-wrap">{answer_text}</p>
    )
  }

  return <span className="text-[13px] text-gray-400 italic">No answer</span>
}

// =============================================================================
// Main Component
// =============================================================================

export function AnswersPanel({ answers, isLoading }: AnswersPanelProps) {
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  if (!answers || answers.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500 p-6">
        <HelpCircle className="w-12 h-12 text-gray-300 mb-3" />
        <p className="text-[14px] font-medium text-gray-600">No Screening Questions</p>
        <p className="text-[13px] text-gray-500 text-center mt-1">
          This job doesn't have any screening questions, or the candidate didn't submit answers.
        </p>
      </div>
    )
  }

  // Sort answers by question order
  const sortedAnswers = [...answers].sort(
    (a, b) => (a.question?.order || 0) - (b.question?.order || 0)
  )

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[14px] font-semibold text-gray-900">Screening Answers</h3>
            <p className="text-[12px] text-gray-500">
              {answers.length} question{answers.length !== 1 ? 's' : ''} answered
            </p>
          </div>
        </div>

        {/* Answers List */}
        <div className="space-y-3">
          {sortedAnswers.map((answer, index) => (
            <div
              key={answer.id}
              className="bg-white border border-gray-200 rounded-lg overflow-hidden"
            >
              {/* Question Header */}
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-[11px] font-medium text-gray-500 bg-gray-200 rounded">
                      {index + 1}
                    </span>
                    <p className="text-[13px] font-medium text-gray-900">
                      {answer.question.question_text}
                      {answer.question.is_required && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </p>
                  </div>
                  <span className="flex-shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 bg-white border border-gray-200 rounded">
                    {getQuestionTypeIcon(answer.question.question_type)}
                    {getQuestionTypeLabel(answer.question.question_type)}
                  </span>
                </div>
                {answer.question.helper_text && (
                  <p className="text-[11px] text-gray-500 mt-1.5 ml-7">
                    {answer.question.helper_text}
                  </p>
                )}
              </div>

              {/* Answer Content */}
              <div className="px-4 py-3">
                <AnswerValue answer={answer} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AnswersPanel
