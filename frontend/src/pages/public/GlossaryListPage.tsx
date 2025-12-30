// Public Glossary Listing Page - A-Z alphabetical navigation
import { useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { cmsGlossary } from '@/services/cms'
import { SEO } from '@/components/seo'
import Navbar from '@/components/layout/Navbar'
import { Search, Book, ArrowRight, Loader2 } from 'lucide-react'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

export default function GlossaryListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const selectedLetter = searchParams.get('letter')?.toUpperCase() || null

  // Fetch all glossary terms
  const { data: terms = [], isLoading } = useQuery({
    queryKey: ['public-glossary', selectedLetter],
    queryFn: () => cmsGlossary.listPublic({ letter: selectedLetter || undefined }),
  })

  // Fetch available letters (letters that have terms)
  const { data: alphabetData } = useQuery({
    queryKey: ['public-glossary-alphabet'],
    queryFn: () => cmsGlossary.getAlphabet(),
  })

  const availableLetters = alphabetData?.letters || []

  // Filter by search
  const filteredTerms = useMemo(() => {
    if (!search) return terms
    const searchLower = search.toLowerCase()
    return terms.filter(
      (term) =>
        term.title.toLowerCase().includes(searchLower) ||
        term.definition_plain?.toLowerCase().includes(searchLower)
    )
  }, [terms, search])

  // Group terms by letter
  const groupedTerms = useMemo(() => {
    const groups: Record<string, typeof filteredTerms> = {}
    filteredTerms.forEach((term) => {
      const letter = term.title[0]?.toUpperCase() || '#'
      if (!groups[letter]) {
        groups[letter] = []
      }
      groups[letter].push(term)
    })
    // Sort alphabetically
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [filteredTerms])

  // Handle letter selection
  const selectLetter = (letter: string | null) => {
    if (letter) {
      setSearchParams({ letter })
    } else {
      setSearchParams({})
    }
    setSearch('')
  }

  // Clear all filters
  const clearFilters = () => {
    setSearch('')
    setSearchParams({})
  }

  const hasFilters = search || selectedLetter

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <SEO />
      <Navbar />

      {/* Hero Section */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-5xl mx-auto px-6 py-16 md:py-20">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[12px] font-medium rounded-full mb-4">
              <Book className="w-3.5 h-3.5" />
              Knowledge Base
            </span>
            <h1 className="text-[40px] md:text-[48px] font-bold text-gray-900 dark:text-gray-100 leading-tight mb-4">
              Glossary of Terms
            </h1>
            <p className="text-[17px] text-gray-600 dark:text-gray-400 leading-relaxed">
              Your comprehensive guide to recruitment and HR terminology.
              Find definitions for key terms used in talent acquisition and people management.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1">
        <div className="max-w-5xl mx-auto px-6 py-12">
          {/* Search & Alphabet Navigation */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-8 shadow-sm dark:shadow-gray-900/40">
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Search terms..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-[14px] bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900 focus:border-emerald-300 dark:focus:border-emerald-600 transition-all text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>

            {/* Alphabet Navigation */}
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => selectLetter(null)}
                className={`px-3 py-1.5 text-[13px] font-medium rounded transition-colors ${
                  !selectedLetter
                    ? 'bg-emerald-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                All
              </button>
              {ALPHABET.map((letter) => {
                const isAvailable = availableLetters.includes(letter)
                const isSelected = selectedLetter === letter
                return (
                  <button
                    key={letter}
                    onClick={() => isAvailable && selectLetter(letter)}
                    disabled={!isAvailable}
                    className={`w-8 h-8 text-[13px] font-medium rounded transition-colors ${
                      isSelected
                        ? 'bg-emerald-600 text-white'
                        : isAvailable
                        ? 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                    }`}
                  >
                    {letter}
                  </button>
                )
              })}
            </div>

            {hasFilters && (
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={clearFilters}
                  className="text-[13px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400 dark:text-gray-500" />
            </div>
          )}

          {/* Empty State */}
          {!isLoading && filteredTerms.length === 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Book className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-[18px] font-semibold text-gray-900 dark:text-gray-100 mb-2">No terms found</h3>
              <p className="text-[14px] text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                {hasFilters
                  ? "We couldn't find any terms matching your criteria. Try adjusting your search."
                  : 'Check back soon for new content.'}
              </p>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-2 px-4 py-2 text-[14px] font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}

          {/* Terms List - Grouped by Letter */}
          {!isLoading && groupedTerms.length > 0 && (
            <div className="space-y-8">
              {groupedTerms.map(([letter, letterTerms]) => (
                <div key={letter} id={`letter-${letter}`}>
                  {/* Letter Header */}
                  <div className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900 py-2">
                    <div className="flex items-center gap-3">
                      <span className="w-10 h-10 flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 text-[18px] font-bold rounded-lg">
                        {letter}
                      </span>
                      <span className="text-[13px] text-gray-400 dark:text-gray-500">
                        {letterTerms.length} term{letterTerms.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Terms Grid */}
                  <div className="mt-4 grid gap-3">
                    {letterTerms.map((term) => (
                      <Link
                        key={term.id}
                        to={`/glossary/${term.slug}`}
                        className="group bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-emerald-200 dark:hover:border-emerald-700 hover:shadow-sm dark:hover:shadow-gray-900/40 transition-all"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-[16px] font-semibold text-gray-900 dark:text-gray-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                              {term.title}
                            </h3>
                            {term.definition_plain && (
                              <p className="text-[14px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                {term.definition_plain}
                              </p>
                            )}
                          </div>
                          <ArrowRight className="w-5 h-5 text-gray-300 dark:text-gray-600 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 group-hover:translate-x-1 transition-all flex-shrink-0 mt-0.5" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Jump Navigation (for long lists) */}
          {!isLoading && groupedTerms.length > 3 && (
            <div className="fixed bottom-6 right-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg dark:shadow-gray-900/40 p-2 hidden lg:block">
              <div className="flex flex-col gap-1">
                {groupedTerms.map(([letter]) => (
                  <a
                    key={letter}
                    href={`#letter-${letter}`}
                    className="w-7 h-7 flex items-center justify-center text-[12px] font-medium text-gray-500 dark:text-gray-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-600 dark:hover:text-emerald-400 rounded transition-colors"
                  >
                    {letter}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
