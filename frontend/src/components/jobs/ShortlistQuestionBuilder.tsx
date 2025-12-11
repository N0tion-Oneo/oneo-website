import { useState } from 'react'
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Star,
  FileText,
} from 'lucide-react'
import type { ShortlistQuestionInput, ShortlistQuestionTemplate } from '@/types'

interface ShortlistQuestionBuilderProps {
  questions: ShortlistQuestionInput[]
  onChange: (questions: ShortlistQuestionInput[]) => void
  templates?: ShortlistQuestionTemplate[]
  onLoadTemplate?: (templateId: string) => void
}

const defaultQuestion: ShortlistQuestionInput = {
  question_text: '',
  description: '',
  is_required: false,
  order: 0,
}

export default function ShortlistQuestionBuilder({
  questions,
  onChange,
  templates = [],
  onLoadTemplate,
}: ShortlistQuestionBuilderProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  const handleAddQuestion = () => {
    const newQuestion: ShortlistQuestionInput = {
      ...defaultQuestion,
      order: questions.length + 1,
    }
    onChange([...questions, newQuestion])
    setExpandedIndex(questions.length) // Expand the new question
  }

  const handleRemoveQuestion = (index: number) => {
    const updated = questions.filter((_, i) => i !== index)
    // Re-order remaining questions
    const reordered = updated.map((q, i) => ({ ...q, order: i + 1 }))
    onChange(reordered)
    if (expandedIndex === index) {
      setExpandedIndex(null)
    }
  }

  const handleUpdateQuestion = (index: number, updates: Partial<ShortlistQuestionInput>) => {
    const updated = questions.map((q, i) =>
      i === index ? { ...q, ...updates } : q
    )
    onChange(updated)
  }

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === questions.length - 1)
    ) {
      return
    }
    const newIndex = direction === 'up' ? index - 1 : index + 1
    const updated = [...questions]
    const temp = updated[index]
    updated[index] = updated[newIndex]
    updated[newIndex] = temp
    // Update order numbers
    const reordered = updated.map((q, i) => ({ ...q, order: i + 1 }))
    onChange(reordered)
    setExpandedIndex(newIndex)
  }

  return (
    <div className="space-y-3">
      {/* Template Selector */}
      {templates.length > 0 && onLoadTemplate && (
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4 text-gray-400" />
          <select
            onChange={(e) => {
              if (e.target.value) {
                onLoadTemplate(e.target.value)
                e.target.value = '' // Reset select
              }
            }}
            className="flex-1 px-3 py-2 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
            defaultValue=""
          >
            <option value="">Load from template...</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} ({template.questions_count ?? template.questions?.length ?? 0} questions)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Questions List */}
      {questions.map((question, index) => (
        <div
          key={question.id || index}
          className="border border-gray-200 rounded-lg bg-white overflow-hidden"
        >
          {/* Question Header */}
          <div
            className="flex items-center gap-3 px-4 py-3 bg-gray-50 cursor-pointer"
            onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
          >
            <div className="flex flex-col items-center gap-0.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleMoveQuestion(index, 'up')
                }}
                disabled={index === 0}
                className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
              >
                <ChevronUp className="w-3 h-3" />
              </button>
              <span className="w-5 h-5 flex items-center justify-center bg-gray-200 text-[10px] font-medium rounded">
                {question.order || index + 1}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleMoveQuestion(index, 'down')
                }}
                disabled={index === questions.length - 1}
                className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
              >
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-gray-900 truncate">
                {question.question_text || 'Untitled Question'}
              </p>
              <p className="text-[11px] text-gray-500 flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-400" />
                1-5 Star Rating
                {question.is_required && ' • Required'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemoveQuestion(index)
                }}
                className="p-1.5 text-gray-400 hover:text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              {expandedIndex === index ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </div>
          </div>

          {/* Question Details (Expanded) */}
          {expandedIndex === index && (
            <div className="p-4 space-y-4 border-t border-gray-200">
              {/* Question Text */}
              <div>
                <label className="block text-[12px] font-medium text-gray-700 mb-1">
                  Question *
                </label>
                <input
                  type="text"
                  value={question.question_text}
                  onChange={(e) =>
                    handleUpdateQuestion(index, { question_text: e.target.value })
                  }
                  placeholder="e.g., How well does the candidate's experience match the role?"
                  className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>

              {/* Description/Instructions */}
              <div>
                <label className="block text-[12px] font-medium text-gray-700 mb-1">
                  Description / Instructions
                </label>
                <textarea
                  value={question.description || ''}
                  onChange={(e) =>
                    handleUpdateQuestion(index, { description: e.target.value })
                  }
                  placeholder="e.g., Consider the candidate's years of experience, relevant skills, and industry background."
                  rows={2}
                  className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                />
              </div>

              {/* Required Toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={question.is_required}
                  onChange={(e) =>
                    handleUpdateQuestion(index, { is_required: e.target.checked })
                  }
                  className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                />
                <span className="text-[13px] text-gray-700">Required question</span>
              </label>

              {/* Preview */}
              <div className="pt-2 border-t border-gray-100">
                <p className="text-[11px] font-medium text-gray-500 mb-2">Preview</p>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className="w-5 h-5 text-gray-300"
                      strokeWidth={1.5}
                    />
                  ))}
                  <span className="ml-2 text-[12px] text-gray-500">1-5 Stars</span>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add Question Button */}
      <button
        type="button"
        onClick={handleAddQuestion}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 text-[13px] font-medium text-gray-600 border border-dashed border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400"
      >
        <Plus className="w-4 h-4" />
        Add Screening Question
      </button>

      {questions.length === 0 && (
        <div className="text-center py-4 space-y-2">
          <p className="text-[12px] text-gray-500">
            No screening questions yet. Add questions for reviewers to rate shortlisted candidates.
          </p>
          <p className="text-[11px] text-gray-400">
            Each question will be scored 1-5 stars by Admins, Recruiters, or Clients reviewing the candidate.
          </p>
        </div>
      )}
    </div>
  )
}
