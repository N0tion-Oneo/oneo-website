import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, AlertCircle, Check, Bell, Mail, Eye } from 'lucide-react'
import {
  useNotificationTemplate,
  useCreateTemplate,
  useUpdateTemplate,
  useBrandingSettings,
} from '@/hooks'
import { getMediaUrl } from '@/services/api'
import { evaluateDjangoConditionals } from '@/utils/djangoTemplates'
import {
  UserRole,
  NotificationChannel,
  NotificationChannelLabels,
  NotificationType,
  NotificationTypeLabels,
  RecipientType,
  RecipientTypeLabels,
} from '@/types'
import { useAuth } from '@/contexts/AuthContext'

// Sample values for template variable substitution
const SAMPLE_VALUES: Record<string, string> = {
  first_name: 'John',
  last_name: 'Smith',
  email: 'john.smith@example.com',
  company_name: 'Acme Corporation',
  job_title: 'Senior Software Engineer',
  date: 'December 15, 2025',
  time: '2:00 PM EST',
  link: 'https://example.com/action',
  user_name: 'John Smith',
  interviewer_name: 'Sarah Johnson',
  stage_name: 'Technical Interview',
  location: 'Conference Room A',
  deadline: 'December 20, 2025',
  assessment_name: 'Coding Challenge',
  offer_details: '$120,000 per year + benefits',
  feedback: 'Great technical skills demonstrated',
  reason: 'Position has been filled',
  booking_link: 'https://example.com/book/abc123',
}

// Substitute template variables with sample values
function substituteVariables(template: string): string {
  if (!template) return ''
  return template.replace(/\{(\w+)\}/g, (match, variable) => {
    return SAMPLE_VALUES[variable] || match
  })
}

export default function NotificationTemplateEditPage() {
  const { templateId } = useParams<{ templateId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.role === UserRole.ADMIN

  const isEditing = Boolean(templateId && templateId !== 'new')

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [templateType, setTemplateType] = useState('')
  const [recipientType, setRecipientType] = useState<RecipientType>(RecipientType.CANDIDATE)
  const [titleTemplate, setTitleTemplate] = useState('')
  const [bodyTemplate, setBodyTemplate] = useState('')
  const [emailSubjectTemplate, setEmailSubjectTemplate] = useState('')
  const [emailBodyTemplate, setEmailBodyTemplate] = useState('')
  const [defaultChannel, setDefaultChannel] = useState<NotificationChannel>(NotificationChannel.BOTH)
  const [isActive, setIsActive] = useState(true)

  // Fetch existing template if editing
  const { template, isLoading: isLoadingTemplate, error: loadError } = useNotificationTemplate(
    isEditing ? templateId! : ''
  )

  // Fetch branding settings for email preview
  const { settings: brandingSettings } = useBrandingSettings()

  // Mutations
  const { createTemplate, isCreating, error: createError } = useCreateTemplate()
  const { updateTemplate, isUpdating, error: updateError } = useUpdateTemplate()

  // Success state
  const [successMessage, setSuccessMessage] = useState('')

  // Preview state
  const [previewTab, setPreviewTab] = useState<'in_app' | 'email'>('in_app')

  // Memoized preview content with sample values substituted
  const previewContent = useMemo(() => ({
    title: substituteVariables(titleTemplate),
    body: substituteVariables(bodyTemplate),
    emailSubject: substituteVariables(emailSubjectTemplate || titleTemplate),
    emailBody: substituteVariables(emailBodyTemplate || bodyTemplate),
  }), [titleTemplate, bodyTemplate, emailSubjectTemplate, emailBodyTemplate])

  // Generate email preview HTML using the actual branding template
  const emailPreviewHtml = useMemo(() => {
    if (!brandingSettings?.email_base_template) {
      // Fallback if no branding template
      return `
        <html>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; background: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
              <div style="padding: 24px 32px; background: #fafafa; border-bottom: 1px solid #eaeaea; text-align: center;">
                <div style="font-size: 20px; font-weight: 700; color: #111;">Acme Corporation</div>
              </div>
              <div style="padding: 32px;">
                ${previewContent.emailBody || '<p style="color: #555;">Email body content will appear here</p>'}
              </div>
              <div style="padding: 24px 32px; background: #fafafa; border-top: 1px solid #eaeaea; text-align: center; font-size: 13px; color: #888;">
                <p>This email was sent by Acme Corporation.</p>
              </div>
            </div>
          </body>
        </html>
      `
    }

    // Build context for conditional evaluation
    const logoUrl = getMediaUrl(brandingSettings.effective_logo_url) || brandingSettings.logo_url || ''
    const logoDarkUrl = getMediaUrl(brandingSettings.effective_logo_dark_url) || brandingSettings.logo_dark_url || ''
    const conditionalContext: Record<string, unknown> = {
      logo_url: logoUrl,
      logo_dark_url: logoDarkUrl,
      tagline: brandingSettings.tagline,
      footer_text: brandingSettings.email_footer_text,
      website_url: brandingSettings.website_url,
      facebook_url: brandingSettings.facebook_url,
      twitter_url: brandingSettings.twitter_url,
      linkedin_url: brandingSettings.linkedin_url,
      instagram_url: brandingSettings.instagram_url,
      support_email: brandingSettings.support_email,
      privacy_policy_url: brandingSettings.privacy_policy_url,
      terms_of_service_url: brandingSettings.terms_of_service_url,
    }

    // First, evaluate Django conditionals
    let processedHtml = evaluateDjangoConditionals(brandingSettings.email_base_template, conditionalContext)

    // Then do variable substitution
    processedHtml = processedHtml
      // Company Info
      .replace(/\{\{\s*branding\.company_name\s*\}\}/g, brandingSettings.company_name || '')
      .replace(/\{\{\s*branding\.company_name\|default:"[^"]*"\s*\}\}/g, brandingSettings.company_name || '')
      .replace(/\{\{\s*branding\.company_name\|default:'[^']*'\s*\}\}/g, brandingSettings.company_name || '')
      .replace(/\{\{\s*branding\.tagline\s*\}\}/g, brandingSettings.tagline || '')
      .replace(/\{\{\s*branding\.logo_url\s*\}\}/g, logoUrl)
      .replace(/\{\{\s*branding\.logo_dark_url\s*\}\}/g, logoDarkUrl)
      // Typography
      .replace(/\{\{\s*branding\.font_family\s*\}\}/g, brandingSettings.font_family || 'Poppins')
      .replace(/\{\{\s*branding\.font_family\|default:"[^"]*"\s*\}\}/g, brandingSettings.font_family || 'Poppins')
      // Primary Colors
      .replace(/\{\{\s*branding\.primary_color\s*\}\}/g, brandingSettings.primary_color || '#003E49')
      .replace(/\{\{\s*branding\.primary_color\|default:"[^"]*"\s*\}\}/g, brandingSettings.primary_color || '#003E49')
      .replace(/\{\{\s*branding\.primary_color_dark\s*\}\}/g, brandingSettings.primary_color_dark || '#002A32')
      .replace(/\{\{\s*branding\.primary_color_dark\|default:"[^"]*"\s*\}\}/g, brandingSettings.primary_color_dark || '#002A32')
      .replace(/\{\{\s*branding\.primary_color_light\s*\}\}/g, brandingSettings.primary_color_light || '#0D646D')
      .replace(/\{\{\s*branding\.primary_color_light\|default:"[^"]*"\s*\}\}/g, brandingSettings.primary_color_light || '#0D646D')
      // Secondary Colors
      .replace(/\{\{\s*branding\.secondary_color\s*\}\}/g, brandingSettings.secondary_color || '#0D646D')
      .replace(/\{\{\s*branding\.secondary_color\|default:"[^"]*"\s*\}\}/g, brandingSettings.secondary_color || '#0D646D')
      .replace(/\{\{\s*branding\.secondary_color_dark\s*\}\}/g, brandingSettings.secondary_color_dark || '#064852')
      .replace(/\{\{\s*branding\.secondary_color_light\s*\}\}/g, brandingSettings.secondary_color_light || '#1A7A88')
      // Accent Colors
      .replace(/\{\{\s*branding\.accent_color\s*\}\}/g, brandingSettings.accent_color || '#FF7B55')
      .replace(/\{\{\s*branding\.accent_color\|default:"[^"]*"\s*\}\}/g, brandingSettings.accent_color || '#FF7B55')
      .replace(/\{\{\s*branding\.accent_color_dark\s*\}\}/g, brandingSettings.accent_color_dark || '#E65A35')
      .replace(/\{\{\s*branding\.accent_color_dark\|default:"[^"]*"\s*\}\}/g, brandingSettings.accent_color_dark || '#E65A35')
      .replace(/\{\{\s*branding\.accent_color_light\s*\}\}/g, brandingSettings.accent_color_light || '#FFAB97')
      .replace(/\{\{\s*branding\.accent_color_light\|default:"[^"]*"\s*\}\}/g, brandingSettings.accent_color_light || '#FFAB97')
      // Status Colors
      .replace(/\{\{\s*branding\.success_color\s*\}\}/g, brandingSettings.success_color || '#10b981')
      .replace(/\{\{\s*branding\.success_color\|default:"[^"]*"\s*\}\}/g, brandingSettings.success_color || '#10b981')
      .replace(/\{\{\s*branding\.warning_color\s*\}\}/g, brandingSettings.warning_color || '#f97316')
      .replace(/\{\{\s*branding\.warning_color\|default:"[^"]*"\s*\}\}/g, brandingSettings.warning_color || '#f97316')
      .replace(/\{\{\s*branding\.error_color\s*\}\}/g, brandingSettings.error_color || '#ef4444')
      .replace(/\{\{\s*branding\.error_color\|default:"[^"]*"\s*\}\}/g, brandingSettings.error_color || '#ef4444')
      // Email Settings
      .replace(/\{\{\s*branding\.background_color\s*\}\}/g, brandingSettings.email_background_color || '#f5f5f5')
      .replace(/\{\{\s*branding\.background_color\|default:"[^"]*"\s*\}\}/g, brandingSettings.email_background_color || '#f5f5f5')
      .replace(/\{\{\s*branding\.header_background\s*\}\}/g, brandingSettings.email_header_background || '#fafafa')
      .replace(/\{\{\s*branding\.header_background\|default:"[^"]*"\s*\}\}/g, brandingSettings.email_header_background || '#fafafa')
      .replace(/\{\{\s*branding\.footer_text\s*\}\}/g, brandingSettings.email_footer_text || '')
      .replace(/\{\{\s*branding\.custom_css\s*\}\}/g, brandingSettings.custom_css || '')
      .replace(/\{\{\s*branding\.custom_css\|default:"[^"]*"\|safe\s*\}\}/g, brandingSettings.custom_css || '')
      // Social & Links
      .replace(/\{\{\s*branding\.website_url\s*\}\}/g, brandingSettings.website_url || '')
      .replace(/\{\{\s*branding\.facebook_url\s*\}\}/g, brandingSettings.facebook_url || '')
      .replace(/\{\{\s*branding\.twitter_url\s*\}\}/g, brandingSettings.twitter_url || '')
      .replace(/\{\{\s*branding\.linkedin_url\s*\}\}/g, brandingSettings.linkedin_url || '')
      .replace(/\{\{\s*branding\.instagram_url\s*\}\}/g, brandingSettings.instagram_url || '')
      .replace(/\{\{\s*branding\.support_email\s*\}\}/g, brandingSettings.support_email || '')
      .replace(/\{\{\s*branding\.privacy_policy_url\s*\}\}/g, brandingSettings.privacy_policy_url || '')
      .replace(/\{\{\s*branding\.terms_of_service_url\s*\}\}/g, brandingSettings.terms_of_service_url || '')
      // Site URL
      .replace(/\{\{\s*site_url\s*\}\}/g, window.location.origin)
      // Inject the notification email content
      .replace(/\{\{\s*email_content\|safe\s*\}\}/g, previewContent.emailBody || '<p>Email content will appear here</p>')
      // Preheader
      .replace(/\{\{\s*preheader_text\|default:[^}]+\}\}/g, brandingSettings.tagline || 'Update')
      // Year
      .replace(/\{%\s*now\s+"Y"\s*%\}/g, new Date().getFullYear().toString())
      // Block tags (for extending templates)
      .replace(/\{%\s*block\s+\w+\s*%\}/g, '')
      .replace(/\{%\s*endblock\s*%\}/g, '')

    return processedHtml
  }, [brandingSettings, previewContent.emailBody])

  // Populate form when template loads
  useEffect(() => {
    if (template) {
      setName(template.name)
      setDescription(template.description || '')
      setTemplateType(template.template_type || '')
      setRecipientType(template.recipient_type || RecipientType.CANDIDATE)
      setTitleTemplate(template.title_template)
      setBodyTemplate(template.body_template)
      setEmailSubjectTemplate(template.email_subject_template || '')
      setEmailBodyTemplate(template.email_body_template || '')
      setDefaultChannel(template.default_channel)
      setIsActive(template.is_active)
    }
  }, [template])

  // Access check
  if (!isAdmin) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-[15px] text-gray-700 mb-1">Access Denied</p>
        <p className="text-[13px] text-gray-500">Only admins can create and edit templates.</p>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccessMessage('')

    const data = {
      name,
      description,
      template_type: templateType || null,
      recipient_type: recipientType,
      is_custom: true,
      title_template: titleTemplate,
      body_template: bodyTemplate,
      email_subject_template: emailSubjectTemplate || null,
      email_body_template: emailBodyTemplate || null,
      default_channel: defaultChannel,
      is_active: isActive,
    }

    try {
      if (isEditing) {
        await updateTemplate(templateId!, data)
        setSuccessMessage('Template updated successfully')
      } else {
        await createTemplate(data)
        setSuccessMessage('Template created successfully')
        // Navigate to templates list after short delay
        setTimeout(() => {
          navigate('/dashboard/settings/notifications/templates')
        }, 1500)
      }
    } catch {
      // Error is handled by the hooks
    }
  }

  const isValid = name.trim() !== '' && titleTemplate.trim() !== '' && bodyTemplate.trim() !== ''
  const error = loadError || createError || updateError

  if (isEditing && isLoadingTemplate) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <p className="text-[13px] text-gray-500">Loading template...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/dashboard/settings/notifications/templates"
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <h1 className="text-[22px] font-semibold text-gray-900">
          {isEditing ? 'Edit Template' : 'New Template'}
        </h1>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg">
          <Check className="w-5 h-5 text-green-600" />
          <p className="text-[13px] text-green-700">{successMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-[13px] text-red-700">{error}</p>
        </div>
      )}

      {/* Two Column Layout: Form + Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form Column */}
        <form onSubmit={handleSubmit} className="lg:col-span-3 space-y-6">
        {/* Basic Info */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
          <h2 className="text-[15px] font-semibold text-gray-900">Basic Information</h2>

          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-2">
              Template Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Welcome Message"
              className="w-full px-3 py-2 text-[13px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
              required
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-2">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of when this template is used"
              className="w-full px-3 py-2 text-[13px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-2">
                Template Type
              </label>
              <select
                value={templateType}
                onChange={(e) => setTemplateType(e.target.value)}
                className="w-full px-3 py-2 text-[13px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="">Custom (no type)</option>
                {Object.entries(NotificationTypeLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-2">
                Recipient Type <span className="text-red-500">*</span>
              </label>
              <select
                value={recipientType}
                onChange={(e) => setRecipientType(e.target.value as RecipientType)}
                className="w-full px-3 py-2 text-[13px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                {Object.entries(RecipientTypeLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-gray-500">
                Who receives this notification when triggered
              </p>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-2">
                Default Channel
              </label>
              <select
                value={defaultChannel}
                onChange={(e) => setDefaultChannel(e.target.value as NotificationChannel)}
                className="w-full px-3 py-2 text-[13px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                {Object.entries(NotificationChannelLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="isActive" className="text-[13px] text-gray-700">
              Active (available for use)
            </label>
          </div>
        </div>

        {/* In-App Notification Content */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
          <h2 className="text-[15px] font-semibold text-gray-900">In-App Notification</h2>

          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={titleTemplate}
              onChange={(e) => setTitleTemplate(e.target.value)}
              placeholder="e.g., Welcome to {company_name}!"
              className="w-full px-3 py-2 text-[13px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
              required
            />
            <p className="mt-1 text-[12px] text-gray-500">
              Use {'{variable}'} syntax for dynamic content.
            </p>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-2">
              Body <span className="text-red-500">*</span>
            </label>
            <textarea
              value={bodyTemplate}
              onChange={(e) => setBodyTemplate(e.target.value)}
              placeholder="e.g., Hi {first_name}, thank you for joining..."
              rows={4}
              className="w-full px-3 py-2 text-[13px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
              required
            />
          </div>
        </div>

        {/* Email Content */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
          <h2 className="text-[15px] font-semibold text-gray-900">Email Content (Optional)</h2>
          <p className="text-[12px] text-gray-500 -mt-2">
            Leave empty to use the in-app content for emails.
          </p>

          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-2">
              Email Subject
            </label>
            <input
              type="text"
              value={emailSubjectTemplate}
              onChange={(e) => setEmailSubjectTemplate(e.target.value)}
              placeholder="e.g., Welcome to {company_name}!"
              className="w-full px-3 py-2 text-[13px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-2">
              Email Body (HTML)
            </label>
            <textarea
              value={emailBodyTemplate}
              onChange={(e) => setEmailBodyTemplate(e.target.value)}
              placeholder="<p>Hi {first_name},</p><p>Thank you for joining...</p>"
              rows={6}
              className="w-full px-3 py-2 text-[13px] font-mono border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
            />
            <p className="mt-1 text-[12px] text-gray-500">
              Supports HTML markup for rich email formatting.
            </p>
          </div>
        </div>

        {/* Variable Reference */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-[13px] font-semibold text-gray-700 mb-2">Available Variables</h3>
          <p className="text-[12px] text-gray-600 mb-2">
            You can use these variables in your templates:
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              '{first_name}',
              '{last_name}',
              '{email}',
              '{company_name}',
              '{job_title}',
              '{date}',
              '{time}',
              '{link}',
            ].map((variable) => (
              <code
                key={variable}
                className="px-2 py-1 text-[11px] bg-white border border-gray-200 rounded text-gray-700"
              >
                {variable}
              </code>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-3">
          <Link
            to="/dashboard/settings/notifications/templates"
            className="px-4 py-2 text-[13px] font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={!isValid || isCreating || isUpdating}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-[13px] font-medium rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {isCreating || isUpdating
              ? 'Saving...'
              : isEditing
              ? 'Save Changes'
              : 'Create Template'}
          </button>
        </div>
        </form>

        {/* Preview Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg sticky top-4">
            {/* Preview Header with Tabs */}
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-gray-500" />
                <h2 className="text-[15px] font-semibold text-gray-900">Preview</h2>
              </div>
              <div className="flex bg-gray-100 rounded-md p-0.5">
                <button
                  type="button"
                  onClick={() => setPreviewTab('in_app')}
                  className={`flex items-center gap-1.5 px-3 py-1 text-[12px] font-medium rounded transition-colors ${
                    previewTab === 'in_app'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Bell className="w-3.5 h-3.5" />
                  In-App
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('email')}
                  className={`flex items-center gap-1.5 px-3 py-1 text-[12px] font-medium rounded transition-colors ${
                    previewTab === 'email'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  Email
                </button>
              </div>
            </div>

            {/* Preview Content */}
            <div className="p-4">
              {previewTab === 'in_app' ? (
                /* In-App Notification Preview */
                <div className="space-y-3">
                  <p className="text-[11px] text-gray-500 uppercase tracking-wide">
                    Notification Bell Preview
                  </p>

                  {/* Mock notification item */}
                  <div className="bg-blue-50/50 border border-gray-200 rounded-lg p-3">
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <Bell className="w-4 h-4 text-gray-600" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-gray-900 leading-tight">
                          {previewContent.title || 'Notification title will appear here'}
                        </p>
                        <p className="text-[12px] text-gray-500 mt-0.5 line-clamp-2">
                          {previewContent.body || 'Notification body text will appear here'}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-1">
                          Just now
                        </p>
                      </div>

                      {/* Unread dot */}
                      <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                    </div>
                  </div>

                  <p className="text-[11px] text-gray-400 text-center">
                    This is how the notification will appear in the notification bell dropdown
                  </p>
                </div>
              ) : (
                /* Email Preview */
                <div className="space-y-3">
                  <p className="text-[11px] text-gray-500 uppercase tracking-wide">
                    Email Preview
                  </p>

                  {/* Subject line */}
                  <div className="flex items-center gap-2 text-[11px] text-gray-500 px-1">
                    <span className="font-medium text-gray-700">Subject:</span>
                    <span className="truncate">
                      {previewContent.emailSubject || 'Email subject will appear here'}
                    </span>
                  </div>

                  {/* Email preview using iframe with actual branding template */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <iframe
                      title="Email Preview"
                      srcDoc={emailPreviewHtml}
                      className="w-full border-0"
                      style={{ height: '320px' }}
                      sandbox="allow-same-origin"
                    />
                  </div>

                  <p className="text-[11px] text-gray-400 text-center">
                    Preview uses your branding settings template
                  </p>
                </div>
              )}
            </div>

            {/* Sample Values Note */}
            <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 rounded-b-lg">
              <p className="text-[11px] text-gray-500">
                <span className="font-medium">Note:</span> Variables are replaced with sample values.
                Actual values will be substituted when notifications are sent.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
