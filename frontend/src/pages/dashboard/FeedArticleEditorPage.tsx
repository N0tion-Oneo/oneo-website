/**
 * FeedArticleEditorPage
 *
 * Full-featured article editor for creating feed articles.
 * Uses the same BlockEditor component as the CMS blog editor.
 */
import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Save, Image as ImageIcon, Loader2, X } from 'lucide-react'
import { useCreateFeedPost } from '@/hooks'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { BlockEditor, type BlockEditorHandle } from '@/components/cms'
import { FeedPostType, UserRole } from '@/types'
import type { EditorJSData } from '@/types'

const defaultContent: EditorJSData = {
  time: Date.now(),
  blocks: [],
  version: '2.28.0',
}

export default function FeedArticleEditorPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  const editorRef = useRef<BlockEditorHandle>(null)

  const [title, setTitle] = useState('')
  const [featuredImagePreview, setFeaturedImagePreview] = useState<string | null>(null)
  const [featuredImageFile, setFeaturedImageFile] = useState<File | null>(null)

  const { mutate: createPost, isPending } = useCreateFeedPost()

  // Check if user can create posts
  const canCreatePost =
    user?.role === UserRole.CLIENT ||
    user?.role === UserRole.ADMIN ||
    user?.role === UserRole.RECRUITER

  const handleFeaturedImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFeaturedImageFile(file)
      const reader = new FileReader()
      reader.onload = () => {
        setFeaturedImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      showToast('Title is required', 'error')
      return
    }

    // Get content from editor
    const content = await editorRef.current?.save()

    if (!content || content.blocks.length === 0) {
      showToast('Please add some content to your article', 'error')
      return
    }

    const formData = new FormData()
    formData.append('post_type', FeedPostType.ARTICLE)
    formData.append('title', title)
    formData.append('content_blocks', JSON.stringify(content))
    formData.append('status', 'published')

    if (featuredImageFile) {
      formData.append('featured_image', featuredImageFile)
    }

    createPost(formData, {
      onSuccess: () => {
        showToast('Article published successfully', 'success')
        navigate('/dashboard/feed')
      },
      onError: () => {
        showToast('Failed to publish article', 'error')
      },
    })
  }

  if (!canCreatePost) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
          <p className="text-[15px] text-gray-700 dark:text-gray-300 mb-2">Access Denied</p>
          <p className="text-[13px] text-gray-500 dark:text-gray-400">
            You do not have permission to create articles.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 -mx-4 px-4 py-4 mb-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard/feed"
              className="flex items-center gap-1 text-[13px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Feed
            </Link>
            <div className="h-4 w-px bg-gray-200 dark:bg-gray-600" />
            <h1 className="text-[16px] font-medium text-gray-900 dark:text-gray-100">New Article</h1>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 text-[14px] font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Publish
          </button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        {/* Featured Image */}
        <div className="mb-6">
          {featuredImagePreview ? (
            <div className="relative aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
              <img
                src={featuredImagePreview}
                alt="Featured"
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => {
                  setFeaturedImagePreview(null)
                  setFeaturedImageFile(null)
                }}
                className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-black/80"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center h-48 bg-gray-50 dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
              <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-[14px] text-gray-500 dark:text-gray-400">Add a cover image</span>
              <span className="text-[12px] text-gray-400 mt-1">Optional but recommended</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFeaturedImageChange}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* Title Input */}
        <input
          type="text"
          placeholder="Article Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full text-[28px] font-semibold text-gray-900 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 bg-transparent border-0 focus:outline-none focus:ring-0 mb-6"
        />

        {/* Block Editor */}
        <BlockEditor
          ref={editorRef}
          initialData={defaultContent}
          placeholder="Start writing your article..."
          minHeight={400}
          editorId="feed-article-editor-new"
        />
      </div>
    </div>
  )
}
