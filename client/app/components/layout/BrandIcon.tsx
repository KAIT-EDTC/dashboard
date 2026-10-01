import { css } from 'styled-system/css'

/** ごくまれに別の画像が出る遊び心。ページを開き直すまで同じ画像のままにするためモジュールで1回だけ抽選する */
const SMILE_RATE = 0.03
const isSmile = Math.random() < SMILE_RATE

export function BrandIcon({ size }: { size: number }) {
  return (
    <img
      src={isSmile ? '/edtc-smile-sasaki.webp' : '/edtc-icon.webp'}
      alt={isSmile ? '' : 'EDTC'}
      width={size}
      height={size}
      className={css({
        display: 'block',
        objectFit: 'contain',
        borderRadius: isSmile ? 'md' : undefined,
      })}
    />
  )
}
