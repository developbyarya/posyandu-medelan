import type { ReactNode } from 'react'

export type StatusTone = 'ok' | 'warn' | 'danger' | 'neutral'

const TONE: Record<StatusTone, { box: string; icon: string; symbol: string; sr: string }> = {
  ok: { box: 'bg-ok-soft text-ok-ink border-ok', icon: 'bg-ok text-white', symbol: '✔', sr: 'Baik' },
  warn: {
    box: 'bg-warn-soft text-warn-ink border-warn',
    icon: 'bg-warn text-white',
    symbol: '!',
    sr: 'Waspada',
  },
  danger: {
    box: 'bg-danger-soft text-danger-ink border-danger',
    icon: 'bg-danger text-white',
    symbol: '⚠',
    sr: 'Bahaya',
  },
  neutral: {
    box: 'bg-paper text-ink border-line',
    icon: 'bg-ink-soft text-white',
    symbol: 'i',
    sr: 'Info',
  },
}

export interface StatusBadgeProps {
  tone: StatusTone
  children: ReactNode
  className?: string
}

/**
 * Status selalu = warna + ikon + teks awam (aman untuk buta warna).
 * Ikon diberi label tersembunyi untuk pembaca layar.
 */
export function StatusBadge({ tone, children, className = '' }: StatusBadgeProps) {
  const t = TONE[tone]
  return (
    <span
      data-tone={tone}
      className={[
        'inline-flex items-center gap-3 rounded-xl border-2 px-4 py-2 text-xl font-bold',
        t.box,
        className,
      ].join(' ')}
    >
      <span
        aria-hidden="true"
        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg ${t.icon}`}
      >
        {t.symbol}
      </span>
      <span className="sr-only">{t.sr}: </span>
      <span>{children}</span>
    </span>
  )
}
