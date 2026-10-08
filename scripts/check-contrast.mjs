#!/usr/bin/env node
/**
 * Memeriksa rasio kontras WCAG untuk setiap pasangan warna teks/latar di tema.
 * Token dibaca langsung dari src/index.css supaya tidak bisa menyimpang dari tema.
 *
 * Target: teks >= 7:1 (AAA). Ikon/garis (non-teks) >= 3:1.
 * Usage: node scripts/check-contrast.mjs
 */
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')
const tokens = Object.fromEntries(
  [...css.matchAll(/--color-([a-z-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map((m) => [m[1], m[2]]),
)

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** [teks/ikon, latar, minimum, keterangan] */
const PAIRS = [
  ['ink', 'paper', 7, 'teks utama di putih'],
  ['ink', 'surface', 7, 'teks utama di krem'],
  ['ink-soft', 'paper', 7, 'teks sekunder di putih'],
  ['ink-soft', 'surface', 7, 'teks sekunder di krem'],
  ['on-primary', 'primary', 4.5, 'teks tombol utama (>=20px bold = teks besar; AAA teks besar = 4.5:1)'],
  ['paper', 'ink', 7, 'tombol sekunder terbalik'],
  ['primary', 'paper', 4.5, 'aksen biru di putih — hanya untuk judul/teks besar tebal, bukan teks isi'],
  ['on-primary', 'primary-strong', 7, 'tombol utama saat ditekan'],
  ['ok-ink', 'ok-soft', 7, 'teks status normal'],
  ['warn-ink', 'warn-soft', 7, 'teks status waspada'],
  ['danger-ink', 'danger-soft', 7, 'teks status bahaya'],
  ['paper', 'ok', 4.5, 'teks putih di tombol hijau (>=20px bold = teks besar)'],
  ['paper', 'danger', 4.5, 'teks putih di tombol merah (>=20px bold = teks besar)'],
  ['paper', 'warn', 3, 'ikon putih di lingkaran kuning-emas (non-teks)'],
  ['ok', 'paper', 3, 'ikon/garis hijau di putih (non-teks)'],
  ['warn', 'paper', 3, 'ikon/garis kuning-emas di putih (non-teks)'],
  ['danger', 'paper', 3, 'ikon/garis merah di putih (non-teks)'],
  ['line', 'paper', 3, 'garis tepi netral di putih (non-teks)'],
]

let failed = 0
for (const [fg, bg, min, note] of PAIRS) {
  if (!tokens[fg] || !tokens[bg]) {
    console.error(`✗ token tidak ditemukan: ${fg} / ${bg}`)
    failed++
    continue
  }
  const r = ratio(tokens[fg], tokens[bg])
  const ok = r >= min
  if (!ok) failed++
  console.log(
    `${ok ? '✔' : '✗'} ${r.toFixed(2).padStart(5)}:1 (min ${min})  ${fg} ${tokens[fg]} on ${bg} ${tokens[bg]} — ${note}`,
  )
}

if (failed) {
  console.error(`\n${failed} pasangan warna gagal.`)
  process.exit(1)
}
console.log('\nSemua pasangan warna memenuhi target kontras.')
