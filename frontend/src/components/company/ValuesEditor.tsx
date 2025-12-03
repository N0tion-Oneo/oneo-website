import { useState } from 'react'
import { Plus, X, GripVertical } from 'lucide-react'

interface ValuesEditorProps {
  values: string[]
  onChange: (values: string[]) => void
  disabled?: boolean
}

export default function ValuesEditor({ values, onChange, disabled = false }: ValuesEditorProps) {
  const [newValue, setNewValue] = useState('')

  const addValue = () => {
    const value = newValue.trim()
    if (!value) return
    if (values.some((v) => v.toLowerCase() === value.toLowerCase())) return

    onChange([...values, value])
    setNewValue('')
  }

  const removeValue = (index: number) => {
    onChange(values.filter((_, i) => i !== index))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addValue()
    }
  }

  return (
    <div className="space-y-3">
      <label className="block text-[13px] font-medium text-gray-700">Company Values</label>

      {/* Values list */}
      {values.length > 0 && (
        <ul className="space-y-2">
          {values.map((value, index) => (
            <li
              key={index}
              className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-lg group"
            >
              <GripVertical className="w-4 h-4 text-gray-300" />
              <span className="flex-1 text-[14px] text-gray-700">{value}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeValue(index)}
                  className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Add value input */}
      {!disabled && (
        <div className="flex gap-2">
          <input
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a company value..."
            className="flex-1 px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
          <button
            type="button"
            onClick={addValue}
            disabled={!newValue.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[14px] font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      )}

      <p className="text-[12px] text-gray-500">
        Add your core company values (e.g., "Innovation", "Customer First", "Transparency")
      </p>
    </div>
  )
}
