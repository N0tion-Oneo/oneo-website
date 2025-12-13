import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cmsSiteSettings } from '@/services/cms'
import { useToast } from '@/contexts/ToastContext'
import { Loader2, Save, ExternalLink, RotateCcw } from 'lucide-react'

const DEFAULT_ROBOTS_TXT = `User-agent: *
Allow: /
Allow: /jobs
Allow: /candidates
Allow: /companies
Allow: /blog
Allow: /glossary
Allow: /faqs
Allow: /contact

Disallow: /dashboard
Disallow: /api
Disallow: /login
Disallow: /signup
Disallow: /settings

Sitemap: /sitemap.xml`

export default function CMSRobotsTxtPage() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [content, setContent] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['cms', 'settings', 'robots-txt'],
    queryFn: cmsSiteSettings.getRobotsTxt,
  })

  useEffect(() => {
    if (data) {
      setContent(data.robots_txt_content || DEFAULT_ROBOTS_TXT)
    }
  }, [data])

  const updateMutation = useMutation({
    mutationFn: cmsSiteSettings.updateRobotsTxt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms', 'settings', 'robots-txt'] })
      showToast('success', 'robots.txt saved successfully')
    },
    onError: () => {
      showToast('error', 'Failed to save robots.txt')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate({ robots_txt_content: content })
  }

  const handleReset = () => {
    setContent(DEFAULT_ROBOTS_TXT)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">robots.txt</h1>
        <p className="text-sm text-gray-500 mt-1">
          Control how search engine crawlers access your site.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            The robots.txt file tells search engine crawlers which pages they can and cannot request
            from your site. It's served at{' '}
            <a
              href="/robots.txt"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline inline-flex items-center gap-1"
            >
              /robots.txt <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </div>

        {/* Editor */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
            <span className="text-sm font-medium text-gray-700">robots.txt content</span>
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Reset to Default
            </button>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={20}
            className="w-full px-4 py-3 font-mono text-sm text-gray-900 focus:outline-none resize-none"
            placeholder="Enter robots.txt content..."
          />
        </div>

        {/* Quick Reference */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Quick Reference</h3>
          <div className="space-y-2 text-xs text-gray-600 font-mono">
            <p><code className="bg-gray-200 px-1 rounded">User-agent: *</code> - All crawlers</p>
            <p><code className="bg-gray-200 px-1 rounded">Allow: /path</code> - Allow crawling of path</p>
            <p><code className="bg-gray-200 px-1 rounded">Disallow: /path</code> - Block crawling of path</p>
            <p><code className="bg-gray-200 px-1 rounded">Sitemap: URL</code> - Location of your sitemap</p>
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
