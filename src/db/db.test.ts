import { beforeEach, describe, expect, it } from 'vitest'
import { PosyanduDB, newUuid, nowIso, todayLocal } from './db'
import type { Balita, KunjunganILP } from './types'

let db: PosyanduDB
let counter = 0

beforeEach(async () => {
  // Basis data baru per tes supaya tidak saling mempengaruhi.
  db = new PosyanduDB(`test-db-${counter++}-${Math.random()}`)
  await db.open()
})

function makeBalita(over: Partial<Balita> = {}): Balita {
  const now = nowIso()
  return {
    local_uuid: newUuid(),
    nama_balita: 'Ahmad Fauzan',
    jenis_kelamin: 'L',
    tanggal_lahir: '2024-03-25',
    bb_lahir: 3.2,
    pb_lahir: 49,
    nama_ortu: 'Siti / Budi',
    alamat_rt: '2',
    dusun: 'Medelan',
    posyandu: 'Posyandu Padukuhan Medelan',
    sync_status: 'pending',
    created_at: now,
    updated_at: now,
    ...over,
  }
}

function makeKunjungan(balita_uuid: string, tanggal: string, over: Partial<KunjunganILP> = {}): KunjunganILP {
  const now = nowIso()
  return {
    local_uuid: newUuid(),
    balita_uuid,
    tanggal_kunjungan: tanggal,
    umur_bulan: 18,
    bb: 10.8,
    status_kenaikan_bb: 'N',
    zbbu: 0,
    status_bbu: 'Normal',
    tb: 80.5,
    posisi_ukur: 'berdiri',
    ztbu: 0,
    status_tbu: 'Normal',
    zbbtb: 0,
    status_bbtb: 'Gizi Baik',
    checklist_perkembangan: 'Lengkap',
    tbc_batuk: false,
    tbc_demam: false,
    tbc_bb_tidak_naik: false,
    tbc_kontak: false,
    asi_eksklusif: false,
    vitamin_a: true,
    obat_cacing: false,
    rujuk_puskesmas: false,
    sync_status: 'pending',
    created_at: now,
    updated_at: now,
    ...over,
  }
}

describe('PosyanduDB', () => {
  it('menyimpan dan membaca balita', async () => {
    const b = makeBalita()
    const id = await db.balita.add(b)
    expect(id).toBeGreaterThan(0)
    expect((await db.balita.get(id))?.nama_balita).toBe('Ahmad Fauzan')
  })

  it('menolak local_uuid ganda (indeks unik)', async () => {
    const b = makeBalita()
    await db.balita.add(b)
    await expect(db.balita.add({ ...b })).rejects.toThrow()
  })

  it('memfilter balita per RT dan status sinkron lewat indeks', async () => {
    await db.balita.bulkAdd([
      makeBalita({ nama_balita: 'A', alamat_rt: '1' }),
      makeBalita({ nama_balita: 'B', alamat_rt: '2' }),
      makeBalita({ nama_balita: 'C', alamat_rt: '2', sync_status: 'synced' }),
    ])
    expect(await db.balita.where('alamat_rt').equals('2').count()).toBe(2)
    expect(await db.balita.where('sync_status').equals('pending').count()).toBe(2)
  })

  it('mengurutkan balita berdasarkan nama', async () => {
    await db.balita.bulkAdd(['Citra', 'Andi', 'Budi'].map((n) => makeBalita({ nama_balita: n })))
    const names = (await db.balita.orderBy('nama_balita').toArray()).map((b) => b.nama_balita)
    expect(names).toEqual(['Andi', 'Budi', 'Citra'])
  })

  it('mencari kunjungan hari ini lewat indeks gabungan [balita_uuid+tanggal_kunjungan]', async () => {
    const a = makeBalita()
    const b = makeBalita({ nama_balita: 'Lain' })
    await db.balita.bulkAdd([a, b])
    await db.kunjungan.bulkAdd([
      makeKunjungan(a.local_uuid, '2026-09-07'),
      makeKunjungan(a.local_uuid, '2026-10-07'),
      makeKunjungan(b.local_uuid, '2026-09-07'),
    ])

    const hariIni = await db.kunjungan
      .where('[balita_uuid+tanggal_kunjungan]')
      .equals([a.local_uuid, '2026-10-07'])
      .count()
    expect(hariIni).toBe(1)

    const riwayat = await db.kunjungan
      .where('[balita_uuid+tanggal_kunjungan]')
      .between([a.local_uuid, ''], [a.local_uuid, '\uffff'])
      .toArray()
    expect(riwayat.map((k) => k.tanggal_kunjungan)).toEqual(['2026-09-07', '2026-10-07'])
  })

  it('mendukung status draft pada kunjungan', async () => {
    const a = makeBalita()
    await db.balita.add(a)
    await db.kunjungan.add(makeKunjungan(a.local_uuid, '2026-10-07', { sync_status: 'draft' }))
    expect(await db.kunjungan.where('sync_status').equals('draft').count()).toBe(1)
    expect(await db.kunjungan.where('sync_status').equals('pending').count()).toBe(0)
  })
})

describe('helper', () => {
  it('newUuid menghasilkan UUID v4 unik', () => {
    const a = newUuid()
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(newUuid()).not.toBe(a)
  })

  it('todayLocal memakai tanggal lokal, bukan UTC', () => {
    // 1 Okt 2026 00:30 waktu lokal tetap "2026-10-01" walau UTC masih 30 Sep.
    expect(todayLocal(new Date(2026, 9, 1, 0, 30))).toBe('2026-10-01')
    expect(todayLocal(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })
})
