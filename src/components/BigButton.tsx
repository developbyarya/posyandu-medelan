import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'success' | 'secondary' | 'danger'

const VARIANT_CLASS: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary border-primary-strong active:bg-primary-strong',
  success: 'bg-ok text-white border-ok-ink active:bg-ok-ink',
  danger: 'bg-danger text-white border-danger-ink active:bg-danger-ink',
  secondary: 'bg-paper text-ink border-ink active:bg-surface',
}

export interface BigButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  fullWidth?: boolean
}

/** Tombol aksi besar: tinggi >= 64px, huruf tebal 20px+, garis tepi tegas. */
export function BigButton({
  variant = 'primary',
  fullWidth = false,
  className = '',
  type = 'button',
  ...props
}: BigButtonProps) {
  return (
    <button
      type={type}
      className={[
        'inline-flex min-h-16 items-center justify-center gap-3 rounded-2xl border-2 px-6',
        'text-xl font-bold leading-tight select-none',
        'disabled:opacity-50',
        VARIANT_CLASS[variant],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...props}
    />
  )
}
