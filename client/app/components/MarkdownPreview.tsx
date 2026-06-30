import { useMemo } from 'react'
import { css } from '../../styled-system/css'

type Props = {
  content: string
}

export default function MarkdownPreview({ content }: Props) {
  const html = useMemo(() => {
    if (!content) return ''

    let result = content
      // Escape HTML
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

      // Headings
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')

      // Bold & Italic
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')

      // Links
      .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; text-decoration: none;">$1</a>')

      // Images
      .replace(/!\[(.*?)\]\((.*?)\)/gim, '<img alt="$1" src="$2" style="max-width: 100%; border-radius: 10px; margin: 1em 0;" />')

      // Code blocks
      .replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>')

      // Inline code
      .replace(/`(.*?)`/gim, '<code>$1</code>')

      // Blockquotes
      .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')

      // Lists
      .replace(/^\s*\n\*/gm, '<ul>\n*')
      .replace(/^(\*.+)\s*\n([^\*])/gm, '$1\n</ul>\n$2')
      .replace(/^\* (.*)/gm, '<li>$1</li>')

      // Numbered lists
      .replace(/^\s*\n\d\./gm, '<ol>\n1.')
      .replace(/^(\d\..+)\s*\n([^\d\.])/gm, '$1\n</ol>\n$2')
      .replace(/^\d\. (.*)/gm, '<li>$1</li>')

      // Paragraphs (wrap lines that don't start with a tag in <p>)
      .replace(/^(?!<[a-z])(.*$)/gim, '<p>$1</p>')

      // Clean up empty paragraphs
      .replace(/<p><\/p>/gim, '')
      .replace(/<p>\s*<\/p>/gim, '')

    return result
  }, [content])

  if (!content) {
    return (
      <div
        className={css({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: 'text.muted',
          fontSize: '0.95rem',
        })}
      >
        <p>プレビューがここに表示されます</p>
      </div>
    )
  }

  return (
    <div
      className={css({
        color: 'text.primary',
        lineHeight: '1.7',
        '& h1': {
          fontSize: '2rem',
          fontWeight: '700',
          marginBottom: 'md',
          paddingBottom: 'sm',
          borderBottom: '2px solid',
          borderColor: 'border.DEFAULT',
        },
        '& h2': {
          fontSize: '1.5rem',
          fontWeight: '700',
          marginBottom: 'sm',
          paddingBottom: 'xs',
          borderBottom: '1px solid',
          borderColor: 'border.DEFAULT',
        },
        '& h3': {
          fontSize: '1.25rem',
          fontWeight: '600',
          marginBottom: 'sm',
        },
        '& p': {
          marginBottom: 'sm',
          color: 'text.secondary',
        },
        '& strong': {
          fontWeight: '700',
          color: 'text.primary',
        },
        '& pre': {
          bg: 'bg.codeBlock',
          padding: 'md',
          borderRadius: 'md',
          overflow: 'auto',
          marginBottom: 'md',
          fontSize: '0.9rem',
          fontFamily: 'mono',
        },
        '& code': {
          fontFamily: 'mono',
          fontSize: '0.9em',
          bg: 'bg.codeBlock',
          padding: '2px 6px',
          borderRadius: 'sm',
        },
        '& pre code': {
          bg: 'transparent',
          padding: '0',
        },
        '& blockquote': {
          borderLeft: '3px solid',
          borderColor: 'accent',
          paddingLeft: 'md',
          margin: 'md 0',
          color: 'text.secondary',
          fontStyle: 'italic',
        },
        '& ul, & ol': {
          paddingLeft: 'lg',
          marginBottom: 'md',
        },
        '& li': {
          marginBottom: 'xs',
          color: 'text.secondary',
        },
      })}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
