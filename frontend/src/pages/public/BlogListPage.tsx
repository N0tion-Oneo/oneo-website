// Public Blog List Page
import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { cmsBlog } from '@/services/cms'
import { SEO } from '@/components/seo'
import Navbar from '@/components/layout/Navbar'
import { Search, Calendar, User, ArrowRight, FileText, Tag, Clock, Loader2 } from 'lucide-react'

export default function BlogListPage() {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedTag, setSelectedTag] = useState('')

  // Fetch published blog posts
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['public-blog', selectedCategory, selectedTag],
    queryFn: () => cmsBlog.listPublic({
      category: selectedCategory || undefined,
      tag: selectedTag || undefined,
    }),
  })

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['public-blog-categories'],
    queryFn: () => cmsBlog.getCategories(),
  })

  // Filter by search
  const filteredPosts = useMemo(() => {
    if (!search) return posts
    const searchLower = search.toLowerCase()
    return posts.filter(
      (post) =>
        post.title.toLowerCase().includes(searchLower) ||
        post.excerpt.toLowerCase().includes(searchLower)
    )
  }, [posts, search])

  // Get featured post (first featured or first post)
  const featuredPost = useMemo(() => {
    return posts.find((post) => post.is_featured) || posts[0]
  }, [posts])

  // Get remaining posts (excluding featured)
  const remainingPosts = useMemo(() => {
    if (!featuredPost) return filteredPosts
    return filteredPosts.filter((post) => post.id !== featuredPost.id)
  }, [filteredPosts, featuredPost])

  // Get all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    posts.forEach((post) => {
      post.tags.forEach((tag) => tagSet.add(tag))
    })
    return Array.from(tagSet).sort()
  }, [posts])

  // Calculate read time
  const getReadTime = (content: unknown) => {
    return Math.max(1, Math.ceil(JSON.stringify(content).length / 1500))
  }

  // Clear all filters
  const clearFilters = () => {
    setSearch('')
    setSelectedCategory('')
    setSelectedTag('')
  }

  const hasFilters = search || selectedCategory || selectedTag

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <SEO />
      <Navbar />

      {/* Hero Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-16 md:py-20">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 text-[12px] font-medium rounded-full mb-4">
              <FileText className="w-3.5 h-3.5" />
              Our Blog
            </span>
            <h1 className="text-[40px] md:text-[48px] font-bold text-gray-900 leading-tight mb-4">
              Insights & Resources
            </h1>
            <p className="text-[17px] text-gray-600 leading-relaxed">
              Expert insights on recruitment, hiring best practices, and building exceptional teams.
              Stay ahead with the latest trends in talent acquisition.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1">
        <div className="max-w-5xl mx-auto px-6 py-12">
          {/* Search & Filters Bar */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-8 shadow-sm">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search articles..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-[14px] bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all"
                />
              </div>

              {/* Category Filter */}
              <div className="flex gap-2 flex-wrap">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-2.5 text-[14px] bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all cursor-pointer"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.name} value={cat.name}>
                      {cat.name} ({cat.count})
                    </option>
                  ))}
                </select>

                {hasFilters && (
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2.5 text-[14px] text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>

            {/* Tags */}
            {allTags.length > 0 && (
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 flex-wrap">
                <span className="text-[12px] text-gray-500 font-medium">Popular tags:</span>
                {allTags.slice(0, 8).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(selectedTag === tag ? '' : tag)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-[12px] rounded-full transition-all ${
                      selectedTag === tag
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          )}

          {/* Empty State */}
          {!isLoading && filteredPosts.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-[18px] font-semibold text-gray-900 mb-2">No articles found</h3>
              <p className="text-[14px] text-gray-500 mb-6 max-w-md mx-auto">
                {hasFilters
                  ? "We couldn't find any articles matching your criteria. Try adjusting your filters."
                  : 'Check back soon for new content.'}
              </p>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-2 px-4 py-2 text-[14px] font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}

          {/* Featured Post */}
          {!isLoading && !hasFilters && featuredPost && (
            <div className="mb-12">
              <Link
                to={`/blog/${featuredPost.slug}`}
                className="group block bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="grid md:grid-cols-2 gap-0">
                  <div className="aspect-video md:aspect-auto md:h-full bg-gray-100 overflow-hidden">
                    {featuredPost.featured_image ? (
                      <img
                        src={featuredPost.featured_image}
                        alt={featuredPost.featured_image_alt || featuredPost.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full min-h-[300px] flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                        <FileText className="w-16 h-16 text-gray-300" />
                      </div>
                    )}
                  </div>
                  <div className="p-8 md:p-10 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-4">
                      {featuredPost.is_featured && (
                        <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-[11px] font-semibold uppercase tracking-wider rounded">
                          Featured
                        </span>
                      )}
                      {featuredPost.category && (
                        <span className="text-[12px] font-medium text-blue-600 uppercase tracking-wider">
                          {featuredPost.category}
                        </span>
                      )}
                    </div>
                    <h2 className="text-[28px] font-bold text-gray-900 group-hover:text-gray-700 leading-tight mb-4 transition-colors">
                      {featuredPost.title}
                    </h2>
                    <p className="text-[15px] text-gray-600 leading-relaxed mb-6 line-clamp-3">
                      {featuredPost.excerpt}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-[13px] text-gray-500">
                        {featuredPost.author_name && (
                          <span className="flex items-center gap-1.5">
                            <User className="w-4 h-4" />
                            {featuredPost.author_name}
                          </span>
                        )}
                        {featuredPost.published_at && (
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            {new Date(featuredPost.published_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        )}
                      </div>
                      <span className="inline-flex items-center gap-1 text-[14px] font-medium text-gray-900 group-hover:gap-2 transition-all">
                        Read article
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* Articles Grid */}
          {!isLoading && (hasFilters ? filteredPosts : remainingPosts).length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-[20px] font-semibold text-gray-900">
                  {hasFilters ? `${filteredPosts.length} article${filteredPosts.length !== 1 ? 's' : ''} found` : 'Latest Articles'}
                </h2>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(hasFilters ? filteredPosts : remainingPosts).map((post) => (
                  <Link
                    key={post.id}
                    to={`/blog/${post.slug}`}
                    className="group bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md hover:border-gray-300 transition-all"
                  >
                    <div className="aspect-[16/10] bg-gray-100 overflow-hidden">
                      {post.featured_image ? (
                        <img
                          src={post.featured_image}
                          alt={post.featured_image_alt || post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                          <FileText className="w-10 h-10 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-3">
                        {post.category && (
                          <span className="text-[11px] font-medium text-blue-600 uppercase tracking-wider">
                            {post.category}
                          </span>
                        )}
                        <span className="text-gray-300">•</span>
                        <span className="flex items-center gap-1 text-[11px] text-gray-500">
                          <Clock className="w-3 h-3" />
                          {getReadTime(post.content)} min read
                        </span>
                      </div>
                      <h3 className="text-[16px] font-semibold text-gray-900 group-hover:text-gray-700 leading-snug mb-2 line-clamp-2 transition-colors">
                        {post.title}
                      </h3>
                      <p className="text-[14px] text-gray-500 line-clamp-2 mb-4">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center gap-3 text-[12px] text-gray-400">
                        {post.author_name && (
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            {post.author_name}
                          </span>
                        )}
                        {post.published_at && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(post.published_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
