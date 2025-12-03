import { useState } from 'react'
import { Plus, X } from 'lucide-react'

interface TechStackEditorProps {
  techStack: string[]
  onChange: (techStack: string[]) => void
  disabled?: boolean
}

const SUGGESTED_TECH = [
  'React',
  'TypeScript',
  'Node.js',
  'Python',
  'Django',
  'PostgreSQL',
  'AWS',
  'Docker',
  'Kubernetes',
  'Redis',
  'GraphQL',
  'Tailwind CSS',
]

export default function TechStackEditor({
  techStack,
  onChange,
  disabled = false,
}: TechStackEditorProps) {
  const [newTech, setNewTech] = useState('')

  const addTech = (tech?: string) => {
    const value = (tech || newTech).trim()
    if (!value) return
    if (techStack.some((t) => t.toLowerCase() === value.toLowerCase())) return

    onChange([...techStack, value])
    setNewTech('')
  }

  const removeTech = (index: number) => {
    onChange(techStack.filter((_, i) => i !== index))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTech()
    }
  }

  const unusedSuggestions = SUGGESTED_TECH.filter(
    (tech) => !techStack.some((t) => t.toLowerCase() === tech.toLowerCase())
  )

  return (
    <div className="space-y-3">
      <label className="block text-[13px] font-medium text-gray-700">Tech Stack</label>

      {/* Tech tags */}
      {techStack.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {techStack.map((tech, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-[13px]"
            >
              {tech}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeTech(index)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Add tech input */}
      {!disabled && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={newTech}
              onChange={(e) => setNewTech(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add technology..."
              className="flex-1 px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => addTech()}
              disabled={!newTech.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-[14px] font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          {/* Suggestions */}
          {unusedSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-[12px] text-gray-500">Quick add:</span>
              {unusedSuggestions.slice(0, 8).map((tech) => (
                <button
                  key={tech}
                  type="button"
                  onClick={() => addTech(tech)}
                  className="px-2.5 py-1 text-[12px] text-gray-600 bg-gray-50 border border-gray-200 rounded-full hover:bg-gray-100 hover:text-gray-900 transition-colors"
                >
                  + {tech}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
