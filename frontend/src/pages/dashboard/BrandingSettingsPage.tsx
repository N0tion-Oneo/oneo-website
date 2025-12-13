import React, { useState, useEffect, useRef } from 'react'
import {
  Palette,
  Building2,
  Mail,
  Globe,
  Link as LinkIcon,
  Code,
  RefreshCw,
  Save,
  AlertCircle,
  Check,
  Image,
  FileCode,
  RotateCcw,
  Type,
  Upload,
  X,
  ImageIcon,
} from 'lucide-react'
import { useBrandingSettings, useUpdateBranding, useResetBranding } from '@/hooks'
import { getMediaUrl } from '@/services/api'
import { evaluateDjangoConditionals } from '@/utils/djangoTemplates'
import type { BrandingSettingsUpdate } from '@/types'

// Color input component with preview
function ColorInput({
  label,
  value,
  onChange,
  helpText,
  compact = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  helpText?: string
  compact?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className={`${compact ? 'h-7 w-8' : 'h-10 w-14'} rounded border border-gray-300 cursor-pointer flex-shrink-0`}
        />
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className={`${compact ? 'w-20 text-xs px-2 py-1' : 'flex-1 text-sm'} rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black`}
        />
      </div>
      {helpText && (
        <p className="mt-1 text-xs text-gray-500">{helpText}</p>
      )}
    </div>
  )
}

// Color group component for primary/secondary/accent with variants
function ColorGroup({
  title,
  baseColor,
  darkColor,
  lightColor,
  onBaseChange,
  onDarkChange,
  onLightChange,
}: {
  title: string
  baseColor: string
  darkColor: string
  lightColor: string
  onBaseChange: (value: string) => void
  onDarkChange: (value: string) => void
  onLightChange: (value: string) => void
}) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <h4 className="text-sm font-semibold text-gray-800 mb-3">{title}</h4>
      <div className="space-y-3">
        <ColorInput
          label="Base"
          value={baseColor}
          onChange={onBaseChange}
          compact
        />
        <div className="grid grid-cols-2 gap-2">
          <ColorInput
            label="Dark"
            value={darkColor}
            onChange={onDarkChange}
            compact
          />
          <ColorInput
            label="Light"
            value={lightColor}
            onChange={onLightChange}
            compact
          />
        </div>
      </div>
      {/* Preview swatch */}
      <div className="mt-3 flex rounded overflow-hidden">
        <div className="h-5 flex-1" style={{ backgroundColor: darkColor }} />
        <div className="h-5 flex-1" style={{ backgroundColor: baseColor }} />
        <div className="h-5 flex-1" style={{ backgroundColor: lightColor }} />
      </div>
    </div>
  )
}

// Image upload component with preview
function ImageUpload({
  label,
  currentUrl,
  fallbackUrl,
  file,
  onFileChange,
  onClear,
  onFallbackUrlChange,
  accept = 'image/*',
  helpText,
  previewHeight = 'h-12',
  showUrlFallback = true,
}: {
  label: string
  currentUrl: string | null
  fallbackUrl: string
  file: File | null
  onFileChange: (file: File | null) => void
  onClear: () => void
  onFallbackUrlChange?: (url: string) => void
  accept?: string
  helpText?: string
  previewHeight?: string
  showUrlFallback?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  // Generate preview URL for new file
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    } else {
      setPreviewUrl(null)
    }
  }, [file])

  // The URL to display - file preview takes precedence, then current upload, then fallback URL
  const displayUrl = previewUrl || currentUrl || fallbackUrl

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      onFileChange(droppedFile)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      onFileChange(selectedFile)
    }
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">{label}</label>

      {/* Upload area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${
          dragOver ? 'border-black bg-gray-50' : 'border-gray-300 hover:border-gray-400'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
        />

        {displayUrl ? (
          // Show preview
          <div className="flex items-center gap-4">
            <div className={`${previewHeight} flex-shrink-0 bg-gray-100 rounded flex items-center justify-center overflow-hidden`}>
              <img
                src={displayUrl}
                alt="Preview"
                className={`${previewHeight} max-w-[200px] object-contain`}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              {file ? (
                <p className="text-sm text-gray-700 truncate">{file.name}</p>
              ) : currentUrl ? (
                <p className="text-sm text-gray-500">Uploaded file</p>
              ) : fallbackUrl ? (
                <p className="text-sm text-gray-500 truncate">URL: {fallbackUrl}</p>
              ) : null}
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="text-xs text-black hover:text-gray-600 font-medium"
                >
                  Change
                </button>
                {(file || currentUrl) && (
                  <button
                    type="button"
                    onClick={onClear}
                    className="text-xs text-red-600 hover:text-red-800 font-medium"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          // Show upload prompt
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-full flex flex-col items-center justify-center py-4 text-gray-500 hover:text-gray-700"
          >
            <Upload className="h-8 w-8 mb-2" />
            <span className="text-sm font-medium">Click to upload or drag and drop</span>
            <span className="text-xs text-gray-400 mt-1">PNG, JPG, SVG, or ICO</span>
          </button>
        )}
      </div>

      {helpText && <p className="text-xs text-gray-500">{helpText}</p>}

      {/* URL fallback input */}
      {showUrlFallback && onFallbackUrlChange && (
        <div className="pt-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Or enter URL (used if no file uploaded)
          </label>
          <input
            type="url"
            value={fallbackUrl}
            onChange={(e) => onFallbackUrlChange(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black text-sm"
            placeholder="https://example.com/logo.png"
          />
        </div>
      )}
    </div>
  )
}

// Section card component
function SettingsSection({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        </div>
      </div>
      <div className="px-6 py-5">
        {children}
      </div>
    </div>
  )
}

export default function BrandingSettingsPage() {
  const { settings, isLoading, error, refetch } = useBrandingSettings()
  const { updateSettings, isUpdating } = useUpdateBranding()
  const { resetSettings, isResetting } = useResetBranding()

  const [formData, setFormData] = useState<BrandingSettingsUpdate>({})
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // File upload state (separate from formData to handle File objects)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoDarkFile, setLogoDarkFile] = useState<File | null>(null)
  const [faviconFile, setFaviconFile] = useState<File | null>(null)

  // Track if files should be cleared (when user clicks Remove on existing uploads)
  const [clearLogo, setClearLogo] = useState(false)
  const [clearLogoDark, setClearLogoDark] = useState(false)
  const [clearFavicon, setClearFavicon] = useState(false)

  // Initialize form data when settings load
  useEffect(() => {
    if (settings) {
      setFormData({
        company_name: settings.company_name,
        tagline: settings.tagline,
        logo_url: settings.logo_url,
        logo_dark_url: settings.logo_dark_url,
        favicon_url: settings.favicon_url,
        font_family: settings.font_family,
        primary_color: settings.primary_color,
        primary_color_dark: settings.primary_color_dark,
        primary_color_light: settings.primary_color_light,
        secondary_color: settings.secondary_color,
        secondary_color_dark: settings.secondary_color_dark,
        secondary_color_light: settings.secondary_color_light,
        accent_color: settings.accent_color,
        accent_color_dark: settings.accent_color_dark,
        accent_color_light: settings.accent_color_light,
        success_color: settings.success_color,
        warning_color: settings.warning_color,
        error_color: settings.error_color,
        email_background_color: settings.email_background_color,
        email_header_background: settings.email_header_background,
        email_footer_text: settings.email_footer_text,
        website_url: settings.website_url,
        facebook_url: settings.facebook_url,
        twitter_url: settings.twitter_url,
        linkedin_url: settings.linkedin_url,
        instagram_url: settings.instagram_url,
        support_email: settings.support_email,
        contact_phone: settings.contact_phone,
        address: settings.address,
        privacy_policy_url: settings.privacy_policy_url,
        terms_of_service_url: settings.terms_of_service_url,
        custom_css: settings.custom_css,
        email_base_template: settings.email_base_template,
      })
    }
  }, [settings])

  const handleChange = (field: keyof BrandingSettingsUpdate, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setSaveSuccess(false)
    setSaveError(null)
  }

  const handleSave = async () => {
    try {
      // Build update data including file fields
      const updateData: BrandingSettingsUpdate = {
        ...formData,
      }

      // Add file uploads
      if (logoFile) {
        updateData.logo = logoFile
      } else if (clearLogo) {
        updateData.logo = null
      }

      if (logoDarkFile) {
        updateData.logo_dark = logoDarkFile
      } else if (clearLogoDark) {
        updateData.logo_dark = null
      }

      if (faviconFile) {
        updateData.favicon = faviconFile
      } else if (clearFavicon) {
        updateData.favicon = null
      }

      await updateSettings(updateData)

      // Reset file state after successful save
      setLogoFile(null)
      setLogoDarkFile(null)
      setFaviconFile(null)
      setClearLogo(false)
      setClearLogoDark(false)
      setClearFavicon(false)

      // Refetch to get updated URLs
      await refetch()

      setSaveSuccess(true)
      setSaveError(null)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch {
      setSaveError('Failed to save settings')
    }
  }

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset all branding settings to defaults? This cannot be undone.')) {
      return
    }
    try {
      const newSettings = await resetSettings()

      // Clear file state
      setLogoFile(null)
      setLogoDarkFile(null)
      setFaviconFile(null)
      setClearLogo(false)
      setClearLogoDark(false)
      setClearFavicon(false)

      setFormData({
        company_name: newSettings.company_name,
        tagline: newSettings.tagline,
        logo_url: newSettings.logo_url,
        logo_dark_url: newSettings.logo_dark_url,
        favicon_url: newSettings.favicon_url,
        font_family: newSettings.font_family,
        primary_color: newSettings.primary_color,
        primary_color_dark: newSettings.primary_color_dark,
        primary_color_light: newSettings.primary_color_light,
        secondary_color: newSettings.secondary_color,
        secondary_color_dark: newSettings.secondary_color_dark,
        secondary_color_light: newSettings.secondary_color_light,
        accent_color: newSettings.accent_color,
        accent_color_dark: newSettings.accent_color_dark,
        accent_color_light: newSettings.accent_color_light,
        success_color: newSettings.success_color,
        warning_color: newSettings.warning_color,
        error_color: newSettings.error_color,
        email_background_color: newSettings.email_background_color,
        email_header_background: newSettings.email_header_background,
        email_footer_text: newSettings.email_footer_text,
        website_url: newSettings.website_url,
        facebook_url: newSettings.facebook_url,
        twitter_url: newSettings.twitter_url,
        linkedin_url: newSettings.linkedin_url,
        instagram_url: newSettings.instagram_url,
        support_email: newSettings.support_email,
        contact_phone: newSettings.contact_phone,
        address: newSettings.address,
        privacy_policy_url: newSettings.privacy_policy_url,
        terms_of_service_url: newSettings.terms_of_service_url,
        custom_css: newSettings.custom_css,
        email_base_template: newSettings.email_base_template,
      })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch {
      setSaveError('Failed to reset settings')
    }
  }

  const handleResetEmailTemplate = async () => {
    if (!confirm('Are you sure you want to reset the email template? This will restore the default template by resetting all branding settings.')) {
      return
    }
    // Reset all settings to get the default template back
    try {
      const newSettings = await resetSettings()
      // Only update the email template, keep other form changes
      handleChange('email_base_template', newSettings.email_base_template)
    } catch {
      setSaveError('Failed to reset email template')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <p>{error}</p>
          </div>
          <button
            onClick={refetch}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-[13px] text-gray-500">
          Customize the look and feel of your platform
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            disabled={isResetting}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isResetting ? 'animate-spin' : ''}`} />
            Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={isUpdating}
            className="inline-flex items-center gap-2 px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-black hover:bg-gray-800 disabled:opacity-50"
          >
            {isUpdating ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : saveSuccess ? (
              <Check className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saveSuccess ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {saveError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="h-4 w-4" />
          <p className="text-sm">{saveError}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Company Information */}
        <SettingsSection title="Company Information" icon={Building2}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Name
              </label>
              <input
                type="text"
                value={formData.company_name || ''}
                onChange={(e) => handleChange('company_name', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
                placeholder="Your Company Name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tagline
              </label>
              <input
                type="text"
                value={formData.tagline || ''}
                onChange={(e) => handleChange('tagline', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
                placeholder="Your company tagline"
              />
            </div>
          </div>
        </SettingsSection>

        {/* Logo & Images */}
        <SettingsSection title="Logo & Images" icon={Image}>
          <div className="space-y-6">
            <ImageUpload
              label="Logo"
              currentUrl={clearLogo ? null : getMediaUrl(settings?.logo)}
              fallbackUrl={formData.logo_url || ''}
              file={logoFile}
              onFileChange={(file) => {
                setLogoFile(file)
                setClearLogo(false)
                setSaveSuccess(false)
                setSaveError(null)
              }}
              onClear={() => {
                setLogoFile(null)
                setClearLogo(true)
                setSaveSuccess(false)
                setSaveError(null)
              }}
              onFallbackUrlChange={(url) => handleChange('logo_url', url)}
              helpText="Recommended: PNG with transparent background, max height 50px"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ImageUpload
                label="Logo (Dark Mode)"
                currentUrl={clearLogoDark ? null : getMediaUrl(settings?.logo_dark)}
                fallbackUrl={formData.logo_dark_url || ''}
                file={logoDarkFile}
                onFileChange={(file) => {
                  setLogoDarkFile(file)
                  setClearLogoDark(false)
                  setSaveSuccess(false)
                  setSaveError(null)
                }}
                onClear={() => {
                  setLogoDarkFile(null)
                  setClearLogoDark(true)
                  setSaveSuccess(false)
                  setSaveError(null)
                }}
                onFallbackUrlChange={(url) => handleChange('logo_dark_url', url)}
                helpText="Used when displaying on dark backgrounds"
              />
              <ImageUpload
                label="Favicon"
                currentUrl={clearFavicon ? null : getMediaUrl(settings?.favicon)}
                fallbackUrl={formData.favicon_url || ''}
                file={faviconFile}
                onFileChange={(file) => {
                  setFaviconFile(file)
                  setClearFavicon(false)
                  setSaveSuccess(false)
                  setSaveError(null)
                }}
                onClear={() => {
                  setFaviconFile(null)
                  setClearFavicon(true)
                  setSaveSuccess(false)
                  setSaveError(null)
                }}
                onFallbackUrlChange={(url) => handleChange('favicon_url', url)}
                accept="image/*,.ico"
                previewHeight="h-8"
                helpText="Recommended: .ico or .png, 32x32 or 16x16"
              />
            </div>
          </div>
        </SettingsSection>

        {/* Typography */}
        <SettingsSection title="Typography" icon={Type}>
          <div className="max-w-md">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Font Family
            </label>
            <input
              type="text"
              value={formData.font_family || ''}
              onChange={(e) => handleChange('font_family', e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
              placeholder="Poppins"
            />
            <p className="mt-1 text-xs text-gray-500">
              Primary font for the application (e.g., Poppins, Inter, Roboto)
            </p>
            {formData.font_family && (
              <div className="mt-3 p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-2">Preview:</p>
                <p style={{ fontFamily: formData.font_family }} className="text-lg">
                  The quick brown fox jumps over the lazy dog
                </p>
              </div>
            )}
          </div>
        </SettingsSection>

        {/* Brand Colors */}
        <SettingsSection title="Brand Colors" icon={Palette}>
          <p className="text-sm text-gray-600 mb-4">
            Configure your brand color palette. Each color has dark and light variants for flexibility.
          </p>

          {/* Color Groups */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <ColorGroup
              title="Primary"
              baseColor={formData.primary_color || '#003E49'}
              darkColor={formData.primary_color_dark || '#002A32'}
              lightColor={formData.primary_color_light || '#0D646D'}
              onBaseChange={(v) => handleChange('primary_color', v)}
              onDarkChange={(v) => handleChange('primary_color_dark', v)}
              onLightChange={(v) => handleChange('primary_color_light', v)}
            />
            <ColorGroup
              title="Secondary"
              baseColor={formData.secondary_color || '#0D646D'}
              darkColor={formData.secondary_color_dark || '#064852'}
              lightColor={formData.secondary_color_light || '#1A7A88'}
              onBaseChange={(v) => handleChange('secondary_color', v)}
              onDarkChange={(v) => handleChange('secondary_color_dark', v)}
              onLightChange={(v) => handleChange('secondary_color_light', v)}
            />
            <ColorGroup
              title="Accent"
              baseColor={formData.accent_color || '#FF7B55'}
              darkColor={formData.accent_color_dark || '#E65A35'}
              lightColor={formData.accent_color_light || '#FFAB97'}
              onBaseChange={(v) => handleChange('accent_color', v)}
              onDarkChange={(v) => handleChange('accent_color_dark', v)}
              onLightChange={(v) => handleChange('accent_color_light', v)}
            />
          </div>

          {/* Status Colors */}
          <h4 className="text-sm font-semibold text-gray-800 mb-3 mt-6">Status Colors</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ColorInput
              label="Success"
              value={formData.success_color || ''}
              onChange={(v) => handleChange('success_color', v)}
              helpText="Used for success states"
            />
            <ColorInput
              label="Warning"
              value={formData.warning_color || ''}
              onChange={(v) => handleChange('warning_color', v)}
              helpText="Used for warnings"
            />
            <ColorInput
              label="Error"
              value={formData.error_color || ''}
              onChange={(v) => handleChange('error_color', v)}
              helpText="Used for errors"
            />
          </div>

          {/* Color Preview */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-3">Preview</p>
            <div className="flex flex-wrap gap-4">
              <button
                style={{ backgroundColor: formData.primary_color || '#003E49' }}
                className="px-4 py-2 text-white rounded-lg text-sm font-medium"
              >
                Primary Button
              </button>
              <button
                style={{ backgroundColor: formData.secondary_color || '#0D646D' }}
                className="px-4 py-2 text-white rounded-lg text-sm font-medium"
              >
                Secondary Button
              </button>
              <button
                style={{ backgroundColor: formData.accent_color || '#FF7B55' }}
                className="px-4 py-2 text-white rounded-lg text-sm font-medium"
              >
                Accent Button
              </button>
              <span
                style={{
                  backgroundColor: `${formData.success_color || '#10b981'}20`,
                  color: formData.success_color || '#10b981',
                  borderColor: formData.success_color || '#10b981',
                }}
                className="px-3 py-1 rounded-full text-xs font-medium border"
              >
                Success
              </span>
              <span
                style={{
                  backgroundColor: `${formData.warning_color || '#f97316'}20`,
                  color: formData.warning_color || '#f97316',
                  borderColor: formData.warning_color || '#f97316',
                }}
                className="px-3 py-1 rounded-full text-xs font-medium border"
              >
                Warning
              </span>
              <span
                style={{
                  backgroundColor: `${formData.error_color || '#ef4444'}20`,
                  color: formData.error_color || '#ef4444',
                  borderColor: formData.error_color || '#ef4444',
                }}
                className="px-3 py-1 rounded-full text-xs font-medium border"
              >
                Error
              </span>
            </div>
          </div>
        </SettingsSection>

        {/* Email Settings */}
        <SettingsSection title="Email Settings" icon={Mail}>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ColorInput
                label="Email Background Color"
                value={formData.email_background_color || ''}
                onChange={(v) => handleChange('email_background_color', v)}
                helpText="Background color for email wrapper"
              />
              <ColorInput
                label="Email Header Background"
                value={formData.email_header_background || ''}
                onChange={(v) => handleChange('email_header_background', v)}
                helpText="Background color for email header/footer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Footer Text
              </label>
              <textarea
                value={formData.email_footer_text || ''}
                onChange={(e) => handleChange('email_footer_text', e.target.value)}
                rows={3}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
                placeholder="If you have any questions, please contact the hiring team directly."
              />
            </div>
          </div>
        </SettingsSection>

        {/* Social Links */}
        <SettingsSection title="Social Links" icon={Globe}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Website URL
              </label>
              <input
                type="url"
                value={formData.website_url || ''}
                onChange={(e) => handleChange('website_url', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
                placeholder="https://yourcompany.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Facebook URL
              </label>
              <input
                type="url"
                value={formData.facebook_url || ''}
                onChange={(e) => handleChange('facebook_url', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
                placeholder="https://facebook.com/yourcompany"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Twitter URL
              </label>
              <input
                type="url"
                value={formData.twitter_url || ''}
                onChange={(e) => handleChange('twitter_url', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
                placeholder="https://twitter.com/yourcompany"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                LinkedIn URL
              </label>
              <input
                type="url"
                value={formData.linkedin_url || ''}
                onChange={(e) => handleChange('linkedin_url', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
                placeholder="https://linkedin.com/company/yourcompany"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Instagram URL
              </label>
              <input
                type="url"
                value={formData.instagram_url || ''}
                onChange={(e) => handleChange('instagram_url', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
                placeholder="https://instagram.com/yourcompany"
              />
            </div>
          </div>
        </SettingsSection>

        {/* Contact Information */}
        <SettingsSection title="Contact Information" icon={Building2}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Support Email
              </label>
              <input
                type="email"
                value={formData.support_email || ''}
                onChange={(e) => handleChange('support_email', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
                placeholder="support@yourcompany.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Phone
              </label>
              <input
                type="tel"
                value={formData.contact_phone || ''}
                onChange={(e) => handleChange('contact_phone', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <textarea
              value={formData.address || ''}
              onChange={(e) => handleChange('address', e.target.value)}
              rows={2}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
              placeholder="123 Main Street, Suite 100, City, State 12345"
            />
          </div>
        </SettingsSection>

        {/* Legal Links */}
        <SettingsSection title="Legal" icon={LinkIcon}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Privacy Policy URL
              </label>
              <input
                type="url"
                value={formData.privacy_policy_url || ''}
                onChange={(e) => handleChange('privacy_policy_url', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
                placeholder="https://yourcompany.com/privacy"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Terms of Service URL
              </label>
              <input
                type="url"
                value={formData.terms_of_service_url || ''}
                onChange={(e) => handleChange('terms_of_service_url', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
                placeholder="https://yourcompany.com/terms"
              />
            </div>
          </div>
        </SettingsSection>

        {/* Advanced */}
        <SettingsSection title="Advanced" icon={Code}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Custom CSS
            </label>
            <textarea
              value={formData.custom_css || ''}
              onChange={(e) => handleChange('custom_css', e.target.value)}
              rows={6}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black font-mono text-sm"
              placeholder="/* Add custom CSS rules for emails here */"
            />
            <p className="mt-1 text-xs text-gray-500">
              Custom CSS will be injected into email templates. Use with caution.
            </p>
          </div>
        </SettingsSection>

        {/* Email Template */}
        <SettingsSection title="Email Template" icon={FileCode}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Customize the base HTML template used for all notification emails.
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Use <code className="px-1 py-0.5 bg-gray-100 rounded">{'{{ email_content|safe }}'}</code> to inject the email content.
                </p>
              </div>
              <button
                onClick={handleResetEmailTemplate}
                disabled={isResetting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Template
              </button>
            </div>

            <details className="bg-amber-50 border border-amber-200 rounded-lg">
              <summary className="px-3 py-2 text-sm font-medium text-amber-800 cursor-pointer hover:bg-amber-100 rounded-lg">
                Available Template Variables (click to expand)
              </summary>
              <div className="px-3 pb-3 space-y-3 text-xs">
                {/* Essential */}
                <div>
                  <p className="font-semibold text-amber-900 mb-1">Essential</p>
                  <div className="flex flex-wrap gap-1">
                    <code className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded">{'{{ email_content|safe }}'}</code>
                    <code className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded">{'{{ site_url }}'}</code>
                  </div>
                </div>

                {/* Company Info */}
                <div>
                  <p className="font-semibold text-amber-900 mb-1">Company Info</p>
                  <div className="flex flex-wrap gap-1">
                    <code className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded">{'{{ branding.company_name }}'}</code>
                    <code className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded">{'{{ branding.tagline }}'}</code>
                    <code className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded">{'{{ branding.logo_url }}'}</code>
                  </div>
                </div>

                {/* Typography */}
                <div>
                  <p className="font-semibold text-amber-900 mb-1">Typography</p>
                  <div className="flex flex-wrap gap-1">
                    <code className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded">{'{{ branding.font_family }}'}</code>
                  </div>
                </div>

                {/* Colors */}
                <div>
                  <p className="font-semibold text-amber-900 mb-1">Colors</p>
                  <div className="flex flex-wrap gap-1">
                    <code className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded">{'{{ branding.primary_color }}'}</code>
                    <code className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded">{'{{ branding.primary_color_dark }}'}</code>
                    <code className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded">{'{{ branding.primary_color_light }}'}</code>
                    <code className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded">{'{{ branding.secondary_color }}'}</code>
                    <code className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded">{'{{ branding.secondary_color_dark }}'}</code>
                    <code className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded">{'{{ branding.secondary_color_light }}'}</code>
                    <code className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded">{'{{ branding.accent_color }}'}</code>
                    <code className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded">{'{{ branding.accent_color_dark }}'}</code>
                    <code className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded">{'{{ branding.accent_color_light }}'}</code>
                  </div>
                </div>

                {/* Status Colors */}
                <div>
                  <p className="font-semibold text-amber-900 mb-1">Status Colors</p>
                  <div className="flex flex-wrap gap-1">
                    <code className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded">{'{{ branding.success_color }}'}</code>
                    <code className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded">{'{{ branding.warning_color }}'}</code>
                    <code className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded">{'{{ branding.error_color }}'}</code>
                  </div>
                </div>

                {/* Email Settings */}
                <div>
                  <p className="font-semibold text-amber-900 mb-1">Email Settings</p>
                  <div className="flex flex-wrap gap-1">
                    <code className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded">{'{{ branding.background_color }}'}</code>
                    <code className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded">{'{{ branding.header_background }}'}</code>
                    <code className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded">{'{{ branding.footer_text }}'}</code>
                    <code className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded">{'{{ branding.custom_css|safe }}'}</code>
                  </div>
                </div>

                {/* Social & Links */}
                <div>
                  <p className="font-semibold text-amber-900 mb-1">Social & Links</p>
                  <div className="flex flex-wrap gap-1">
                    <code className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded">{'{{ branding.website_url }}'}</code>
                    <code className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded">{'{{ branding.facebook_url }}'}</code>
                    <code className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded">{'{{ branding.twitter_url }}'}</code>
                    <code className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded">{'{{ branding.linkedin_url }}'}</code>
                    <code className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded">{'{{ branding.instagram_url }}'}</code>
                    <code className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded">{'{{ branding.support_email }}'}</code>
                    <code className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded">{'{{ branding.privacy_policy_url }}'}</code>
                    <code className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded">{'{{ branding.terms_of_service_url }}'}</code>
                  </div>
                </div>

                {/* Django Template Tags */}
                <div>
                  <p className="font-semibold text-amber-900 mb-1">Django Template Tags</p>
                  <div className="flex flex-wrap gap-1">
                    <code className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded">{'{% if condition %}...{% endif %}'}</code>
                    <code className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded">{'{% now "Y" %}'}</code>
                    <code className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded">{'{{ var|default:"fallback" }}'}</code>
                  </div>
                </div>
              </div>
            </details>

            {/* Side-by-side editor and preview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Editor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Base Email Template (HTML)
                </label>
                <textarea
                  value={formData.email_base_template ?? settings?.email_base_template ?? ''}
                  onChange={(e) => handleChange('email_base_template', e.target.value)}
                  rows={24}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black font-mono text-xs leading-relaxed"
                  placeholder="<!-- Enter your custom HTML email template here -->"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {formData.email_base_template !== undefined && formData.email_base_template !== settings?.email_base_template ? (
                    <span className="text-amber-600">Unsaved changes. Click Save to apply.</span>
                  ) : (
                    'Edit the template above to customize your emails.'
                  )}
                </p>
              </div>

              {/* Preview */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Live Preview
                </label>
                <div className="border border-gray-300 rounded-md bg-white overflow-hidden" style={{ height: '540px' }}>
                  <iframe
                    title="Email Template Preview"
                    srcDoc={(() => {
                      const template = formData.email_base_template ?? settings?.email_base_template ?? ''
                      const logoUrl = getMediaUrl(settings?.effective_logo_url) || formData.logo_url || ''
                      const logoDarkUrl = getMediaUrl(settings?.effective_logo_dark_url) || formData.logo_dark_url || ''

                      // Build context for conditional evaluation
                      // Use formData first, fall back to settings for initial render
                      const conditionalContext: Record<string, unknown> = {
                        logo_url: logoUrl,
                        logo_dark_url: logoDarkUrl,
                        tagline: formData.tagline ?? settings?.tagline,
                        footer_text: formData.email_footer_text ?? settings?.email_footer_text,
                        website_url: formData.website_url ?? settings?.website_url,
                        facebook_url: formData.facebook_url ?? settings?.facebook_url,
                        twitter_url: formData.twitter_url ?? settings?.twitter_url,
                        linkedin_url: formData.linkedin_url ?? settings?.linkedin_url,
                        instagram_url: formData.instagram_url ?? settings?.instagram_url,
                        support_email: formData.support_email ?? settings?.support_email,
                        privacy_policy_url: formData.privacy_policy_url ?? settings?.privacy_policy_url,
                        terms_of_service_url: formData.terms_of_service_url ?? settings?.terms_of_service_url,
                      }

                      // First, evaluate Django conditionals
                      let processedHtml = evaluateDjangoConditionals(template, conditionalContext)

                      // Then do variable substitution
                      return processedHtml
                        // Company Info
                        .replace(/\{\{\s*branding\.company_name\s*\}\}/g, formData.company_name || '')
                        .replace(/\{\{\s*branding\.company_name\|default:"[^"]*"\s*\}\}/g, formData.company_name || '')
                        .replace(/\{\{\s*branding\.company_name\|default:'[^']*'\s*\}\}/g, formData.company_name || '')
                        .replace(/\{\{\s*branding\.tagline\s*\}\}/g, formData.tagline || 'Recruitment Made Simple')
                        .replace(/\{\{\s*branding\.logo_url\s*\}\}/g, logoUrl)
                        .replace(/\{\{\s*branding\.logo_dark_url\s*\}\}/g, logoDarkUrl)
                        // Typography
                        .replace(/\{\{\s*branding\.font_family\s*\}\}/g, formData.font_family || 'Poppins')
                        .replace(/\{\{\s*branding\.font_family\|default:"[^"]*"\s*\}\}/g, formData.font_family || 'Poppins')
                        // Primary Colors
                        .replace(/\{\{\s*branding\.primary_color\s*\}\}/g, formData.primary_color || '#003E49')
                        .replace(/\{\{\s*branding\.primary_color\|default:"[^"]*"\s*\}\}/g, formData.primary_color || '#003E49')
                        .replace(/\{\{\s*branding\.primary_color_dark\s*\}\}/g, formData.primary_color_dark || '#002A32')
                        .replace(/\{\{\s*branding\.primary_color_dark\|default:"[^"]*"\s*\}\}/g, formData.primary_color_dark || '#002A32')
                        .replace(/\{\{\s*branding\.primary_color_light\s*\}\}/g, formData.primary_color_light || '#0D646D')
                        .replace(/\{\{\s*branding\.primary_color_light\|default:"[^"]*"\s*\}\}/g, formData.primary_color_light || '#0D646D')
                        // Secondary Colors
                        .replace(/\{\{\s*branding\.secondary_color\s*\}\}/g, formData.secondary_color || '#0D646D')
                        .replace(/\{\{\s*branding\.secondary_color\|default:"[^"]*"\s*\}\}/g, formData.secondary_color || '#0D646D')
                        .replace(/\{\{\s*branding\.secondary_color_dark\s*\}\}/g, formData.secondary_color_dark || '#064852')
                        .replace(/\{\{\s*branding\.secondary_color_light\s*\}\}/g, formData.secondary_color_light || '#1A7A88')
                        // Accent Colors
                        .replace(/\{\{\s*branding\.accent_color\s*\}\}/g, formData.accent_color || '#FF7B55')
                        .replace(/\{\{\s*branding\.accent_color\|default:"[^"]*"\s*\}\}/g, formData.accent_color || '#FF7B55')
                        .replace(/\{\{\s*branding\.accent_color_dark\s*\}\}/g, formData.accent_color_dark || '#E65A35')
                        .replace(/\{\{\s*branding\.accent_color_dark\|default:"[^"]*"\s*\}\}/g, formData.accent_color_dark || '#E65A35')
                        .replace(/\{\{\s*branding\.accent_color_light\s*\}\}/g, formData.accent_color_light || '#FFAB97')
                        .replace(/\{\{\s*branding\.accent_color_light\|default:"[^"]*"\s*\}\}/g, formData.accent_color_light || '#FFAB97')
                        // Status Colors
                        .replace(/\{\{\s*branding\.success_color\s*\}\}/g, formData.success_color || '#10b981')
                        .replace(/\{\{\s*branding\.success_color\|default:"[^"]*"\s*\}\}/g, formData.success_color || '#10b981')
                        .replace(/\{\{\s*branding\.warning_color\s*\}\}/g, formData.warning_color || '#f97316')
                        .replace(/\{\{\s*branding\.warning_color\|default:"[^"]*"\s*\}\}/g, formData.warning_color || '#f97316')
                        .replace(/\{\{\s*branding\.error_color\s*\}\}/g, formData.error_color || '#ef4444')
                        .replace(/\{\{\s*branding\.error_color\|default:"[^"]*"\s*\}\}/g, formData.error_color || '#ef4444')
                        // Email Settings
                        .replace(/\{\{\s*branding\.background_color\s*\}\}/g, formData.email_background_color || '#f5f5f5')
                        .replace(/\{\{\s*branding\.background_color\|default:"[^"]*"\s*\}\}/g, formData.email_background_color || '#f5f5f5')
                        .replace(/\{\{\s*branding\.header_background\s*\}\}/g, formData.email_header_background || '#fafafa')
                        .replace(/\{\{\s*branding\.header_background\|default:"[^"]*"\s*\}\}/g, formData.email_header_background || '#fafafa')
                        .replace(/\{\{\s*branding\.footer_text\s*\}\}/g, formData.email_footer_text || '')
                        .replace(/\{\{\s*branding\.custom_css\s*\}\}/g, formData.custom_css || '')
                        .replace(/\{\{\s*branding\.custom_css\|default:"[^"]*"\|safe\s*\}\}/g, formData.custom_css || '')
                        // Social & Links (use formData first, fall back to settings)
                        .replace(/\{\{\s*branding\.website_url\s*\}\}/g, formData.website_url ?? settings?.website_url ?? '')
                        .replace(/\{\{\s*branding\.facebook_url\s*\}\}/g, formData.facebook_url ?? settings?.facebook_url ?? '')
                        .replace(/\{\{\s*branding\.twitter_url\s*\}\}/g, formData.twitter_url ?? settings?.twitter_url ?? '')
                        .replace(/\{\{\s*branding\.linkedin_url\s*\}\}/g, formData.linkedin_url ?? settings?.linkedin_url ?? '')
                        .replace(/\{\{\s*branding\.instagram_url\s*\}\}/g, formData.instagram_url ?? settings?.instagram_url ?? '')
                        .replace(/\{\{\s*branding\.support_email\s*\}\}/g, formData.support_email ?? settings?.support_email ?? '')
                        .replace(/\{\{\s*branding\.privacy_policy_url\s*\}\}/g, formData.privacy_policy_url ?? settings?.privacy_policy_url ?? '')
                        .replace(/\{\{\s*branding\.terms_of_service_url\s*\}\}/g, formData.terms_of_service_url ?? settings?.terms_of_service_url ?? '')
                        // Site URL
                        .replace(/\{\{\s*site_url\s*\}\}/g, window.location.origin)
                        // Email content placeholder
                        .replace(/\{\{\s*email_content\|safe\s*\}\}/g, `
                          <h1>Sample Email Title</h1>
                          <p>This is a preview of how your email content will appear within the template.</p>
                          <p>The actual content will vary based on the notification type.</p>
                          <p><a href="#" class="button">View Details</a></p>
                        `)
                        // Preheader
                        .replace(/\{\{\s*preheader_text\|default:[^}]+\}\}/g, formData.tagline || 'Update')
                        // Year
                        .replace(/\{%\s*now\s+"Y"\s*%\}/g, new Date().getFullYear().toString())
                        // Block tags (for extending templates)
                        .replace(/\{%\s*block\s+\w+\s*%\}/g, '')
                        .replace(/\{%\s*endblock\s*%\}/g, '')
                    })()}
                    className="w-full h-full border-0"
                    sandbox="allow-same-origin"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Preview updates as you type. Sample content shown for demonstration.
                </p>
              </div>
            </div>
          </div>
        </SettingsSection>

        {/* Last Updated */}
        {settings?.updated_at && (
          <p className="text-sm text-gray-500 text-right">
            Last updated: {new Date(settings.updated_at).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  )
}
