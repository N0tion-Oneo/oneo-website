import { useState, useEffect } from 'react'
import { Heart, Sparkles, Gift, Code, Pencil, Check } from 'lucide-react'
import { TechnologyMultiSelect } from '@/components/forms'
import ValuesEditor from '@/components/company/ValuesEditor'
import BenefitsEditor from '@/components/company/BenefitsEditor'
import api from '@/services/api'
import type { Technology, BenefitCategory, CompanyInput, RemoteWorkPolicy } from '@/types'

interface CompanyCulturePanelProps {
  companyId: string
  entity?: Record<string, unknown>
  onRefresh?: () => void
}

export function CompanyCulturePanel({ companyId, entity, onRefresh }: CompanyCulturePanelProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<CompanyInput>({})
  const [selectedTechnologies, setSelectedTechnologies] = useState<Technology[]>([])

  const company = entity as {
    culture_description?: string
    values?: string[]
    benefits?: BenefitCategory[]
    technologies?: Technology[]
    remote_work_policy?: string
  } | undefined

  // Initialize form data when entering edit mode
  useEffect(() => {
    if (isEditing && company) {
      setFormData({
        culture_description: company.culture_description || '',
        values: company.values || [],
        benefits: company.benefits || [],
        technology_ids: company.technologies?.map(t => t.id) || [],
        remote_work_policy: (company.remote_work_policy as RemoteWorkPolicy) || '',
      })
      setSelectedTechnologies(company.technologies || [])
    }
  }, [isEditing, company])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await api.patch(`/companies/${companyId}/detail/`, formData)
      setIsEditing(false)
      onRefresh?.()
    } catch (err) {
      console.error('Failed to save:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
  }

  const handleTechnologiesChange = (technologies: Technology[]) => {
    setSelectedTechnologies(technologies)
    setFormData(prev => ({ ...prev, technology_ids: technologies.map(t => t.id) }))
  }

  const handleValuesChange = (values: string[]) => {
    setFormData(prev => ({ ...prev, values }))
  }

  const handleBenefitsChange = (benefits: BenefitCategory[]) => {
    setFormData(prev => ({ ...prev, benefits }))
  }

  if (!company) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-[14px] text-gray-500 dark:text-gray-400">Company not found</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900 dark:text-gray-100">Culture & Tech</h3>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancel}
                className="px-2.5 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Pencil className="w-4 h-4" />
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Culture Description */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Heart className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <h4 className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Culture</h4>
          </div>

          {isEditing ? (
            <textarea
              value={formData.culture_description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, culture_description: e.target.value }))}
              rows={4}
              placeholder="Describe your company culture, work environment, and team dynamics..."
              className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 resize-none bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            />
          ) : (
            <p className="text-[13px] text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {company.culture_description || <span className="text-gray-400 italic">No culture description</span>}
            </p>
          )}
        </div>

        {/* Values */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <h4 className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Values</h4>
          </div>

          {isEditing ? (
            <ValuesEditor
              values={formData.values || []}
              onChange={handleValuesChange}
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {company.values && company.values.length > 0 ? (
                company.values.map((value, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 text-[13px] bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full"
                  >
                    {value}
                  </span>
                ))
              ) : (
                <p className="text-[13px] text-gray-400 italic">No values added</p>
              )}
            </div>
          )}
        </div>

        {/* Benefits */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Gift className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <h4 className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Benefits & Perks</h4>
          </div>

          {isEditing ? (
            <BenefitsEditor
              benefits={formData.benefits || []}
              onChange={handleBenefitsChange}
            />
          ) : (
            <div className="space-y-4">
              {company.benefits && company.benefits.length > 0 ? (
                company.benefits.map((category, idx) => (
                  <div key={idx}>
                    <p className="text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-2">{category.category}</p>
                    <div className="flex flex-wrap gap-2">
                      {category.items.map((item, itemIdx) => (
                        <span
                          key={itemIdx}
                          className="px-2.5 py-1 text-[12px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[13px] text-gray-400 italic">No benefits added</p>
              )}
            </div>
          )}
        </div>

        {/* Tech Stack */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Code className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <h4 className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tech Stack</h4>
          </div>

          {isEditing ? (
            <TechnologyMultiSelect
              selected={selectedTechnologies}
              onChange={handleTechnologiesChange}
              maxItems={30}
              label=""
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {company.technologies && company.technologies.length > 0 ? (
                company.technologies.map((tech) => (
                  <span
                    key={tech.id}
                    className="px-2.5 py-1 text-[12px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full"
                  >
                    {tech.name}
                  </span>
                ))
              ) : (
                <p className="text-[13px] text-gray-400 italic">No technologies added</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CompanyCulturePanel
