/**
 * TermsSection
 *
 * Displays configurable T&Cs from CMS with document selection and agreement checkbox.
 * Filters documents by the target service type being switched to.
 */

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, FileText, ChevronDown } from 'lucide-react'
import { cmsPages } from '@/services/cms'
import BlockRenderer from '@/components/cms/BlockRenderer'

interface TermsSectionProps {
  newType: 'retained' | 'headhunting'
  selectedSlug: string
  onSelectDocument: (slug: string) => void
  termsAgreed: boolean
  onAgreeChange: (agreed: boolean) => void
}

export function TermsSection({
  newType,
  selectedSlug,
  onSelectDocument,
  termsAgreed,
  onAgreeChange,
}: TermsSectionProps) {
  // Fetch list of legal documents filtered by the target service type
  const { data: legalDocuments = [], isLoading: documentsLoading } = useQuery({
    queryKey: ['cms-legal-documents', newType],
    queryFn: () => cmsPages.listPublic({ service_type: newType }),
  })

  // Fetch selected document content
  const { data: selectedDocument, isLoading: documentLoading } = useQuery({
    queryKey: ['cms-legal-document', selectedSlug],
    queryFn: () => cmsPages.getBySlug(selectedSlug),
    enabled: !!selectedSlug,
  })

  // Auto-select first document if none selected
  useEffect(() => {
    if (!selectedSlug && legalDocuments.length > 0) {
      // Try to find terms-of-service first
      const termsDoc = legalDocuments.find((doc) => doc.slug === 'terms-of-service')
      if (termsDoc) {
        onSelectDocument(termsDoc.slug)
      } else {
        const firstDoc = legalDocuments[0]
        if (firstDoc) {
          onSelectDocument(firstDoc.slug)
        }
      }
    }
  }, [legalDocuments, selectedSlug, onSelectDocument])

  // Reset agreement when document changes
  useEffect(() => {
    onAgreeChange(false)
  }, [selectedSlug, onAgreeChange])

  if (documentsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (legalDocuments.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No legal documents available.</p>
        <p className="text-sm text-gray-400 mt-1">
          Please contact an administrator to add terms and conditions.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Terms & Conditions</h3>
        <p className="text-sm text-gray-500">
          Please review and agree to the terms before changing your service type.
        </p>
      </div>

      {/* Document Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Select Document
        </label>
        <div className="relative">
          <select
            value={selectedSlug}
            onChange={(e) => onSelectDocument(e.target.value)}
            className="block w-full px-3 py-2 pr-10 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent appearance-none bg-white"
          >
            {legalDocuments.map((doc) => (
              <option key={doc.id} value={doc.slug}>
                {doc.title}
                {doc.version && ` (v${doc.version})`}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Document Content */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              {selectedDocument?.title || 'Loading...'}
            </span>
            {selectedDocument?.version && (
              <span className="text-xs text-gray-500">
                Version {selectedDocument.version}
                {selectedDocument.effective_date && ` - Effective ${new Date(selectedDocument.effective_date).toLocaleDateString()}`}
              </span>
            )}
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto p-4 bg-white">
          {documentLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : selectedDocument?.content ? (
            <div className="prose prose-sm max-w-none">
              <BlockRenderer content={selectedDocument.content} />
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No content available.</p>
          )}
        </div>
      </div>

      {/* Agreement Checkbox */}
      <label className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg cursor-pointer hover:bg-yellow-100 transition-colors">
        <input
          type="checkbox"
          checked={termsAgreed}
          onChange={(e) => onAgreeChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
        />
        <div>
          <span className="text-sm font-medium text-yellow-800">
            I have read and agree to the terms and conditions
          </span>
          <p className="text-xs text-yellow-700 mt-1">
            By checking this box, you confirm that you have read, understood, and agree to be bound
            by the terms and conditions outlined in the document above.
          </p>
        </div>
      </label>
    </div>
  )
}
