// Reusable FAQ Widget - Embeddable accordion for blog posts and glossary terms
import { useState } from 'react'
import BlockRenderer from './BlockRenderer'
import { createFAQSchema } from '@/components/seo'
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react'
import type { CMSEmbeddedFAQ } from '@/types'

interface FAQWidgetProps {
  faqs: CMSEmbeddedFAQ[]
  title?: string
  className?: string
  // If true, injects JSON-LD schema for SEO
  includeSchema?: boolean
}

export function FAQWidget({
  faqs,
  title = 'Frequently Asked Questions',
  className = '',
  includeSchema = true,
}: FAQWidgetProps) {
  const [expandedFAQs, setExpandedFAQs] = useState<Set<string>>(new Set())

  if (!faqs || faqs.length === 0) return null

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

  const expandAll = () => {
    setExpandedFAQs(new Set(faqs.map((faq) => faq.id)))
  }

  const collapseAll = () => {
    setExpandedFAQs(new Set())
  }

  const allExpanded = faqs.every((faq) => expandedFAQs.has(faq.id))

  // Generate schema data for SEO
  const schemaData = includeSchema
    ? createFAQSchema(
        faqs.map((faq) => ({
          question: faq.question,
          answer: faq.answer_plain || extractPlainText(faq.content),
        }))
      )
    : null

  return (
    <div className={`faq-widget ${className}`}>
      {/* Inject JSON-LD Schema */}
      {schemaData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-purple-500" />
          <h3 className="text-[18px] font-semibold text-gray-900">{title}</h3>
        </div>
        <button
          onClick={allExpanded ? collapseAll : expandAll}
          className="text-[13px] text-purple-600 hover:text-purple-700 font-medium transition-colors"
        >
          {allExpanded ? 'Collapse all' : 'Expand all'}
        </button>
      </div>

      {/* FAQ Accordion */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
        {faqs.map((faq) => (
          <div key={faq.id} className="group">
            <button
              onClick={() => toggleFAQ(faq.id)}
              className="w-full flex items-start justify-between gap-4 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
              aria-expanded={expandedFAQs.has(faq.id)}
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
              <div className="px-5 pb-4 text-[14px] text-gray-600 leading-relaxed">
                {faq.content && faq.content.blocks && faq.content.blocks.length > 0 ? (
                  <BlockRenderer content={faq.content} />
                ) : faq.answer_plain ? (
                  <p>{faq.answer_plain}</p>
                ) : (
                  <p className="text-gray-400 italic">No answer provided.</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
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

export default FAQWidget
