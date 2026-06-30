import { useState, useRef } from 'react'
import { css } from '../../styled-system/css'
import EditorToolbar from '../components/EditorToolbar'
import MarkdownPreview from '../components/MarkdownPreview'
import { client } from '../lib/hono'

type FormData = {
  title: string
  eventName: string
  eventDate: string
  content: string
}

export default function BlogNewPage() {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    eventName: '',
    eventDate: '',
    content: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleToolbarInsert = (before: string, after: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = formData.content.substring(start, end)
    const newContent =
      formData.content.substring(0, start) +
      before +
      selectedText +
      after +
      formData.content.substring(end)

    setFormData((prev) => ({ ...prev, content: newContent }))

    // Restore cursor position after React re-render
    requestAnimationFrame(() => {
      textarea.focus()
      const cursorPos = start + before.length + selectedText.length
      textarea.setSelectionRange(cursorPos, cursorPos)
    })
  }

  const handleSubmit = async (publish: boolean) => {
    setError('')
    setSuccess('')
    setIsSubmitting(true)

    try {
      // Create draft
      const createRes = await client.api.blog.create.$post({
        json: {
          title: formData.title,
          content: formData.content,
          eventName: formData.eventName,
          eventDate: formData.eventDate,
        },
      })

      const createData = await createRes.json()

      if (!createRes.ok) {
        setError((createData as { error: string }).error || '保存に失敗しました')
        return
      }

      const { id } = createData as { id: string }

      if (publish) {
        const publishRes = await client.api.blog.publish[':id'].$post({
          param: { id },
        })

        const publishData = await publishRes.json()

        if (!publishRes.ok) {
          setError(
            (publishData as { error: string }).error || 'PRの作成に失敗しました'
          )
          return
        }

        const { prUrl } = publishData as { prUrl: string }
        setSuccess(`GitHub PRを作成しました: ${prUrl}`)
      } else {
        setSuccess('下書きを保存しました')
      }
    } catch {
      setError('エラーが発生しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {/* Top Bar */}
      <div
        className={css({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          h: '56px',
          px: 'lg',
          borderBottom: '1px solid',
          borderColor: 'border.DEFAULT',
          flexShrink: 0,
        })}
      >
        <h1
          className={css({
            fontSize: '1.125rem',
            fontWeight: '600',
            color: 'text.primary',
          })}
        >
          ブログ作成
        </h1>
        <div className={css({ display: 'flex', gap: 'sm' })}>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSubmit(false)}
            className={css({
              px: 'md',
              py: 'xs',
              fontSize: '0.875rem',
              fontWeight: '500',
              borderRadius: 'md',
              cursor: 'pointer',
              transition: 'all 0.2s',
              bg: 'bg.tertiary',
              color: 'text.primary',
              border: '1px solid',
              borderColor: 'border.DEFAULT',
              _hover: { borderColor: 'border.hover' },
              _disabled: { opacity: 0.5, cursor: 'not-allowed' },
            })}
          >
            下書き保存
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSubmit(true)}
            className={css({
              px: 'md',
              py: 'xs',
              fontSize: '0.875rem',
              fontWeight: '500',
              borderRadius: 'md',
              cursor: 'pointer',
              transition: 'all 0.2s',
              bg: 'accent',
              color: 'text.inverse',
              border: 'none',
              _hover: { bg: 'accent.hover' },
              _disabled: { opacity: 0.5, cursor: 'not-allowed' },
            })}
          >
            GitHub PRを作成
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        className={css({
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          gap: 'xl',
          p: 'lg',
          overflow: 'auto',
        })}
      >
        {/* Alert Messages */}
        {error && (
          <div
            className={css({
              p: 'md',
              borderRadius: 'md',
              fontSize: '0.875rem',
              bg: 'error.subtle',
              color: 'error.text',
              border: '1px solid',
              borderColor: 'error',
            })}
          >
            {error}
          </div>
        )}
        {success && (
          <div
            className={css({
              p: 'md',
              borderRadius: 'md',
              fontSize: '0.875rem',
              bg: 'success.subtle',
              color: 'success',
              border: '1px solid',
              borderColor: 'success',
            })}
          >
            {success}
          </div>
        )}

        {/* Meta Grid */}
        <div
          className={css({
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 'md',
          })}
        >
          <div>
            <label
              className={css({
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: 'text.secondary',
                mb: 'xs',
              })}
            >
              イベント名
            </label>
            <input
              type="text"
              name="eventName"
              value={formData.eventName}
              onChange={handleChange}
              placeholder="例: 新歓"
              className={css({
                w: '100%',
                px: 'md',
                py: 'sm',
                fontSize: '0.875rem',
                borderRadius: 'md',
                border: '1px solid',
                borderColor: 'border.DEFAULT',
                bg: 'bg.input',
                color: 'text.primary',
                outline: 'none',
                transition: 'all 0.2s',
                _focus: {
                  borderColor: 'border.focus',
                  bg: 'bg.inputFocus',
                  shadow: 'input',
                },
                _placeholder: { color: 'text.muted' },
              })}
            />
          </div>
          <div>
            <label
              className={css({
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: 'text.secondary',
                mb: 'xs',
              })}
            >
              イベント日付 (mm-dd)
            </label>
            <input
              type="text"
              name="eventDate"
              value={formData.eventDate}
              onChange={handleChange}
              placeholder="例: 04-15"
              className={css({
                w: '100%',
                px: 'md',
                py: 'sm',
                fontSize: '0.875rem',
                borderRadius: 'md',
                border: '1px solid',
                borderColor: 'border.DEFAULT',
                bg: 'bg.input',
                color: 'text.primary',
                outline: 'none',
                transition: 'all 0.2s',
                _focus: {
                  borderColor: 'border.focus',
                  bg: 'bg.inputFocus',
                  shadow: 'input',
                },
                _placeholder: { color: 'text.muted' },
              })}
            />
          </div>
          <div className={css({ gridColumn: 'span 2' })}>
            <label
              className={css({
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: 'text.secondary',
                mb: 'xs',
              })}
            >
              ブログタイトル
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="ブログのタイトルを入力"
              className={css({
                w: '100%',
                px: 'md',
                py: 'sm',
                fontSize: '0.875rem',
                borderRadius: 'md',
                border: '1px solid',
                borderColor: 'border.DEFAULT',
                bg: 'bg.input',
                color: 'text.primary',
                outline: 'none',
                transition: 'all 0.2s',
                _focus: {
                  borderColor: 'border.focus',
                  bg: 'bg.inputFocus',
                  shadow: 'input',
                },
                _placeholder: { color: 'text.muted' },
              })}
            />
          </div>
        </div>

        {/* Editor Grid */}
        <div
          className={css({
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 'md',
            flex: 1,
            minH: '400px',
          })}
        >
          {/* Editor Pane */}
          <div
            className={css({
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid',
              borderColor: 'border.DEFAULT',
              borderRadius: 'md',
              bg: 'bg.island',
              overflow: 'hidden',
            })}
          >
            <EditorToolbar onInsert={handleToolbarInsert} />
            <textarea
              ref={textareaRef}
              name="content"
              value={formData.content}
              onChange={handleChange}
              placeholder="Markdownで記事を書く..."
              className={css({
                flex: 1,
                w: '100%',
                p: 'md',
                fontSize: '0.875rem',
                fontFamily: 'mono',
                lineHeight: '1.7',
                bg: 'transparent',
                color: 'text.primary',
                border: 'none',
                outline: 'none',
                resize: 'none',
                _placeholder: { color: 'text.muted' },
              })}
            />
          </div>

          {/* Preview Pane */}
          <div
            className={css({
              border: '1px solid',
              borderColor: 'border.DEFAULT',
              borderRadius: 'md',
              bg: 'bg.island',
              overflow: 'auto',
              p: 'md',
            })}
          >
            <MarkdownPreview content={formData.content} />
          </div>
        </div>
      </div>
    </>
  )
}
