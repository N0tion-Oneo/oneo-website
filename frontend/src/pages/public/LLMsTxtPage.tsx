import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { cmsPublicSeo } from '@/services/cms'

export default function LLMsTxtPage() {
  const { data: content, isLoading, error } = useQuery({
    queryKey: ['public-llms-txt'],
    queryFn: cmsPublicSeo.getLLMsTxt,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  useEffect(() => {
    if (content) {
      // Replace document with plain text content
      document.documentElement.innerHTML = ''
      const pre = document.createElement('pre')
      pre.style.fontFamily = 'monospace'
      pre.style.whiteSpace = 'pre-wrap'
      pre.style.wordWrap = 'break-word'
      pre.style.margin = '0'
      pre.style.padding = '0'
      pre.textContent = content
      document.body.appendChild(pre)
    }
  }, [content])

  if (isLoading) {
    return (
      <pre style={{ fontFamily: 'monospace', margin: 0, padding: 0 }}>
        Loading...
      </pre>
    )
  }

  if (error) {
    return (
      <pre style={{ fontFamily: 'monospace', margin: 0, padding: 0 }}>
        Error loading llms.txt
      </pre>
    )
  }

  return null
}
