import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cmsSiteSettings } from '@/services/cms'
import { useToast } from '@/contexts/ToastContext'
import { Loader2, Save, ExternalLink } from 'lucide-react'

export default function CMSSitemapSettingsPage() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [formData, setFormData] = useState({
    sitemap_enabled: true,
    sitemap_include_pages: true,
    sitemap_include_blog: true,
    sitemap_include_jobs: true,
    sitemap_include_candidates: true,
    sitemap_include_companies: true,
    sitemap_include_glossary: true,
    sitemap_include_case_studies: true,
    site_url: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['cms', 'settings', 'sitemap'],
    queryFn: cmsSiteSettings.getSitemap,
  })

  useEffect(() => {
    if (data) {
      setFormData({
        sitemap_enabled: data.sitemap_enabled,
        sitemap_include_pages: data.sitemap_include_pages,
        sitemap_include_blog: data.sitemap_include_blog,
        sitemap_include_jobs: data.sitemap_include_jobs,
        sitemap_include_candidates: data.sitemap_include_candidates,
        sitemap_include_companies: data.sitemap_include_companies,
        sitemap_include_glossary: data.sitemap_include_glossary,
        sitemap_include_case_studies: data.sitemap_include_case_studies,
        site_url: data.site_url || '',
      })
    }
  }, [data])

  const updateMutation = useMutation({
    mutationFn: cmsSiteSettings.updateSitemap,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms', 'settings', 'sitemap'] })
      showToast('success', 'Sitemap settings saved successfully')
    },
    onError: () => {
      showToast('error', 'Failed to save sitemap settings')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate(formData)
  }

  const contentTypes = [
    { key: 'sitemap_include_pages', label: 'CMS Pages', description: 'Legal, about, and service pages' },
    { key: 'sitemap_include_blog', label: 'Blog Posts', description: 'Published blog articles' },
    { key: 'sitemap_include_jobs', label: 'Job Listings', description: 'Active job postings' },
    { key: 'sitemap_include_candidates', label: 'Candidates', description: 'Public candidate profiles' },
    { key: 'sitemap_include_companies', label: 'Companies', description: 'Active company profiles' },
    { key: 'sitemap_include_glossary', label: 'Glossary Terms', description: 'Active glossary entries' },
    { key: 'sitemap_include_case_studies', label: 'Case Studies', description: 'Published case studies' },
  ] as const

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Sitemap Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure your XML sitemap for search engine optimization.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Enable Sitemap Toggle */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Enable Sitemap</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Generate an XML sitemap at /sitemap.xml
              </p>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="/sitemap.xml"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                View Sitemap <ExternalLink className="w-3 h-3" />
              </a>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.sitemap_enabled}
                  onChange={(e) =>
                    setFormData({ ...formData, sitemap_enabled: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Site URL */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Site URL</h3>
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Base URL for sitemap entries
            </label>
            <input
              type="url"
              value={formData.site_url}
              onChange={(e) =>
                setFormData({ ...formData, site_url: e.target.value })
              }
              placeholder="https://oneo.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <p className="text-xs text-gray-500 mt-1">
              This URL will be used as the base for all sitemap entries.
            </p>
          </div>
        </div>

        {/* Content Types to Include */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            Content Types to Include
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Select which content types should be included in the sitemap.
          </p>
          <div className="space-y-3">
            {contentTypes.map(({ key, label, description }) => (
              <label
                key={key}
                className="flex items-start gap-3 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={formData[key]}
                  onChange={(e) =>
                    setFormData({ ...formData, [key]: e.target.checked })
                  }
                  className="mt-0.5 h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary/20"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900 group-hover:text-primary">
                    {label}
                  </span>
                  <p className="text-xs text-gray-500">{description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {updateMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Changes
          </button>
        </div>
      </form>
    </div>
  )
}
