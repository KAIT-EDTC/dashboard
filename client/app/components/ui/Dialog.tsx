import { useEffect, useId, useRef, type ReactNode } from 'react'
import { css } from 'styled-system/css'
import { Button } from './Button'
import { XIcon } from './Icons'

type DialogProps = {
  open: boolean
  /** 閉じるボタン・Esc で呼ばれる。親で open を false にする */
  onClose: () => void
  title: ReactNode
  children: ReactNode
}

/** ネイティブの <dialog> を showModal() で開くモーダル。中身は開いている間だけ描画するので、開くたびに初期状態に戻る */
export function Dialog({ open, onClose, title, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    else if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      // Esc は cancel で受けて open 経由で閉じる（close イベントは非表示タブだと遅れて届き、状態がずれる）
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClose={onClose}
      aria-labelledby={titleId}
      className={css({
        m: 'auto',
        p: '0',
        w: 'calc(100% - 32px)',
        maxW: '520px',
        maxH: 'calc(100dvh - 32px)',
        overflowY: 'auto',
        bg: 'surface',
        color: 'fg',
        borderWidth: '1px',
        borderColor: 'border',
        borderRadius: 'lg',
        _backdrop: { bg: 'rgba(0, 0, 0, 0.5)' },
      })}
    >
      <header
        className={css({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'sm',
          px: 'lg',
          py: '12px',
          borderBottomWidth: '1px',
        })}
      >
        <h2 id={titleId} className={css({ fontSize: 'md', fontWeight: '600' })}>
          {title}
        </h2>
        <Button variant="ghost" aria-label="閉じる" onClick={onClose}>
          <XIcon />
        </Button>
      </header>
      <div className={css({ p: 'lg' })}>{open && children}</div>
    </dialog>
  )
}
