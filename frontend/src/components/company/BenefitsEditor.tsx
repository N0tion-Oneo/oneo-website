import { useState } from 'react'
import { Plus, X, ChevronDown, ChevronUp } from 'lucide-react'
import type { BenefitCategory } from '@/types'

interface BenefitsEditorProps {
  benefits: BenefitCategory[]
  onChange: (benefits: BenefitCategory[]) => void
  disabled?: boolean
}

const SUGGESTED_CATEGORIES = [
  'Health & Wellness',
  'Financial',
  'Time Off',
  'Professional Development',
  'Work Environment',
  'Family & Parental',
  'Perks & Lifestyle',
]

export default function BenefitsEditor({
  benefits,
  onChange,
  disabled = false,
}: BenefitsEditorProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set([0]))
  const [newCategory, setNewCategory] = useState('')
  const [newItems, setNewItems] = useState<Record<number, string>>({})

  const toggleCategory = (index: number) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedCategories(newExpanded)
  }

  const addCategory = (categoryName?: string) => {
    const name = categoryName || newCategory.trim()
    if (!name) return
    if (benefits.some((b) => b.category.toLowerCase() === name.toLowerCase())) return

    const newBenefits = [...benefits, { category: name, items: [] }]
    onChange(newBenefits)
    setNewCategory('')
    setExpandedCategories(new Set([...expandedCategories, benefits.length]))
  }

  const removeCategory = (index: number) => {
    const newBenefits = benefits.filter((_, i) => i !== index)
    onChange(newBenefits)
  }

  const updateCategoryName = (index: number, name: string) => {
    const newBenefits = [...benefits]
    newBenefits[index] = { ...newBenefits[index], category: name }
    onChange(newBenefits)
  }

  const addItem = (categoryIndex: number) => {
    const item = newItems[categoryIndex]?.trim()
    if (!item) return

    const newBenefits = [...benefits]
    newBenefits[categoryIndex] = {
      ...newBenefits[categoryIndex],
      items: [...newBenefits[categoryIndex].items, item],
    }
    onChange(newBenefits)
    setNewItems({ ...newItems, [categoryIndex]: '' })
  }

  const removeItem = (categoryIndex: number, itemIndex: number) => {
    const newBenefits = [...benefits]
    newBenefits[categoryIndex] = {
      ...newBenefits[categoryIndex],
      items: newBenefits[categoryIndex].items.filter((_, i) => i !== itemIndex),
    }
    onChange(newBenefits)
  }

  const handleItemKeyDown = (e: React.KeyboardEvent, categoryIndex: number) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addItem(categoryIndex)
    }
  }

  const unusedCategories = SUGGESTED_CATEGORIES.filter(
    (cat) => !benefits.some((b) => b.category.toLowerCase() === cat.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <label className="block text-[13px] font-medium text-gray-700">Benefits & Perks</label>

      {/* Existing categories */}
      <div className="space-y-3">
        {benefits.map((benefit, categoryIndex) => (
          <div key={categoryIndex} className="border border-gray-200 rounded-lg overflow-hidden">
            <div
              className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer"
              onClick={() => toggleCategory(categoryIndex)}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {expandedCategories.has(categoryIndex) ? (
                  <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
                )}
                <input
                  type="text"
                  value={benefit.category}
                  onChange={(e) => {
                    e.stopPropagation()
                    updateCategoryName(categoryIndex, e.target.value)
                  }}
                  onClick={(e) => e.stopPropagation()}
                  disabled={disabled}
                  className="flex-1 bg-transparent border-none p-0 text-[14px] font-medium text-gray-900 focus:ring-0 focus:outline-none"
                />
                <span className="text-[12px] text-gray-500 flex-shrink-0">
                  {benefit.items.length} items
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  removeCategory(categoryIndex)
                }}
                disabled={disabled}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {expandedCategories.has(categoryIndex) && (
              <div className="p-4 space-y-3">
                {/* Items list */}
                {benefit.items.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {benefit.items.map((item, itemIndex) => (
                      <span
                        key={itemIndex}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-[13px]"
                      >
                        {item}
                        {!disabled && (
                          <button
                            type="button"
                            onClick={() => removeItem(categoryIndex, itemIndex)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                )}

                {/* Add item input */}
                {!disabled && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newItems[categoryIndex] || ''}
                      onChange={(e) =>
                        setNewItems({ ...newItems, [categoryIndex]: e.target.value })
                      }
                      onKeyDown={(e) => handleItemKeyDown(e, categoryIndex)}
                      placeholder="Add a benefit..."
                      className="flex-1 px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => addItem(categoryIndex)}
                      className="px-3 py-2 text-[14px] font-medium text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add new category */}
      {!disabled && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="New category name..."
              className="flex-1 px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => addCategory()}
              disabled={!newCategory.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-[14px] font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Category
            </button>
          </div>

          {/* Suggested categories */}
          {unusedCategories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-[12px] text-gray-500">Suggestions:</span>
              {unusedCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => addCategory(cat)}
                  className="text-[12px] text-gray-600 hover:text-gray-900 underline"
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
