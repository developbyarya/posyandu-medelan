import { RT_OPTIONS, type RT } from '../config/wilayah'

export interface RtChipsProps {
  value: RT | ''
  onChange: (rt: RT | '') => void
  /** Tampilkan chip "Semua RT" (untuk filter roster). Memilihnya mengosongkan nilai. */
  allowAll?: boolean
  label?: string
}

/** Pilihan RT 1-5 sebagai chip besar (radio group), bukan input teks. */
export function RtChips({ value, onChange, allowAll = false, label = 'Pilih RT' }: RtChipsProps) {
  const chip = (selected: boolean) =>
    [
      'min-h-16 min-w-16 flex-1 rounded-2xl border-2 px-4 text-2xl font-bold select-none',
      selected
        ? 'border-primary-strong bg-primary text-on-primary'
        : 'border-ink bg-paper text-ink active:bg-surface',
    ].join(' ')

  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-3">
      {allowAll && (
        <button
          type="button"
          role="radio"
          aria-checked={value === ''}
          className={chip(value === '')}
          onClick={() => onChange('')}
        >
          Semua RT
        </button>
      )}
      {RT_OPTIONS.map((rt) => (
        <button
          key={rt}
          type="button"
          role="radio"
          aria-checked={value === rt}
          className={chip(value === rt)}
          onClick={() => onChange(rt)}
        >
          RT {rt}
        </button>
      ))}
    </div>
  )
}
