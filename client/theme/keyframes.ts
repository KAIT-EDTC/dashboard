import { defineKeyframes } from '@pandacss/dev'

export const keyframes = defineKeyframes({
  fadeIn: {
    from: { opacity: '0' },
    to: { opacity: '1' },
  },
  fadeInUp: {
    from: { opacity: '0', transform: 'translateY(12px)' },
    to: { opacity: '1', transform: 'translateY(0)' },
  },
  spin: {
    from: { transform: 'rotate(0deg)' },
    to: { transform: 'rotate(360deg)' },
  },
})
