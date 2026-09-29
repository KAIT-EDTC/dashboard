import type { ReactNode } from 'react'
import { cva, type RecipeVariantProps } from 'styled-system/css'

export const badgeStyle = cva({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    px: '8px',
    h: '22px',
    fontSize: 'xs',
    fontWeight: '600',
    borderRadius: 'full',
    whiteSpace: 'nowrap',
  },
  variants: {
    tone: {
      neutral: { bg: 'surface.muted', color: 'fg.muted' },
      accent: { bg: 'accent.subtle', color: 'accent.fg' },
      success: { bg: 'success.subtle', color: 'success.fg' },
      warning: { bg: 'warning.subtle', color: 'warning.fg' },
      danger: { bg: 'danger.subtle', color: 'danger.fg' },
      discord: { bg: 'discord', color: 'fg.inverted' },
    },
  },
  defaultVariants: { tone: 'neutral' },
})

export type BadgeTone = NonNullable<RecipeVariantProps<typeof badgeStyle>>['tone']

export function Badge({ tone, children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={badgeStyle({ tone })}>{children}</span>
}
