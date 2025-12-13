// Block Editor Component - Wrapper for Editor.js
import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import EditorJS, { OutputData, API } from '@editorjs/editorjs'
import Header from '@editorjs/header'
import List from '@editorjs/list'
import Paragraph from '@editorjs/paragraph'
import Quote from '@editorjs/quote'
import Code from '@editorjs/code'
import Delimiter from '@editorjs/delimiter'
import Table from '@editorjs/table'
import type { EditorJSData } from '@/types'

export interface BlockEditorHandle {
  save: () => Promise<EditorJSData | null>
  clear: () => Promise<void>
}

interface BlockEditorProps {
  initialData?: EditorJSData
  onChange?: (data: EditorJSData) => void
  placeholder?: string
  readOnly?: boolean
  minHeight?: number
  editorId?: string
}

const BlockEditor = forwardRef<BlockEditorHandle, BlockEditorProps>(({
  initialData,
  onChange,
  placeholder = 'Start writing your content...',
  readOnly = false,
  minHeight = 300,
  editorId = 'editor',
}, ref) => {
  const editorRef = useRef<EditorJS | null>(null)
  const holderRef = useRef<HTMLDivElement>(null)
  const onChangeRef = useRef(onChange)
  const isReady = useRef(false)

  // Keep onChange ref updated
  onChangeRef.current = onChange

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    save: async () => {
      if (!editorRef.current || !isReady.current) return null
      try {
        const data = await editorRef.current.save()
        return data as EditorJSData
      } catch (error) {
        console.error('Failed to save editor data:', error)
        return null
      }
    },
    clear: async () => {
      if (!editorRef.current || !isReady.current) return
      await editorRef.current.clear()
    },
  }))

  useEffect(() => {
    if (!holderRef.current || editorRef.current) return

    const editor = new EditorJS({
      holder: holderRef.current,
      data: initialData as OutputData | undefined,
      readOnly,
      placeholder,
      minHeight,
      tools: {
        header: {
          class: Header as unknown as EditorJS.ToolConstructable,
          config: {
            placeholder: 'Enter a header',
            levels: [1, 2, 3, 4],
            defaultLevel: 2,
          },
        },
        list: {
          class: List as unknown as EditorJS.ToolConstructable,
          inlineToolbar: true,
          config: {
            defaultStyle: 'unordered',
          },
        },
        paragraph: {
          class: Paragraph as unknown as EditorJS.ToolConstructable,
          inlineToolbar: true,
        },
        quote: {
          class: Quote as unknown as EditorJS.ToolConstructable,
          inlineToolbar: true,
          config: {
            quotePlaceholder: 'Enter a quote',
            captionPlaceholder: 'Quote author',
          },
        },
        code: {
          class: Code as unknown as EditorJS.ToolConstructable,
        },
        delimiter: Delimiter as unknown as EditorJS.ToolConstructable,
        table: {
          class: Table as unknown as EditorJS.ToolConstructable,
          inlineToolbar: true,
          config: {
            rows: 2,
            cols: 3,
          },
        },
      },
      onReady: () => {
        isReady.current = true
      },
      onChange: async (api: API) => {
        if (onChangeRef.current && isReady.current) {
          try {
            const outputData = await api.saver.save()
            onChangeRef.current(outputData as EditorJSData)
          } catch (error) {
            console.error('Failed to save on change:', error)
          }
        }
      },
    })

    editorRef.current = editor

    return () => {
      if (editorRef.current && editorRef.current.destroy) {
        isReady.current = false
        editorRef.current.destroy()
        editorRef.current = null
      }
    }
  // Only run once on mount - initialData is intentionally not in deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorId, readOnly, placeholder, minHeight])

  return (
    <div className="block-editor">
      <div
        ref={holderRef}
        id={editorId}
        className="prose prose-sm max-w-none border border-gray-200 rounded-lg p-4 min-h-[300px] bg-white focus-within:border-gray-400 focus-within:ring-1 focus-within:ring-gray-200"
        style={{ minHeight: `${minHeight}px` }}
      />
      <style>{`
        .block-editor .ce-block__content {
          max-width: none;
        }
        .block-editor .ce-toolbar__content {
          max-width: none;
        }
        .block-editor .codex-editor__redactor {
          padding-bottom: 100px !important;
        }
        .block-editor .ce-paragraph {
          line-height: 1.6;
        }
        .block-editor h1.ce-header {
          font-size: 1.875rem;
          font-weight: 700;
          line-height: 1.2;
          margin: 1rem 0;
        }
        .block-editor h2.ce-header {
          font-size: 1.5rem;
          font-weight: 600;
          line-height: 1.3;
          margin: 0.875rem 0;
        }
        .block-editor h3.ce-header {
          font-size: 1.25rem;
          font-weight: 600;
          line-height: 1.4;
          margin: 0.75rem 0;
        }
        .block-editor h4.ce-header {
          font-size: 1.125rem;
          font-weight: 500;
          line-height: 1.4;
          margin: 0.625rem 0;
        }
        .block-editor .cdx-quote {
          border-left: 3px solid #e5e7eb;
          padding-left: 1rem;
          font-style: italic;
        }
        .block-editor .cdx-quote__caption {
          font-size: 0.875rem;
          color: #6b7280;
          margin-top: 0.5rem;
        }
        .block-editor .ce-code__textarea {
          font-family: ui-monospace, SFMono-Regular, 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace;
          font-size: 0.875rem;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 0.375rem;
          padding: 1rem;
        }
        .block-editor .cdx-list {
          padding-left: 1.5rem;
        }
        .block-editor .cdx-list__item {
          padding: 0.25rem 0;
        }
        .block-editor .ce-delimiter {
          line-height: 1.5;
        }
        .block-editor .ce-delimiter::before {
          content: '***';
          display: block;
          text-align: center;
          color: #9ca3af;
          letter-spacing: 0.5em;
        }
        .block-editor .tc-table {
          border-collapse: collapse;
          width: 100%;
        }
        .block-editor .tc-table td {
          border: 1px solid #e5e7eb;
          padding: 0.5rem;
        }
        .block-editor .cdx-checklist__item {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
        }
        .block-editor .cdx-checklist__item-checkbox {
          margin-top: 0.25rem;
        }
      `}</style>
    </div>
  )
})

BlockEditor.displayName = 'BlockEditor'

export default BlockEditor
export { BlockEditor }
