#!/usr/bin/env node
/**
 * Memeriksa anggaran ukuran bundel setelah `npm run build`.
 *  - JS awal (entry + modulepreload yang dirujuk index.html), gzip  < 200 KB
 *  - Seluruh data Z-Score JSON (jika ada), gzip                       < 80 KB
 * Usage: node scripts/check-size.mjs
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const DIST = new URL('../dist/', import.meta.url).pathname
const INITIAL_JS_LIMIT = 200 * 1024
const ZSCORE_JSON_LIMIT = 80 * 1024

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('dist/index.html tidak ada. Jalankan `npm run build` dulu.')
  process.exit(1)
}

const html = readFileSync(join(DIST, 'index.html'), 'utf8')
const refs = new Set(
  [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.js)"/g)].map((m) => m[1]),
)

const gz = (file) => gzipSync(readFileSync(file)).length
const kb = (n) => `${(n / 1024).toFixed(1)} KB`

let failed = false
let initial = 0
for (const ref of refs) {
  const size = gz(join(DIST, ref))
  initial += size
  console.log(`  ${ref}  ${kb(size)} gzip`)
}
const initialOk = initial < INITIAL_JS_LIMIT
if (!initialOk) failed = true
console.log(`${initialOk ? '✔' : '✗'} JS awal: ${kb(initial)} gzip (batas ${kb(INITIAL_JS_LIMIT)})`)

// Data Z-Score (dihasilkan di Sprint 2) biasanya ikut ter-bundle ke chunk JS; ukur dari sumbernya.
const dataDir = new URL('../src/lib/zscore/data/', import.meta.url).pathname
if (existsSync(dataDir)) {
  let total = 0
  for (const f of readdirSync(dataDir).filter((f) => f.endsWith('.json'))) {
    const p = join(dataDir, f)
    if (statSync(p).isFile()) total += gz(p)
  }
  const ok = total < ZSCORE_JSON_LIMIT
  if (!ok) failed = true
  console.log(`${ok ? '✔' : '✗'} Data Z-Score: ${kb(total)} gzip (batas ${kb(ZSCORE_JSON_LIMIT)})`)
}

process.exit(failed ? 1 : 0)
