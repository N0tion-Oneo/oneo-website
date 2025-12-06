import { useState, useRef, type ChangeEvent } from 'react'
import { parseResume } from '@/services/api'
import type { ParsedResumeData } from '@/types'

interface ResumeImportButtonProps {
  onImportComplete: (data: ParsedResumeData) => void
  onError?: (error: string) => void
  className?: string
}

export function ResumeImportButton({
  onImportComplete,
  onError,
  className = '',
}: ResumeImportButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset input so same file can be selected again
    e.target.value = ''

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]
    if (!allowedTypes.includes(file.type)) {
      onError?.('Only PDF and DOCX files are supported')
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      onError?.('File too large. Maximum size is 5MB')
      return
    }

    setIsLoading(true)
    try {
      const data = await parseResume(file)
      onImportComplete(data)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to parse resume. Please try again.'
      onError?.(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleFileSelect}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isLoading}
        className={`inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin h-4 w-4 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Parsing Resume...</span>
          </>
        ) : (
          <>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                d="M12 4v16m8-8H4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>Import from Resume</span>
          </>
        )}
      </button>
    </>
  )
}
