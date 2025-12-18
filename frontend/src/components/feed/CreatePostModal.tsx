/**
 * CreatePostModal Component
 *
 * Modal for creating quick updates and selecting post type.
 * Quick updates can be created directly; articles redirect to full editor.
 * Staff users (admin/recruiter) can select which company to post as.
 */
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Image, FileText, MessageSquare, Loader2, Building2, ChevronDown } from 'lucide-react'
import { useCreateFeedPost, useAllCompanies } from '@/hooks'
import { useAuth } from '@/contexts/AuthContext'
import { FeedPostType, UserRole } from '@/types'

interface CreatePostModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function CreatePostModal({ isOpen, onClose }: CreatePostModalProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [postType, setPostType] = useState<'update' | 'article'>('update')
  const [content, setContent] = useState('')
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('')
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Check if user is staff (admin or recruiter)
  const isStaff = user?.role === UserRole.ADMIN || user?.role === UserRole.RECRUITER

  // Fetch companies for staff users
  const { companies, isLoading: companiesLoading } = useAllCompanies()

  // Set default company (platform company) when companies load
  useEffect(() => {
    if (isStaff && companies.length > 0 && !selectedCompanyId) {
      // Find platform company (is_platform=true) or default to first company
      const platformCompany = companies.find(c => c.is_platform)
      setSelectedCompanyId(platformCompany?.id || companies[0].id)
    }
  }, [companies, isStaff, selectedCompanyId])

  // Sort companies to put platform company first
  const sortedCompanies = [...companies].sort((a, b) => {
    if (a.is_platform && !b.is_platform) return -1
    if (!a.is_platform && b.is_platform) return 1
    return a.name.localeCompare(b.name)
  })

  const { mutate: createPost, isPending } = useCreateFeedPost()

  const selectedCompany = companies.find(c => c.id === selectedCompanyId)

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = () => {
    if (postType === 'article') {
      // Pass company_id to article editor if staff
      const params = isStaff && selectedCompanyId ? `?company_id=${selectedCompanyId}` : ''
      navigate(`/dashboard/feed/create/article${params}`)
      onClose()
      return
    }

    if (!content.trim()) return

    const formData = new FormData()
    formData.append('post_type', FeedPostType.UPDATE)
    formData.append('content', content)
    formData.append('status', 'published')

    if (selectedImage) {
      formData.append('featured_image', selectedImage)
    }

    // Include company_id for staff users
    if (isStaff && selectedCompanyId) {
      formData.append('company_id', selectedCompanyId)
    }

    createPost(formData, {
      onSuccess: () => {
        setContent('')
        setSelectedImage(null)
        setImagePreview(null)
        onClose()
      },
      onError: (error: Error & { response?: { data?: unknown } }) => {
        console.error('Failed to create post:', error.response?.data || error.message)
        alert('Failed to create post. Check console for details.')
      },
    })
  }

  const handleClose = () => {
    if (!isPending) {
      setContent('')
      setSelectedImage(null)
      setImagePreview(null)
      setPostType('update')
      setShowCompanyDropdown(false)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-[16px] font-semibold text-gray-900">Create Post</h2>
            <button
              onClick={handleClose}
              disabled={isPending}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Post Type Tabs */}
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setPostType('update')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-[14px] font-medium transition-colors ${
                postType === 'update'
                  ? 'text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Quick Update
            </button>
            <button
              onClick={() => setPostType('article')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-[14px] font-medium transition-colors ${
                postType === 'article'
                  ? 'text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileText className="w-4 h-4" />
              Article
            </button>
          </div>

          {/* Company Selector (Staff Only) */}
          {isStaff && (
            <div className="px-5 pt-4 pb-2">
              <label className="block text-[12px] font-medium text-gray-500 mb-1.5">
                Posting as
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCompanyDropdown(!showCompanyDropdown)}
                  disabled={companiesLoading || isPending}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-[14px] text-left bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900">
                      {companiesLoading
                        ? 'Loading companies...'
                        : selectedCompany?.name || 'Select company'}
                    </span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showCompanyDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown */}
                {showCompanyDropdown && !companiesLoading && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {sortedCompanies.map((company) => (
                      <button
                        key={company.id}
                        type="button"
                        onClick={() => {
                          setSelectedCompanyId(company.id)
                          setShowCompanyDropdown(false)
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2.5 text-[14px] text-left hover:bg-gray-50 transition-colors ${
                          selectedCompanyId === company.id ? 'bg-gray-100' : ''
                        }`}
                      >
                        {company.logo ? (
                          <img
                            src={company.logo}
                            alt={company.name}
                            className="w-5 h-5 rounded object-cover"
                          />
                        ) : (
                          <Building2 className="w-5 h-5 text-gray-400" />
                        )}
                        <span className="text-gray-900">{company.name}</span>
                        {company.is_platform && (
                          <span className="ml-auto text-[11px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                            Platform
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Content */}
          <div className="p-5">
            {postType === 'update' ? (
              <>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What's happening at your company?"
                  className="w-full h-32 px-3 py-2 text-[14px] text-gray-900 placeholder-gray-400 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300"
                  maxLength={500}
                  disabled={isPending}
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[12px] text-gray-400">
                    {content.length}/500 characters
                  </span>
                </div>

                {/* Image Preview */}
                {imagePreview && (
                  <div className="mt-4 relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <button
                      onClick={removeImage}
                      disabled={isPending}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Add Image Button */}
                <div className="mt-4 flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isPending}
                    className="flex items-center gap-2 px-3 py-2 text-[13px] text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    <Image className="w-4 h-4" />
                    {imagePreview ? 'Change Image' : 'Add Image'}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-[14px] text-gray-600 mb-1">
                  Create a full article with rich formatting
                </p>
                <p className="text-[13px] text-gray-400">
                  You'll be taken to the article editor
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100">
            <button
              onClick={handleClose}
              disabled={isPending}
              className="px-4 py-2 text-[14px] font-medium text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isPending || (postType === 'update' && !content.trim())}
              className="flex items-center gap-2 px-4 py-2 text-[14px] font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {postType === 'article' ? 'Open Editor' : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
