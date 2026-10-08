import Dexie, { type Table } from 'dexie'
import type { Balita, KunjunganILP } from './types'

export class PosyanduDB extends Dexie {
  balita!: Table<Balita, number>
  kunjungan!: Table<KunjunganILP, number>

  constructor(name = 'PosyanduMedelanDB') {
    super(name)
    this.version(1).stores({
      // `&local_uuid` = unique; kunci gabungan dipakai untuk "sudah ditimbang hari ini" & riwayat.
      balita: '++id, &local_uuid, nama_balita, alamat_rt, sync_status, updated_at',
      kunjungan:
        '++id, &local_uuid, balita_uuid, tanggal_kunjungan, sync_status, [balita_uuid+tanggal_kunjungan]',
    })
  }
}

export const db = new PosyanduDB()

export function newUuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Ultimate fallback for non-secure contexts (e.g., testing on local IP)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function nowIso(): string {
  return new Date().toISOString()
}

/** Tanggal lokal (zona waktu perangkat) dalam format YYYY-MM-DD. */
export function todayLocal(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
