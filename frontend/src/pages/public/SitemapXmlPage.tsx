import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { cmsPublicSeo } from '@/services/cms'

export default function SitemapXmlPage() {
  const { data: xml, isLoading, error } = useQuery({
    queryKey: ['public-sitemap-xml'],
    queryFn: cmsPublicSeo.getSitemapXml,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  useEffect(() => {
    if (xml) {
      // Set the content type and replace the document with raw XML
      document.documentElement.innerHTML = ''
      document.write(xml)
      document.close()
    }
  }, [xml])

  if (isLoading) {
    return (
      <pre style={{ fontFamily: 'monospace', padding: '20px' }}>
        Loading sitemap...
      </pre>
    )
  }

  if (error) {
    return (
      <pre style={{ fontFamily: 'monospace', padding: '20px', color: 'red' }}>
        Error loading sitemap
      </pre>
    )
  }

  return null
}
