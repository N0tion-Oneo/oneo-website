// CMS Blog Posts List Page
import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cmsBlog } from '@/services/cms'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { UserRole, ContentStatus, ContentStatusLabels } from '@/types'
import type { CMSBlogPostListItem } from '@/types'
import {
  Plus,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  Eye,
  FileText,
  AlertCircle,
  Star,
  Calendar,
  BarChart2,
} from 'lucide-react'

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: ContentStatus.DRAFT, label: 'Draft' },
  { value: ContentStatus.PUBLISHED, label: 'Published' },
  { value: ContentStatus.ARCHIVED, label: 'Archived' },
]

export default function CMSBlogListPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [featuredFilter, setFeaturedFilter] = useState<boolean | undefined>()
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  // Fetch blog posts
  const { data: posts = [], isLoading, error } = useQuery({
    queryKey: ['cms-blog', statusFilter, categoryFilter, featuredFilter],
    queryFn: () => cmsBlog.list({
      status: statusFilter || undefined,
      category: categoryFilter || undefined,
      is_featured: featuredFilter,
    }),
  })

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['cms-blog-categories'],
    queryFn: () => cmsBlog.getCategories(),
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => cmsBlog.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-blog'] })
      showToast('Blog post deleted successfully', 'success')
    },
    onError: () => {
      showToast('Failed to delete blog post', 'error')
    },
  })

  // Filter posts by search
  const filteredPosts = useMemo(() => {
    if (!search) return posts
    const searchLower = search.toLowerCase()
    return posts.filter(
      (post) =>
        post.title.toLowerCase().includes(searchLower) ||
        post.slug.toLowerCase().includes(searchLower) ||
        post.excerpt.toLowerCase().includes(searchLower)
    )
  }, [posts, search])

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this blog post?')) {
      deleteMutation.mutate(id)
    }
    setOpenMenu(null)
  }

  const getStatusBadge = (status: ContentStatus) => {
    const styles: Record<ContentStatus, string> = {
      [ContentStatus.DRAFT]: 'bg-yellow-100 text-yellow-700',
      [ContentStatus.PUBLISHED]: 'bg-green-100 text-green-700',
      [ContentStatus.ARCHIVED]: 'bg-gray-100 text-gray-600',
    }
    return (
      <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium rounded ${styles[status]}`}>
        {ContentStatusLabels[status]}
      </span>
    )
  }

  // Access check
  if (!user || ![UserRole.ADMIN, UserRole.RECRUITER].includes(user.role)) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
        <p className="text-[15px] text-gray-700 mb-2">Access Denied</p>
        <p className="text-[13px] text-gray-500">
          You do not have permission to manage blog posts.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold text-gray-900">Blog Posts</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">
            Manage your blog content
          </p>
        </div>
        <Link
          to="/dashboard/cms/blog/new"
          className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Post
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search posts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.name} value={cat.name}>
              {cat.name} ({cat.count})
            </option>
          ))}
        </select>

        {/* Featured Filter */}
        <button
          onClick={() => setFeaturedFilter(featuredFilter === true ? undefined : true)}
          className={`flex items-center gap-1.5 px-3 py-2 text-[13px] border rounded-md transition-colors ${
            featuredFilter === true
              ? 'border-yellow-300 bg-yellow-50 text-yellow-700'
              : 'border-gray-200 text-gray-500 hover:bg-gray-50'
          }`}
        >
          <Star className="w-4 h-4" />
          Featured
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <p className="text-[14px] text-gray-500">Loading posts...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <p className="text-[14px] text-red-500">Failed to load posts</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredPosts.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-[15px] text-gray-700 mb-1">No blog posts found</p>
          <p className="text-[13px] text-gray-500 mb-4">
            {search || statusFilter || categoryFilter || featuredFilter
              ? 'Try adjusting your filters'
              : 'Create your first blog post'}
          </p>
          {!search && !statusFilter && !categoryFilter && !featuredFilter && (
            <Link
              to="/dashboard/cms/blog/new"
              className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800"
            >
              <Plus className="w-4 h-4" />
              Create Post
            </Link>
          )}
        </div>
      )}

      {/* Posts Grid */}
      {!isLoading && !error && filteredPosts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPosts.map((post) => (
            <div
              key={post.id}
              className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Featured Image */}
              {post.featured_image ? (
                <div className="aspect-video bg-gray-100">
                  <img
                    src={post.featured_image}
                    alt={post.featured_image_alt || post.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-video bg-gray-100 flex items-center justify-center">
                  <FileText className="w-8 h-8 text-gray-300" />
                </div>
              )}

              <div className="p-4">
                {/* Category & Featured */}
                <div className="flex items-center gap-2 mb-2">
                  {post.category && (
                    <span className="text-[11px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      {post.category}
                    </span>
                  )}
                  {post.is_featured && (
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  )}
                  <div className="ml-auto">
                    {getStatusBadge(post.status as ContentStatus)}
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-[14px] font-medium text-gray-900 mb-1 line-clamp-2">
                  {post.title}
                </h3>

                {/* Excerpt */}
                <p className="text-[12px] text-gray-500 line-clamp-2 mb-3">
                  {post.excerpt}
                </p>

                {/* Meta */}
                <div className="flex items-center gap-3 text-[11px] text-gray-400 mb-3">
                  {post.author_name && (
                    <span>{post.author_name}</span>
                  )}
                  {post.published_at && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(post.published_at).toLocaleDateString()}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <BarChart2 className="w-3 h-3" />
                    {post.view_count} views
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                  <Link
                    to={`/dashboard/cms/blog/${post.id}`}
                    className="flex items-center gap-1 px-3 py-1.5 text-[12px] text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </Link>
                  <Link
                    to={`/blog/${post.slug}`}
                    target="_blank"
                    className="flex items-center gap-1 px-3 py-1.5 text-[12px] text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View
                  </Link>
                  <button
                    onClick={() => handleDelete(post.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-[12px] text-red-500 hover:bg-red-50 rounded-md transition-colors ml-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
