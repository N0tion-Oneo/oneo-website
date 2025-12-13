// Public FAQ Page with SEO-optimized JSON-LD schema
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { cmsFAQs } from '@/services/cms'
import { SEO, createFAQSchema } from '@/components/seo'
import Navbar from '@/components/layout/Navbar'
import { BlockRenderer } from '@/components/cms'
import { Search, HelpCircle, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import type { CMSFAQCategoryWithFAQs } from '@/types'

export default function FAQPage() {
  const [search, setSearch] = useState('')
  const [expandedFAQs, setExpandedFAQs] = useState<Set<string>>(new Set())
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Fetch FAQs grouped by category
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['public-faqs'],
    queryFn: () => cmsFAQs.getPublicFAQs(),
  })

  // Filter FAQs by search
  const filteredCategories = useMemo(() => {
    if (!search) return categories

    const searchLower = search.toLowerCase()
    return categories
      .map((category) => ({
        ...category,
        faqs: category.faqs.filter(
          (faq) =>
            faq.question.toLowerCase().includes(searchLower) ||
            (faq.content && JSON.stringify(faq.content).toLowerCase().includes(searchLower))
        ),
      }))
      .filter((category) => category.faqs.length > 0)
  }, [categories, search])

  // Filter by selected category
  const displayCategories = useMemo(() => {
    if (!selectedCategory) return filteredCategories
    return filteredCategories.filter((cat) => cat.id === selectedCategory || cat.slug === selectedCategory)
  }, [filteredCategories, selectedCategory])

  // Get all FAQs for JSON-LD schema
  const allFAQs = useMemo(() => {
    const faqs: { question: string; answer: string }[] = []
    categories.forEach((category) => {
      category.faqs.forEach((faq) => {
        faqs.push({
          question: faq.question,
          answer: extractPlainText(faq.content),
        })
      })
    })
    return faqs
  }, [categories])

  // Toggle FAQ expansion
  const toggleFAQ = (faqId: string) => {
    setExpandedFAQs((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(faqId)) {
        newSet.delete(faqId)
      } else {
        newSet.add(faqId)
      }
      return newSet
    })
  }

  // Expand all FAQs in a category
  const expandCategory = (categoryFAQs: { id: string }[]) => {
    setExpandedFAQs((prev) => {
      const newSet = new Set(prev)
      categoryFAQs.forEach((faq) => newSet.add(faq.id))
      return newSet
    })
  }

  // Collapse all FAQs in a category
  const collapseCategory = (categoryFAQs: { id: string }[]) => {
    setExpandedFAQs((prev) => {
      const newSet = new Set(prev)
      categoryFAQs.forEach((faq) => newSet.delete(faq.id))
      return newSet
    })
  }

  // Check if all FAQs in a category are expanded
  const isCategoryExpanded = (categoryFAQs: { id: string }[]) => {
    return categoryFAQs.every((faq) => expandedFAQs.has(faq.id))
  }

  // Clear filters
  const clearFilters = () => {
    setSearch('')
    setSelectedCategory(null)
  }

  const hasFilters = search || selectedCategory

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <SEO
        structuredData={allFAQs.length > 0 ? createFAQSchema(allFAQs) : undefined}
      />
      <Navbar />

      {/* Hero Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-16 md:py-20">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-purple-50 text-purple-600 text-[12px] font-medium rounded-full mb-4">
              <HelpCircle className="w-3.5 h-3.5" />
              Help Center
            </span>
            <h1 className="text-[40px] md:text-[48px] font-bold text-gray-900 leading-tight mb-4">
              Frequently Asked Questions
            </h1>
            <p className="text-[17px] text-gray-600 leading-relaxed max-w-2xl mx-auto">
              Find answers to common questions about our recruitment services, hiring process,
              and how we can help you achieve your goals.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1">
        <div className="max-w-4xl mx-auto px-6 py-12">
          {/* Search & Category Filter */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-8 shadow-sm">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search questions..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-[14px] bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-300 transition-all"
                />
              </div>

              {/* Category Filter */}
              <div className="flex gap-2 flex-wrap">
                <select
                  value={selectedCategory || ''}
                  onChange={(e) => setSelectedCategory(e.target.value || null)}
                  className="px-4 py-2.5 text-[14px] bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-300 transition-all cursor-pointer"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id || cat.slug} value={cat.id || cat.slug}>
                      {cat.name} ({cat.faqs.length})
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
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-4" />
              <p className="text-[14px] text-gray-500">Loading FAQs...</p>
            </div>
          )}

          {/* No Results */}
          {!isLoading && displayCategories.length === 0 && (
            <div className="text-center py-16">
              <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-[16px] text-gray-700 mb-2">No FAQs found</p>
              <p className="text-[14px] text-gray-500">
                {search ? 'Try adjusting your search terms' : 'Check back later for updates'}
              </p>
            </div>
          )}

          {/* FAQ Categories */}
          {!isLoading && displayCategories.map((category) => (
            <div key={category.id || category.slug || 'uncategorized'} className="mb-8">
              {/* Category Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-[20px] font-semibold text-gray-900">{category.name}</h2>
                  {category.description && (
                    <p className="text-[14px] text-gray-500 mt-1">{category.description}</p>
                  )}
                </div>
                <button
                  onClick={() =>
                    isCategoryExpanded(category.faqs)
                      ? collapseCategory(category.faqs)
                      : expandCategory(category.faqs)
                  }
                  className="text-[13px] text-purple-600 hover:text-purple-700 font-medium"
                >
                  {isCategoryExpanded(category.faqs) ? 'Collapse all' : 'Expand all'}
                </button>
              </div>

              {/* FAQ Accordion */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
                {category.faqs.map((faq) => (
                  <div key={faq.id} className="group">
                    <button
                      onClick={() => toggleFAQ(faq.id)}
                      className="w-full flex items-start justify-between gap-4 px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-[15px] font-medium text-gray-900 leading-relaxed">
                        {faq.question}
                      </span>
                      <span className="flex-shrink-0 mt-0.5">
                        {expandedFAQs.has(faq.id) ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </span>
                    </button>
                    {expandedFAQs.has(faq.id) && (
                      <div className="px-6 pb-5 text-[14px] text-gray-600 leading-relaxed">
                        {faq.content && faq.content.blocks && faq.content.blocks.length > 0 ? (
                          <BlockRenderer content={faq.content} />
                        ) : (
                          <p>No answer provided.</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Contact CTA */}
          {!isLoading && categories.length > 0 && (
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border border-purple-100 p-8 text-center mt-12">
              <h3 className="text-[20px] font-semibold text-gray-900 mb-2">
                Still have questions?
              </h3>
              <p className="text-[14px] text-gray-600 mb-6">
                Can't find what you're looking for? Our team is here to help.
              </p>
              <a
                href="/contact"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white text-[14px] font-medium rounded-lg hover:bg-gray-800 transition-colors"
              >
                Contact Us
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Footer would go here */}
    </div>
  )
}

// Helper to extract plain text from Editor.js content
function extractPlainText(content: unknown): string {
  if (!content || typeof content !== 'object') return ''
  const data = content as { blocks?: Array<{ data?: { text?: string } }> }
  if (!data.blocks) return ''
  return data.blocks
    .map((block) => block.data?.text || '')
    .filter(Boolean)
    .join(' ')
    .replace(/<[^>]*>/g, '') // Strip HTML tags
}
