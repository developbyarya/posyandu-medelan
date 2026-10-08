import type { RT } from '../config/wilayah'

/** `draft` = kunjungan yang sedang diisi dan belum disimpan; tidak pernah disinkronkan. */
export type SyncStatus = 'synced' | 'pending' | 'draft'

export interface Balita {
  id?: number
  local_uuid: string
  nama_balita: string
  nik?: string
  jenis_kelamin: 'L' | 'P'
  tanggal_lahir: string // YYYY-MM-DD
  bb_lahir: number
  pb_lahir: number
  nama_ortu: string
  alamat_rt: RT
  telepon?: string
  dusun: string
  posyandu: string
  sync_status: Exclude<SyncStatus, 'draft'>
  created_at: string
  updated_at: string
  /** Menandakan balita pindah domisili sehingga tidak tampil di roster aktif */
  is_pindah?: boolean
  /** Soft delete: baris tidak pernah dihapus keras agar bisa disinkronkan. */
  deleted_at?: string
}

export type StatusKenaikanBB = 'N' | 'T' | 'O' | 'B'

export interface KunjunganILP {
  id?: number
  local_uuid: string
  balita_uuid: string
  tanggal_kunjungan: string // YYYY-MM-DD
  umur_bulan: number

  // Pengukuran antropometri
  bb: number
  status_kenaikan_bb: StatusKenaikanBB
  zbbu: number
  status_bbu: string
  tb: number
  posisi_ukur: 'berbaring' | 'berdiri'
  ztbu: number
  status_tbu: string
  zbbtb: number
  status_bbtb: string
  lingkar_kepala?: number
  status_lk?: string
  lila?: number
  status_lila?: string

  // Checklist ILP
  checklist_perkembangan: 'Lengkap' | 'Tidak Lengkap'
  tbc_batuk: boolean
  tbc_demam: boolean
  tbc_bb_tidak_naik: boolean
  tbc_kontak: boolean
  asi_eksklusif: boolean
  mpasi?: string
  imunisasi?: string
  vitamin_a: boolean
  obat_cacing: boolean
  pmt_diterima?: string
  edukasi?: string
  ada_gejala_sakit?: string
  rujuk_puskesmas: boolean

  // Koreksi manual kader atas hasil perhitungan otomatis
  override_status_kenaikan_bb?: StatusKenaikanBB
  override_status_lk?: string
  override_status_lila?: string
  override_rujuk?: boolean

  sync_status: SyncStatus
  created_at: string
  updated_at: string
  deleted_at?: string
}
