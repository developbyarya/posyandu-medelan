-- Create balita table
CREATE TABLE balita (
  local_uuid UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  nama_balita TEXT NOT NULL,
  nik TEXT,
  tanggal_lahir DATE NOT NULL,
  jenis_kelamin TEXT NOT NULL,
  alamat_rt TEXT NOT NULL,
  telepon TEXT,
  nama_ibu TEXT NOT NULL,
  nama_ayah TEXT,
  bb_lahir NUMERIC,
  pb_lahir NUMERIC,
  dusun TEXT,
  posyandu TEXT
);

-- Create kunjungan table
CREATE TABLE kunjungan (
  local_uuid UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  balita_uuid UUID NOT NULL REFERENCES balita(local_uuid) ON DELETE CASCADE,
  tanggal_kunjungan DATE NOT NULL,
  
  bb NUMERIC,
  tb NUMERIC,
  posisi_ukur TEXT,
  lingkar_kepala NUMERIC,
  lila NUMERIC,
  checklist_perkembangan TEXT,
  tbc_batuk BOOLEAN,
  tbc_demam BOOLEAN,
  tbc_bb_tidak_naik BOOLEAN,
  tbc_kontak BOOLEAN,
  asi_eksklusif BOOLEAN,
  vitamin_a BOOLEAN,
  mpasi TEXT,
  imunisasi TEXT,
  pmt_diterima TEXT,
  edukasi TEXT,
  ada_gejala_sakit TEXT,
  override_status_kenaikan_bb TEXT,
  override_status_lk TEXT,
  override_status_lila TEXT,
  override_rujuk BOOLEAN,
  obat_cacing BOOLEAN,
  
  umur_bulan INTEGER,
  zbbu NUMERIC,
  status_bbu TEXT,
  ztbu NUMERIC,
  status_tbu TEXT,
  zbbtb NUMERIC,
  status_bbtb TEXT,
  status_lk TEXT,
  status_lila TEXT,
  status_kenaikan_bb TEXT,
  rujuk_puskesmas BOOLEAN
);

-- Enable RLS
ALTER TABLE balita ENABLE ROW LEVEL SECURITY;
ALTER TABLE kunjungan ENABLE ROW LEVEL SECURITY;

-- Create policies for anon access (since this is an offline-first PWA without auth for now, we allow anon to select, insert, update)
CREATE POLICY "Allow anon select on balita" ON balita FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert on balita" ON balita FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update on balita" ON balita FOR UPDATE TO anon USING (true);

CREATE POLICY "Allow anon select on kunjungan" ON kunjungan FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert on kunjungan" ON kunjungan FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update on kunjungan" ON kunjungan FOR UPDATE TO anon USING (true);
