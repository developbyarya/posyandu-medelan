/**
 * Konstanta wilayah Posyandu Padukuhan Medelan.
 * Dipakai untuk blok header kanan di PDF dan filter RT di roster.
 */
export const WILAYAH = {
  kecamatan: 'Ngemplak',
  desa: 'Umbulmartani',
  dusun: 'Medelan',
  posyandu: 'Posyandu Padukuhan Medelan',
} as const

export const APP_NAME = 'POSYANDU MEDELAN'

export const RT_OPTIONS = ['1', '2', '3', '4', '5'] as const
export type RT = (typeof RT_OPTIONS)[number]

/** Alamat yang dicetak di PDF, mis. "Medelan RT 2, Umbulmartani, Ngemplak". */
export function formatAlamat(rt: RT): string {
  return `${WILAYAH.dusun} RT ${rt}, ${WILAYAH.desa}, ${WILAYAH.kecamatan}`
}
