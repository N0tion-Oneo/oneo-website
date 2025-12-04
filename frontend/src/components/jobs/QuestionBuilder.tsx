import { useState, useCallback } from 'react'
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  AlertCircle,
} from 'lucide-react'
import { QuestionType } from '@/types'
import type { ApplicationQuestionInput } from '@/types'

interface QuestionBuilderProps {
  questions: ApplicationQuestionInput[]
  onChange: (questions: ApplicationQuestionInput[]) => void
}

const questionTypeOptions = [
  { value: QuestionType.TEXT, label: 'Short Text', description: 'Single line text input' },
  { value: QuestionType.TEXTAREA, label: 'Long Text', description: 'Multi-line text area' },
  { value: QuestionType.SELECT, label: 'Single Select', description: 'Dropdown with one choice' },
  { value: QuestionType.MULTI_SELECT, label: 'Multi Select', description: 'Multiple choices allowed' },
  { value: QuestionType.FILE, label: 'File Upload', description: 'PDF, DOC, images, ZIP (max 25MB)' },
  { value: QuestionType.EXTERNAL_LINK, label: 'External Link', description: 'URL submission (e.g., assessment results)' },
]

const defaultQuestion: ApplicationQuestionInput = {
  question_text: '',
  question_type: QuestionType.TEXT,
  options: [],
  placeholder: '',
  helper_text: '',
  is_required: false,
  order: 0,
}

export default function QuestionBuilder({ questions, onChange }: QuestionBuilderProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  const handleAddQuestion = () => {
    const newQuestion: ApplicationQuestionInput = {
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

  const handleUpdateQuestion = (index: number, updates: Partial<ApplicationQuestionInput>) => {
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

  const handleAddOption = (index: number) => {
    const question = questions[index]
    const options = [...(question.options || []), '']
    handleUpdateQuestion(index, { options })
  }

  const handleUpdateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const question = questions[questionIndex]
    const options = [...(question.options || [])]
    options[optionIndex] = value
    handleUpdateQuestion(questionIndex, { options })
  }

  const handleRemoveOption = (questionIndex: number, optionIndex: number) => {
    const question = questions[questionIndex]
    const options = (question.options || []).filter((_, i) => i !== optionIndex)
    handleUpdateQuestion(questionIndex, { options })
  }

  const needsOptions = (type: QuestionType) =>
    type === QuestionType.SELECT || type === QuestionType.MULTI_SELECT

  return (
    <div className="space-y-3">
      {questions.map((question, index) => (
        <div
          key={index}
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
              <p className="text-[11px] text-gray-500">
                {questionTypeOptions.find((o) => o.value === question.question_type)?.label}
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
                  placeholder="e.g., What interests you about this role?"
                  className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>

              {/* Question Type */}
              <div>
                <label className="block text-[12px] font-medium text-gray-700 mb-1">
                  Answer Type
                </label>
                <select
                  value={question.question_type}
                  onChange={(e) =>
                    handleUpdateQuestion(index, {
                      question_type: e.target.value as QuestionType,
                      options: needsOptions(e.target.value as QuestionType)
                        ? question.options || []
                        : [],
                    })
                  }
                  className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  {questionTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} - {opt.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Options (for select types) */}
              {needsOptions(question.question_type) && (
                <div>
                  <label className="block text-[12px] font-medium text-gray-700 mb-1">
                    Options *
                  </label>
                  <div className="space-y-2">
                    {(question.options || []).map((option, optIndex) => (
                      <div key={optIndex} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={option}
                          onChange={(e) =>
                            handleUpdateOption(index, optIndex, e.target.value)
                          }
                          placeholder={`Option ${optIndex + 1}`}
                          className="flex-1 px-3 py-1.5 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(index, optIndex)}
                          className="p-1 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleAddOption(index)}
                      className="flex items-center gap-1 text-[12px] text-gray-600 hover:text-gray-900"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Option
                    </button>
                  </div>
                  {(question.options || []).length === 0 && (
                    <p className="mt-1 text-[11px] text-amber-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      At least one option is required
                    </p>
                  )}
                </div>
              )}

              {/* Placeholder (for text types) */}
              {(question.question_type === QuestionType.TEXT ||
                question.question_type === QuestionType.TEXTAREA ||
                question.question_type === QuestionType.EXTERNAL_LINK) && (
                <div>
                  <label className="block text-[12px] font-medium text-gray-700 mb-1">
                    Placeholder Text
                  </label>
                  <input
                    type="text"
                    value={question.placeholder || ''}
                    onChange={(e) =>
                      handleUpdateQuestion(index, { placeholder: e.target.value })
                    }
                    placeholder="e.g., Type your answer here..."
                    className="w-full px-3 py-1.5 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
              )}

              {/* Helper Text */}
              <div>
                <label className="block text-[12px] font-medium text-gray-700 mb-1">
                  Helper Text
                </label>
                <input
                  type="text"
                  value={question.helper_text || ''}
                  onChange={(e) =>
                    handleUpdateQuestion(index, { helper_text: e.target.value })
                  }
                  placeholder="e.g., Additional instructions or context"
                  className="w-full px-3 py-1.5 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
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
        Add Application Question
      </button>

      {questions.length === 0 && (
        <p className="text-center text-[12px] text-gray-500 py-2">
          No custom questions yet. Add questions that candidates must answer when applying.
        </p>
      )}
    </div>
  )
}
