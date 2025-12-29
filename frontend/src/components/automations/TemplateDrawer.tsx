/**
 * TemplateDrawer - Drawer for creating/editing notification templates
 * Used within the Automations page for unified template management
 */

import { useState, useEffect, useMemo } from 'react'
import {
  X,
  Loader2,
  AlertCircle,
  Check,
  Save,
  Bell,
  Mail,
  Eye,
} from 'lucide-react'
import {
  useNotificationTemplate,
  useCreateTemplate,
  useUpdateTemplate,
  useBrandingSettings,
} from '@/hooks'
import { getMediaUrl } from '@/services/api'
import { evaluateDjangoConditionals } from '@/utils/djangoTemplates'
import {
  NotificationChannel,
  NotificationChannelLabels,
  NotificationTypeLabels,
  RecipientType,
  RecipientTypeLabels,
} from '@/types'

// =============================================================================
// TYPES
// =============================================================================

interface TemplateDrawerProps {
  templateId: string | null // null for new template
  onClose: () => void
  onSaved: () => void
}

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
  name: 'John Smith',
  source: 'Website Contact Form',
  stage: 'Qualified',
}

// Substitute template variables with sample values
function substituteVariables(template: string): string {
  if (!template) return ''
  // Support both {var} and {{var}} syntax
  return template
    .replace(/\{\{(\w+)\}\}/g, (match, variable) => SAMPLE_VALUES[variable] || match)
    .replace(/\{(\w+)\}/g, (match, variable) => SAMPLE_VALUES[variable] || match)
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function TemplateDrawer({ templateId, onClose, onSaved }: TemplateDrawerProps) {
  const isEditing = Boolean(templateId)

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

  // Preview state
  const [showPreview, setShowPreview] = useState(false)
  const [previewTab, setPreviewTab] = useState<'in_app' | 'email'>('in_app')

  // Success/error state
  const [successMessage, setSuccessMessage] = useState('')

  // Fetch existing template if editing
  const { template, isLoading: isLoadingTemplate, error: loadError } = useNotificationTemplate(
    isEditing ? templateId! : ''
  )

  // Fetch branding settings for email preview
  const { settings: brandingSettings } = useBrandingSettings()

  // Mutations
  const { createTemplate, isCreating, error: createError } = useCreateTemplate()
  const { updateTemplate, isUpdating, error: updateError } = useUpdateTemplate()

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

    // Then do variable substitution (simplified version)
    processedHtml = processedHtml
      .replace(/\{\{\s*branding\.company_name\s*\}\}/g, brandingSettings.company_name || '')
      .replace(/\{\{\s*branding\.company_name\|default:"[^"]*"\s*\}\}/g, brandingSettings.company_name || '')
      .replace(/\{\{\s*branding\.tagline\s*\}\}/g, brandingSettings.tagline || '')
      .replace(/\{\{\s*branding\.logo_url\s*\}\}/g, logoUrl)
      .replace(/\{\{\s*branding\.primary_color\s*\}\}/g, brandingSettings.primary_color || '#003E49')
      .replace(/\{\{\s*branding\.primary_color\|default:"[^"]*"\s*\}\}/g, brandingSettings.primary_color || '#003E49')
      .replace(/\{\{\s*branding\.font_family\s*\}\}/g, brandingSettings.font_family || 'Poppins')
      .replace(/\{\{\s*branding\.font_family\|default:"[^"]*"\s*\}\}/g, brandingSettings.font_family || 'Poppins')
      .replace(/\{\{\s*branding\.background_color\s*\}\}/g, brandingSettings.email_background_color || '#f5f5f5')
      .replace(/\{\{\s*branding\.background_color\|default:"[^"]*"\s*\}\}/g, brandingSettings.email_background_color || '#f5f5f5')
      .replace(/\{\{\s*branding\.footer_text\s*\}\}/g, brandingSettings.email_footer_text || '')
      .replace(/\{\{\s*site_url\s*\}\}/g, window.location.origin)
      .replace(/\{\{\s*email_content\|safe\s*\}\}/g, previewContent.emailBody || '<p>Email content will appear here</p>')
      .replace(/\{%\s*now\s+"Y"\s*%\}/g, new Date().getFullYear().toString())
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccessMessage('')

    const data = {
      name,
      description,
      template_type: templateType || '',
      recipient_type: recipientType,
      is_custom: true,
      title_template: titleTemplate,
      body_template: bodyTemplate,
      email_subject_template: emailSubjectTemplate || '',
      email_body_template: emailBodyTemplate || '',
      default_channel: defaultChannel,
      is_active: isActive,
    }

    try {
      if (isEditing) {
        await updateTemplate(templateId!, data)
        setSuccessMessage('Template updated successfully')
        setTimeout(() => onSaved(), 1000)
      } else {
        await createTemplate(data)
        setSuccessMessage('Template created successfully')
        setTimeout(() => onSaved(), 1000)
      }
    } catch {
      // Error is handled by the hooks
    }
  }

  const isValid = name.trim() !== '' && titleTemplate.trim() !== '' && bodyTemplate.trim() !== ''
  const error = loadError || createError || updateError
  const isSaving = isCreating || isUpdating

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-[200]" onClick={onClose} />

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 right-0 bg-white shadow-xl z-[201] flex flex-col transition-all duration-300 ${
          showPreview ? 'w-3/4 min-w-[900px]' : 'w-1/2 min-w-[640px]'
        }`}
      >
        {/* Header */}
        <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-gray-900">
              {isEditing ? 'Edit Template' : 'New Template'}
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-lg transition-colors ${
                  showPreview
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Preview
              </button>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoadingTemplate ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6">
              {/* Success Message */}
              {successMessage && (
                <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg">
                  <Check className="w-5 h-5 text-green-600" />
                  <p className="text-[13px] text-green-700">{successMessage}</p>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <p className="text-[13px] text-red-700">{error}</p>
                </div>
              )}

              {/* Layout - conditional columns based on preview */}
              <div className={`${showPreview ? 'grid grid-cols-5 gap-6' : ''}`}>
                {/* Form Column */}
                <div className={`${showPreview ? 'col-span-3' : ''} space-y-5`}>
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <h3 className="text-[13px] font-semibold text-gray-900 uppercase tracking-wide">
                      Basic Information
                    </h3>

                    <div>
                      <label className="block text-[12px] font-medium text-gray-700 mb-1.5">
                        Template Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., Welcome Message"
                        className="w-full px-3 py-2.5 text-[13px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[12px] font-medium text-gray-700 mb-1.5">
                        Description
                      </label>
                      <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Brief description of when this template is used"
                        className="w-full px-3 py-2.5 text-[13px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[12px] font-medium text-gray-700 mb-1.5">
                          Type
                        </label>
                        <select
                          value={templateType}
                          onChange={(e) => setTemplateType(e.target.value)}
                          className="w-full px-3 py-2.5 text-[13px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                        >
                          <option value="">Custom</option>
                          {Object.entries(NotificationTypeLabels).map(([key, label]) => (
                            <option key={key} value={key}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[12px] font-medium text-gray-700 mb-1.5">
                          Recipient
                        </label>
                        <select
                          value={recipientType}
                          onChange={(e) => setRecipientType(e.target.value as RecipientType)}
                          className="w-full px-3 py-2.5 text-[13px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                        >
                          {Object.entries(RecipientTypeLabels).map(([key, label]) => (
                            <option key={key} value={key}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[12px] font-medium text-gray-700 mb-1.5">
                          Channel
                        </label>
                        <select
                          value={defaultChannel}
                          onChange={(e) => setDefaultChannel(e.target.value as NotificationChannel)}
                          className="w-full px-3 py-2.5 text-[13px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
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

                  {/* In-App Content */}
                  <div className="space-y-4 pt-4 border-t border-gray-200">
                    <h3 className="text-[13px] font-semibold text-gray-900 uppercase tracking-wide">
                      In-App Notification
                    </h3>

                    <div>
                      <label className="block text-[12px] font-medium text-gray-700 mb-1.5">
                        Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={titleTemplate}
                        onChange={(e) => setTitleTemplate(e.target.value)}
                        placeholder="e.g., Welcome to {company_name}!"
                        className="w-full px-3 py-2.5 text-[13px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                        required
                      />
                      <p className="mt-1 text-[11px] text-gray-500">
                        Use {'{variable}'} for dynamic content
                      </p>
                    </div>

                    <div>
                      <label className="block text-[12px] font-medium text-gray-700 mb-1.5">
                        Body <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={bodyTemplate}
                        onChange={(e) => setBodyTemplate(e.target.value)}
                        placeholder="e.g., Hi {first_name}, thank you for joining..."
                        rows={3}
                        className="w-full px-3 py-2.5 text-[13px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                        required
                      />
                    </div>
                  </div>

                  {/* Email Content */}
                  <div className="space-y-4 pt-4 border-t border-gray-200">
                    <h3 className="text-[13px] font-semibold text-gray-900 uppercase tracking-wide">
                      Email Content <span className="text-[11px] font-normal text-gray-500">(Optional)</span>
                    </h3>
                    <p className="text-[11px] text-gray-500 -mt-2">
                      Leave empty to use the in-app content for emails.
                    </p>

                    <div>
                      <label className="block text-[12px] font-medium text-gray-700 mb-1.5">
                        Email Subject
                      </label>
                      <input
                        type="text"
                        value={emailSubjectTemplate}
                        onChange={(e) => setEmailSubjectTemplate(e.target.value)}
                        placeholder="e.g., Welcome to {company_name}!"
                        className="w-full px-3 py-2.5 text-[13px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[12px] font-medium text-gray-700 mb-1.5">
                        Email Body (HTML)
                      </label>
                      <textarea
                        value={emailBodyTemplate}
                        onChange={(e) => setEmailBodyTemplate(e.target.value)}
                        placeholder="<p>Hi {first_name},</p><p>Thank you for joining...</p>"
                        rows={4}
                        className="w-full px-3 py-2.5 text-[13px] font-mono border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                      />
                    </div>
                  </div>

                  {/* Variable Reference */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="text-[12px] font-semibold text-gray-700 mb-2">Available Variables</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        '{first_name}',
                        '{last_name}',
                        '{email}',
                        '{company_name}',
                        '{job_title}',
                        '{date}',
                        '{time}',
                        '{link}',
                        '{name}',
                        '{stage}',
                      ].map((variable) => (
                        <code
                          key={variable}
                          className="px-1.5 py-0.5 text-[10px] bg-white border border-gray-200 rounded text-gray-600"
                        >
                          {variable}
                        </code>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Preview Column - only shown when preview is toggled on */}
                {showPreview && (
                  <div className="col-span-2">
                    <div className="sticky top-0 bg-white border border-gray-200 rounded-lg overflow-hidden">
                      {/* Preview Header with Tabs */}
                      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 bg-gray-50">
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4 text-gray-500" />
                          <span className="text-[13px] font-medium text-gray-900">Preview</span>
                        </div>
                        <div className="flex bg-gray-200 rounded-md p-0.5">
                          <button
                            type="button"
                            onClick={() => setPreviewTab('in_app')}
                            className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded transition-colors ${
                              previewTab === 'in_app'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                          >
                            <Bell className="w-3 h-3" />
                            In-App
                          </button>
                          <button
                            type="button"
                            onClick={() => setPreviewTab('email')}
                            className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded transition-colors ${
                              previewTab === 'email'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                          >
                            <Mail className="w-3 h-3" />
                            Email
                          </button>
                        </div>
                      </div>

                      {/* Preview Content */}
                      <div className="p-4">
                        {previewTab === 'in_app' ? (
                          <div className="space-y-3">
                            <p className="text-[10px] text-gray-500 uppercase tracking-wide">
                              Notification Preview
                            </p>

                            <div className="bg-blue-50/50 border border-gray-200 rounded-lg p-3">
                              <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                  <Bell className="w-4 h-4 text-gray-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[13px] font-medium text-gray-900 leading-tight">
                                    {previewContent.title || 'Title will appear here'}
                                  </p>
                                  <p className="text-[12px] text-gray-500 mt-0.5 line-clamp-2">
                                    {previewContent.body || 'Body text will appear here'}
                                  </p>
                                  <p className="text-[11px] text-gray-400 mt-1">Just now</p>
                                </div>
                                <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <p className="text-[10px] text-gray-500 uppercase tracking-wide">
                              Email Preview
                            </p>

                            <div className="text-[11px] text-gray-500 px-1">
                              <span className="font-medium text-gray-700">Subject:</span>{' '}
                              {previewContent.emailSubject || 'Subject will appear here'}
                            </div>

                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                              <iframe
                                title="Email Preview"
                                srcDoc={emailPreviewHtml}
                                className="w-full border-0"
                                style={{ height: '280px' }}
                                sandbox="allow-same-origin"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="border-t border-gray-200 px-4 py-2 bg-gray-50">
                        <p className="text-[10px] text-gray-500">
                          Variables are replaced with sample values
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-[13px] font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isEditing ? 'Save Changes' : 'Create Template'}
              </>
            )}
          </button>
        </div>
      </div>
    </>
  )
}
