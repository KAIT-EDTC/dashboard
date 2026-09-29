import type { ComponentProps } from 'react'
import { Link, type LinkProps } from 'react-router'
import { cva, cx, type RecipeVariantProps } from 'styled-system/css'
import { Spinner } from './Spinner'

export const buttonStyle = cva({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'xs',
    fontWeight: '600',
    borderRadius: 'md',
    borderWidth: '1px',
    borderColor: 'transparent',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    textDecoration: 'none',
    transition: 'background 0.15s, border-color 0.15s, color 0.15s',
    _disabled: { opacity: 0.5, cursor: 'not-allowed' },
    _focusVisible: { outline: 'none', shadow: 'focus' },
  },
  variants: {
    variant: {
      primary: { bg: 'accent', color: 'fg.inverted', _hover: { bg: 'accent.hover', color: 'fg.inverted' } },
      secondary: { bg: 'surface', color: 'fg', borderColor: 'border', _hover: { bg: 'surface.muted', color: 'fg' } },
      ghost: { bg: 'transparent', color: 'fg.muted', _hover: { bg: 'surface.muted', color: 'fg' } },
      danger: {
        bg: 'surface',
        color: 'danger.fg',
        borderColor: 'border',
        _hover: { bg: 'danger.subtle', borderColor: 'danger', color: 'danger.fg' },
      },
      discord: { bg: 'discord', color: 'fg.inverted', _hover: { bg: 'discord.hover', color: 'fg.inverted' } },
    },
    size: {
      sm: { h: '30px', px: '10px', fontSize: 'xs' },
      md: { h: '38px', px: 'md', fontSize: 'sm' },
      lg: { h: '48px', px: 'lg', fontSize: 'md' },
    },
    block: { true: { w: 'full' } },
  },
  defaultVariants: { variant: 'secondary', size: 'md' },
})

type ButtonVariants = RecipeVariantProps<typeof buttonStyle>

type ButtonProps = ComponentProps<'button'> & ButtonVariants & { loading?: boolean }

export function Button({ variant, size, block, loading, disabled, className, children, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={cx(buttonStyle({ variant, size, block }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  )
}

export function ButtonLink({ variant, size, block, className, ...props }: LinkProps & ButtonVariants) {
  return <Link className={cx(buttonStyle({ variant, size, block }), className)} {...props} />
}
