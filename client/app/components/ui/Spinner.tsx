import { css, cx } from 'styled-system/css'
import { Center } from 'styled-system/jsx'

const sizes = { sm: '14px', md: '20px', lg: '36px' }

export function Spinner({ size = 'md', className }: { size?: keyof typeof sizes; className?: string }) {
  return (
    <span
      role="status"
      aria-label="読み込み中"
      className={cx(
        css({
          display: 'inline-block',
          flexShrink: 0,
          border: '2px solid',
          borderColor: 'currentColor',
          borderTopColor: 'transparent',
          borderRadius: 'full',
          animation: 'spin 0.8s linear infinite',
          opacity: 0.7,
        }),
        className,
      )}
      style={{ width: sizes[size], height: sizes[size] }}
    />
  )
}

export function LoadingScreen() {
  return (
    <Center minH="100vh" flexDirection="column" gap="md" color="accent">
      <Spinner size="lg" />
      <p className={css({ color: 'fg.subtle', fontSize: 'sm' })}>読み込み中...</p>
    </Center>
  )
}
