// Block Renderer - Renders Editor.js content as HTML
import type { EditorJSData, EditorJSBlock } from '@/types'

interface BlockRendererProps {
  content: EditorJSData
  className?: string
}

export default function BlockRenderer({ content, className = '' }: BlockRendererProps) {
  if (!content?.blocks || content.blocks.length === 0) {
    return null
  }

  return (
    <div className={`prose prose-gray max-w-none ${className}`}>
      {content.blocks.map((block, index) => (
        <Block key={block.id || index} block={block} />
      ))}
    </div>
  )
}

interface BlockProps {
  block: EditorJSBlock
}

function Block({ block }: BlockProps) {
  switch (block.type) {
    case 'header':
      return <HeaderBlock data={block.data} />
    case 'paragraph':
      return <ParagraphBlock data={block.data} />
    case 'list':
      return <ListBlock data={block.data} />
    case 'quote':
      return <QuoteBlock data={block.data} />
    case 'code':
      return <CodeBlock data={block.data} />
    case 'delimiter':
      return <DelimiterBlock />
    case 'table':
      return <TableBlock data={block.data} />
    case 'checklist':
      return <ChecklistBlock data={block.data} />
    case 'image':
      return <ImageBlock data={block.data} />
    default:
      // Fallback for unknown block types
      return <div className="text-gray-500 text-sm">[Unknown block type: {block.type}]</div>
  }
}

function HeaderBlock({ data }: { data: Record<string, unknown> }) {
  const text = data.text as string
  const level = (data.level as number) || 2
  const id = data.id as string | undefined

  const Tag = `h${level}` as keyof JSX.IntrinsicElements
  const classes: Record<number, string> = {
    1: 'text-3xl font-bold mt-8 mb-4 scroll-mt-24',
    2: 'text-2xl font-semibold mt-8 mb-4 scroll-mt-24',
    3: 'text-lg font-semibold mt-6 mb-3 scroll-mt-24',
    4: 'text-base font-medium mt-4 mb-2 scroll-mt-24',
  }

  return (
    <Tag
      id={id}
      className={classes[level] || classes[2]}
      dangerouslySetInnerHTML={{ __html: text }}
    />
  )
}

function ParagraphBlock({ data }: { data: Record<string, unknown> }) {
  const text = data.text as string
  return (
    <p
      className="text-[15px] text-gray-600 leading-[1.8] mb-5"
      dangerouslySetInnerHTML={{ __html: text }}
    />
  )
}

// Helper to extract text from list item (handles both string and object formats)
function getListItemText(item: unknown): string {
  if (typeof item === 'string') return item
  if (item && typeof item === 'object') {
    // Editor.js nested list format: { content: string, items: [] }
    const obj = item as Record<string, unknown>
    if ('content' in obj) return obj.content as string
    if ('text' in obj) return obj.text as string
  }
  return ''
}

// Helper to get checked status from list item
function getListItemChecked(item: unknown): boolean {
  if (item && typeof item === 'object') {
    const obj = item as Record<string, unknown>
    if ('checked' in obj) return obj.checked as boolean
    // Also check 'meta' for newer Editor.js list format
    if ('meta' in obj && typeof obj.meta === 'object') {
      const meta = obj.meta as Record<string, unknown>
      if ('checked' in meta) return meta.checked as boolean
    }
  }
  return false
}

function ListBlock({ data }: { data: Record<string, unknown> }) {
  const style = data.style as string
  const items = data.items as unknown[]

  if (!items || !Array.isArray(items)) return null

  if (style === 'ordered') {
    return (
      <ol className="list-decimal pl-6 mb-6 space-y-2">
        {items.map((item, index) => (
          <li
            key={index}
            className="text-gray-700 leading-relaxed pl-2"
            dangerouslySetInnerHTML={{ __html: getListItemText(item) }}
          />
        ))}
      </ol>
    )
  }

  if (style === 'checklist') {
    return (
      <ul className="mb-4 space-y-2">
        {items.map((item, index) => {
          const checked = getListItemChecked(item)
          return (
            <li key={index} className="flex items-start gap-2">
              <span className={`mt-0.5 ${checked ? 'text-green-500' : 'text-gray-400'}`}>
                {checked ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" strokeWidth="2" />
                  </svg>
                )}
              </span>
              <span
                className={`text-gray-700 ${checked ? 'line-through text-gray-500' : ''}`}
                dangerouslySetInnerHTML={{ __html: getListItemText(item) }}
              />
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <ul className="list-disc pl-6 mb-6 space-y-2">
      {items.map((item, index) => (
        <li
          key={index}
          className="text-gray-700 leading-relaxed pl-2"
          dangerouslySetInnerHTML={{ __html: getListItemText(item) }}
        />
      ))}
    </ul>
  )
}

function QuoteBlock({ data }: { data: Record<string, unknown> }) {
  const text = data.text as string
  const caption = data.caption as string

  return (
    <blockquote className="border-l-4 border-gray-300 pl-4 my-4 italic">
      <p
        className="text-gray-700"
        dangerouslySetInnerHTML={{ __html: text }}
      />
      {caption && (
        <cite className="block mt-2 text-sm text-gray-500 not-italic">
          — {caption}
        </cite>
      )}
    </blockquote>
  )
}

function CodeBlock({ data }: { data: Record<string, unknown> }) {
  const code = data.code as string

  return (
    <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto mb-4">
      <code className="text-sm font-mono">{code}</code>
    </pre>
  )
}

function DelimiterBlock() {
  return (
    <div className="my-8 text-center text-gray-400 tracking-widest">
      * * *
    </div>
  )
}

function TableBlock({ data }: { data: Record<string, unknown> }) {
  const content = data.content as string[][]
  const withHeadings = data.withHeadings as boolean

  if (!content || content.length === 0) return null

  return (
    <div className="overflow-x-auto mb-4">
      <table className="min-w-full border border-gray-200">
        {withHeadings && content.length > 0 && (
          <thead className="bg-gray-50">
            <tr>
              {content[0].map((cell, index) => (
                <th
                  key={index}
                  className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b border-gray-200"
                  dangerouslySetInnerHTML={{ __html: cell }}
                />
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {content.slice(withHeadings ? 1 : 0).map((row, rowIndex) => (
            <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="px-4 py-2 text-sm text-gray-700 border-b border-gray-200"
                  dangerouslySetInnerHTML={{ __html: cell }}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ChecklistBlock({ data }: { data: Record<string, unknown> }) {
  const items = data.items as { text: string; checked: boolean }[]

  return (
    <ul className="mb-4 space-y-2">
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-2">
          <span className={`mt-0.5 ${item.checked ? 'text-green-500' : 'text-gray-400'}`}>
            {item.checked ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" strokeWidth="2" />
              </svg>
            )}
          </span>
          <span
            className={`text-gray-700 ${item.checked ? 'line-through text-gray-500' : ''}`}
            dangerouslySetInnerHTML={{ __html: item.text }}
          />
        </li>
      ))}
    </ul>
  )
}

function ImageBlock({ data }: { data: Record<string, unknown> }) {
  const url = (data.file as { url: string })?.url || (data.url as string)
  const caption = data.caption as string
  const withBorder = data.withBorder as boolean
  const withBackground = data.withBackground as boolean
  const stretched = data.stretched as boolean

  if (!url) return null

  return (
    <figure className={`my-4 ${stretched ? 'w-full' : ''}`}>
      <img
        src={url}
        alt={caption || ''}
        className={`
          ${withBorder ? 'border border-gray-200' : ''}
          ${withBackground ? 'bg-gray-100 p-4' : ''}
          ${stretched ? 'w-full' : 'max-w-full'}
          rounded-lg
        `}
      />
      {caption && (
        <figcaption className="text-center text-sm text-gray-500 mt-2">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}
