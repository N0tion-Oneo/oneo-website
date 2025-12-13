import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cmsSeoMetaDefaults } from '@/services/cms'
import { useToast } from '@/contexts/ToastContext'
import {
  Loader2,
  Save,
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  Shield,
  Info,
  BarChart3,
  ExternalLink,
} from 'lucide-react'

export default function CMSSeoMetaPage() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    default_title_suffix: '',
    default_description: '',
    google_site_verification: '',
    bing_site_verification: '',
    google_analytics_id: '',
    google_tag_manager_id: '',
  })
  // Branding info (read-only, from BrandingSettings)
  const [branding, setBranding] = useState({ company_name: '', tagline: '' })
  const [ogImage, setOgImage] = useState<File | null>(null)
  const [ogImagePreview, setOgImagePreview] = useState<string | null>(null)
  const [removeOgImage, setRemoveOgImage] = useState(false)
  const [initialized, setInitialized] = useState(false)

  const { data: metaDefaults, isLoading } = useQuery({
    queryKey: ['cms', 'seo', 'meta-defaults'],
    queryFn: cmsSeoMetaDefaults.get,
  })

  // Initialize form data when metaDefaults loads
  useEffect(() => {
    if (metaDefaults && !initialized) {
      setFormData({
        default_title_suffix: metaDefaults.default_title_suffix || '',
        default_description: metaDefaults.default_description || '',
        google_site_verification: metaDefaults.google_site_verification || '',
        bing_site_verification: metaDefaults.bing_site_verification || '',
        google_analytics_id: metaDefaults.google_analytics_id || '',
        google_tag_manager_id: metaDefaults.google_tag_manager_id || '',
      })
      // Branding comes from BrandingSettings (read-only here)
      setBranding({
        company_name: metaDefaults.company_name || '',
        tagline: metaDefaults.tagline || '',
      })
      if (metaDefaults.default_og_image_url) {
        setOgImagePreview(metaDefaults.default_og_image_url)
      }
      setInitialized(true)
    }
  }, [metaDefaults, initialized])

  // Compute the resolved title suffix with variables replaced
  const resolvedTitleSuffix = (() => {
    let suffix = formData.default_title_suffix || ''
    suffix = suffix.replace(/\{\{company_name\}\}/g, branding.company_name || '')
    suffix = suffix.replace(/\{\{tagline\}\}/g, branding.tagline || '')
    return suffix
  })()

  const updateMutation = useMutation({
    mutationFn: cmsSeoMetaDefaults.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms', 'seo', 'meta-defaults'] })
      showToast('success', 'SEO settings saved successfully')
      setOgImage(null)
      setRemoveOgImage(false)
    },
    onError: () => {
      showToast('error', 'Failed to save SEO settings')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload: Record<string, unknown> = {
      ...formData,
    }
    if (ogImage) {
      payload.default_og_image = ogImage
    } else if (removeOgImage) {
      payload.default_og_image = null
    }
    updateMutation.mutate(payload)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setOgImage(file)
      setRemoveOgImage(false)
      const reader = new FileReader()
      reader.onload = () => {
        setOgImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = () => {
    setOgImage(null)
    setOgImagePreview(null)
    setRemoveOgImage(true)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

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
        <h1 className="text-xl font-semibold text-gray-900">SEO Meta Defaults</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure default SEO settings that apply across your site.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title & Description */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-900">Title & Description</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Title Suffix Template
              </label>
              <input
                type="text"
                value={formData.default_title_suffix}
                onChange={(e) =>
                  setFormData({ ...formData, default_title_suffix: e.target.value })
                }
                placeholder=" | {{company_name}}"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <p className="text-xs text-gray-500 mt-1">
                Appended to all page titles. Use {'{{company_name}}'} or {'{{tagline}}'} from Settings &gt; Branding.
              </p>
              {formData.default_title_suffix && (
                <p className="text-xs text-gray-400 mt-1">
                  Preview: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 whitespace-pre">Page Title<span className="text-primary font-medium">{resolvedTitleSuffix}</span></code>
                </p>
              )}
              {branding.company_name && (
                <p className="text-xs text-gray-400 mt-1">
                  Current branding: <span className="text-gray-600">{branding.company_name}</span>
                  {branding.tagline && <> &middot; <span className="text-gray-600">{branding.tagline}</span></>}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Default Meta Description
              </label>
              <textarea
                value={formData.default_description}
                onChange={(e) =>
                  setFormData({ ...formData, default_description: e.target.value })
                }
                placeholder="Your site's default description for search engines..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Used when pages don't have their own description (max 160 characters)
              </p>
            </div>
          </div>
        </div>

        {/* Default OG Image */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <ImageIcon className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-900">Default Social Image</h3>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              Displayed when your pages are shared on social media (if no specific image is set).
            </p>

            {ogImagePreview ? (
              <div className="relative">
                <img
                  src={ogImagePreview}
                  alt="OG Image preview"
                  className="w-full max-w-md rounded-lg border border-gray-200 object-cover aspect-[1200/630]"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow-sm border border-gray-200 hover:bg-gray-50"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full max-w-md border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center hover:border-gray-400 transition-colors"
              >
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">Click to upload image</span>
                <span className="text-xs text-gray-400 mt-1">Recommended: 1200x630px</span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />

            {ogImagePreview && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-sm text-primary hover:underline"
              >
                Change image
              </button>
            )}
          </div>
        </div>

        {/* Site Verification */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-900">Site Verification</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Google Site Verification
              </label>
              <input
                type="text"
                value={formData.google_site_verification}
                onChange={(e) =>
                  setFormData({ ...formData, google_site_verification: e.target.value })
                }
                placeholder="Enter verification code"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <p className="text-xs text-gray-500 mt-1">
                From Google Search Console. Just the code, not the full meta tag.
              </p>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Bing Site Verification
              </label>
              <input
                type="text"
                value={formData.bing_site_verification}
                onChange={(e) =>
                  setFormData({ ...formData, bing_site_verification: e.target.value })
                }
                placeholder="Enter verification code"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <p className="text-xs text-gray-500 mt-1">
                From Bing Webmaster Tools. Just the code, not the full meta tag.
              </p>
            </div>
          </div>
        </div>

        {/* Analytics */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-900">Analytics</h3>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm text-gray-600">
                  Google Analytics 4 Measurement ID
                </label>
                <a
                  href="https://analytics.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  Open GA4 <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <input
                type="text"
                value={formData.google_analytics_id}
                onChange={(e) =>
                  setFormData({ ...formData, google_analytics_id: e.target.value })
                }
                placeholder="G-XXXXXXXXXX"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <p className="text-xs text-gray-500 mt-1">
                Find this in GA4 under Admin &gt; Data Streams &gt; Web stream details
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm text-gray-600">
                  Google Tag Manager Container ID
                </label>
                <a
                  href="https://tagmanager.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  Open GTM <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <input
                type="text"
                value={formData.google_tag_manager_id}
                onChange={(e) =>
                  setFormData({ ...formData, google_tag_manager_id: e.target.value })
                }
                placeholder="GTM-XXXXXXX"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <p className="text-xs text-gray-500 mt-1">
                Optional. Use GTM if you need advanced tag management.
              </p>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">How these settings work</p>
              <ul className="list-disc list-inside space-y-1 text-blue-600">
                <li>Title suffix is appended to all page titles</li>
                <li>Default description is used when pages don't have their own</li>
                <li>Social image appears when links are shared on social media</li>
                <li>Verification codes confirm site ownership with search engines</li>
                <li>Analytics IDs enable tracking across your site</li>
              </ul>
            </div>
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
