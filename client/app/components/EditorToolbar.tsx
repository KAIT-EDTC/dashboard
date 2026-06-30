import { css } from '../../styled-system/css'

type Props = {
  onInsert: (syntax: string) => void
}

const toolbarBtnStyle = css({
  width: '32px',
  height: '32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  bg: 'transparent',
  border: 'none',
  borderRadius: 'sm',
  cursor: 'pointer',
  color: 'text.secondary',
  fontSize: '0.85rem',
  fontWeight: '700',
  transition: 'all 0.15s ease',
  _hover: {
    bg: 'bg.sidebarHover',
    color: 'text.primary',
  },
})

export default function EditorToolbar({ onInsert }: Props) {
  return (
    <div
      className={css({
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 'xs',
        padding: 'sm',
        borderBottom: '1px solid',
        borderColor: 'border.DEFAULT',
        bg: 'bg.tertiary',
      })}
    >
      <button className={toolbarBtnStyle} onClick={() => onInsert('**太字**')} title="太字">
        <b>B</b>
      </button>
      <button className={toolbarBtnStyle} onClick={() => onInsert('*斜体*')} title="斜体">
        <i>I</i>
      </button>
      <div className={css({ width: '1px', height: '20px', bg: 'border.DEFAULT', margin: '0 sm' })} />
      <button className={toolbarBtnStyle} onClick={() => onInsert('## 見出し')} title="見出し">
        H2
      </button>
      <button className={toolbarBtnStyle} onClick={() => onInsert('\n- リスト項目')} title="箇条書きリスト">
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
          <line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line>
        </svg>
      </button>
      <button className={toolbarBtnStyle} onClick={() => onInsert('\n1. リスト項目')} title="番号付きリスト">
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
          <line x1="10" y1="6" x2="21" y2="6"></line><line x1="10" y1="12" x2="21" y2="12"></line><line x1="10" y1="18" x2="21" y2="18"></line><path d="M4 6h1v4"></path><path d="M4 10h2"></path><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"></path>
        </svg>
      </button>
      <div className={css({ width: '1px', height: '20px', bg: 'border.DEFAULT', margin: '0 sm' })} />
      <button className={toolbarBtnStyle} onClick={() => onInsert('[リンクテキスト](url)')} title="リンク">
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
        </svg>
      </button>
      <button className={toolbarBtnStyle} onClick={() => onInsert('![代替テキスト](画像URL)')} title="画像">
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline>
        </svg>
      </button>
      <button className={toolbarBtnStyle} onClick={() => onInsert('\n```\nコードブロック\n```\n')} title="コードブロック">
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
          <polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline>
        </svg>
      </button>
    </div>
  )
}
