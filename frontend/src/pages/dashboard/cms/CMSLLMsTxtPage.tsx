import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cmsSiteSettings } from '@/services/cms'
import { useToast } from '@/contexts/ToastContext'
import { Loader2, Save, ExternalLink, RotateCcw, Bot } from 'lucide-react'

const DEFAULT_LLMS_TXT = `# Recruitment Platform

> A modern recruitment platform that connects talented candidates with great companies. We provide end-to-end hiring solutions for recruiters, companies, and job seekers.

## About

This is a recruitment technology platform designed to streamline the hiring process. Our platform serves three main user types:

- **Recruiters**: Manage candidates, jobs, and the entire recruitment pipeline
- **Companies**: Post jobs, review candidates, and build their employer brand
- **Candidates**: Find opportunities, showcase their skills, and connect with employers

## Core Features

### For Recruiters
- Candidate relationship management (CRM)
- Job posting and management
- Application tracking system (ATS)
- Interview scheduling with calendar integration
- Analytics and reporting
- Team collaboration tools

### For Companies
- Company profile and branding
- Job board integration
- Candidate shortlisting
- Interview coordination
- Hiring pipeline management

### For Candidates
- Professional profile creation
- Job search and application
- Interview self-scheduling
- Application status tracking

## Platform Sections

### Jobs (/jobs)
Browse and search job listings. Filter by location, job type, experience level, and more.

### Candidates (/candidates)
Public candidate directory showcasing professionals seeking opportunities.

### Companies (/companies)
Company directory featuring employer profiles, culture information, and open positions.

### Blog (/blog)
Industry insights, hiring tips, career advice, and company news.

### Contact (/contact)
Get in touch with our team for inquiries.

## Technical Information

- **Platform**: Web application (React frontend, Django backend)
- **API**: RESTful API at /api/v1/
- **Authentication**: JWT-based authentication
- **Data Format**: JSON

## API Endpoints (Public)

- GET /api/v1/jobs/ - List published jobs
- GET /api/v1/candidates/ - List public candidates
- GET /api/v1/companies/ - List companies
- GET /api/v1/cms/blog/ - List published blog posts
- GET /api/v1/cms/pages/:slug/ - Get CMS page
- GET /api/v1/cms/faqs/ - Get FAQs by category`

export default function CMSLLMsTxtPage() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [content, setContent] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['cms', 'settings', 'llms-txt'],
    queryFn: cmsSiteSettings.getLLMsTxt,
  })

  useEffect(() => {
    if (data) {
      setContent(data.llms_txt_content || DEFAULT_LLMS_TXT)
    }
  }, [data])

  const updateMutation = useMutation({
    mutationFn: cmsSiteSettings.updateLLMsTxt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms', 'settings', 'llms-txt'] })
      showToast('success', 'llms.txt saved successfully')
    },
    onError: () => {
      showToast('error', 'Failed to save llms.txt')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate({ llms_txt_content: content })
  }

  const handleReset = () => {
    setContent(DEFAULT_LLMS_TXT)
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
        <h1 className="text-xl font-semibold text-gray-900">llms.txt</h1>
        <p className="text-sm text-gray-500 mt-1">
          Provide context about your site for AI/LLM agents.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Info Box */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Bot className="w-5 h-5 text-purple-600 mt-0.5" />
            <div>
              <p className="text-sm text-purple-800 font-medium">What is llms.txt?</p>
              <p className="text-sm text-purple-700 mt-1">
                The llms.txt file provides structured information about your website for AI assistants
                and large language models. It helps AI agents understand your site's purpose, content,
                and available resources. Served at{' '}
                <a
                  href="/llms.txt"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline inline-flex items-center gap-1"
                >
                  /llms.txt <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Editor */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
            <span className="text-sm font-medium text-gray-700">llms.txt content (Markdown)</span>
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
            rows={25}
            className="w-full px-4 py-3 font-mono text-sm text-gray-900 focus:outline-none resize-none"
            placeholder="Enter llms.txt content..."
          />
        </div>

        {/* Tips */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Tips for llms.txt</h3>
          <ul className="space-y-1 text-xs text-gray-600 list-disc list-inside">
            <li>Use Markdown formatting for better readability</li>
            <li>Include a clear description of your platform's purpose</li>
            <li>List main features and capabilities</li>
            <li>Document public API endpoints</li>
            <li>Include contact information</li>
            <li>Keep it concise but informative</li>
          </ul>
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
