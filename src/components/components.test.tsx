import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { formatAlamat, RT_OPTIONS, WILAYAH, type RT } from '../config/wilayah'
import { BigButton } from './BigButton'
import { RtChips } from './RtChips'
import { StatusBadge } from './StatusBadge'

describe('wilayah', () => {
  it('menyediakan RT 1 sampai 5', () => {
    expect([...RT_OPTIONS]).toEqual(['1', '2', '3', '4', '5'])
  })

  it('memformat alamat untuk PDF', () => {
    expect(formatAlamat('2')).toBe('Medelan RT 2, Umbulmartani, Ngemplak')
    expect(WILAYAH.posyandu).toBe('Posyandu Padukuhan Medelan')
  })
})

describe('BigButton', () => {
  it('memiliki tinggi minimal 64px (min-h-16) dan memicu onClick', () => {
    const onClick = vi.fn()
    render(<BigButton onClick={onClick}>Simpan</BigButton>)
    const btn = screen.getByRole('button', { name: 'Simpan' })
    expect(btn.className).toContain('min-h-16')
    fireEvent.click(btn)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('tidak memicu onClick saat disabled', () => {
    const onClick = vi.fn()
    render(
      <BigButton disabled onClick={onClick}>
        Simpan
      </BigButton>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }))
    expect(onClick).not.toHaveBeenCalled()
  })
})

describe('StatusBadge', () => {
  it.each([
    ['ok', '✔', 'Baik'],
    ['warn', '!', 'Waspada'],
    ['danger', '⚠', 'Bahaya'],
  ] as const)('nada %s selalu menampilkan ikon + teks (bukan hanya warna)', (tone, icon, sr) => {
    const { container } = render(<StatusBadge tone={tone}>Teks Awam</StatusBadge>)
    expect(container.textContent).toContain(icon)
    expect(container.textContent).toContain('Teks Awam')
    expect(container.textContent).toContain(sr)
  })
})

describe('RtChips', () => {
  function Harness({ allowAll = false }: { allowAll?: boolean }) {
    const [rt, setRt] = useState<RT | ''>('')
    return (
      <>
        <RtChips value={rt} onChange={setRt} allowAll={allowAll} />
        <output data-testid="value">{rt}</output>
      </>
    )
  }

  it('menampilkan 5 pilihan RT dan memilih satu', () => {
    render(<Harness />)
    expect(screen.getAllByRole('radio')).toHaveLength(5)
    fireEvent.click(screen.getByRole('radio', { name: 'RT 3' }))
    expect(screen.getByTestId('value').textContent).toBe('3')
    expect(screen.getByRole('radio', { name: 'RT 3' }).getAttribute('aria-checked')).toBe('true')
    expect(screen.getByRole('radio', { name: 'RT 1' }).getAttribute('aria-checked')).toBe('false')
  })

  it('mode filter punya chip "Semua RT" yang mengosongkan pilihan', () => {
    render(<Harness allowAll />)
    expect(screen.getAllByRole('radio')).toHaveLength(6)
    fireEvent.click(screen.getByRole('radio', { name: 'RT 5' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Semua RT' }))
    expect(screen.getByTestId('value').textContent).toBe('')
  })
})
