import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db } from '../db/db';
import { RT_OPTIONS, type RT, APP_NAME, WILAYAH } from '../config/wilayah';
import { BigButton } from '../components/BigButton';
import { StatusBadge } from '../components/StatusBadge';
import { useOnline, useInstallPrompt } from '../lib/pwa';
import { generateKartuPdf } from '../lib/pdf/generateKartu';
import type { Balita, KunjunganILP } from '../db/types';
import { useSync } from '../lib/sync/useSync';
import { exportToExcel } from '../lib/exportExcel';

export function Roster() {
  const navigate = useNavigate();
  const online = useOnline();
  const { canInstall, installed, install } = useInstallPrompt();
  const { isConfigured, pendingCount, isSyncing, triggerSync } = useSync();
  
  const [search, setSearch] = useState('');
  const [selectedRt, setSelectedRt] = useState<RT | 'Semua'>('Semua');
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [exportingExcel, setExportingExcel] = useState(false);

  // Dapatkan string bulan ini (YYYY-MM)
  const todayStr = new Date().toLocaleDateString('en-CA'); 
  const currentMonthStr = todayStr.substring(0, 7); // e.g. "2026-10"

  // Ambil semua balita yang tidak dihapus dan tidak pindah
  const balitaList = useLiveQuery(
    () => db.balita.filter(b => !b.deleted_at && !b.is_pindah).toArray(),
    []
  );

  // Ambil semua kunjungan bulan ini untuk menentukan status ditimbang
  const thisMonthVisits = useLiveQuery(
    () => db.kunjungan
      .where('tanggal_kunjungan')
      .startsWith(currentMonthStr)
      .toArray(),
    [currentMonthStr]
  );

  if (!balitaList || !thisMonthVisits) {
    return <div className="p-4 text-center text-xl text-ink-soft mt-10">Memuat data...</div>;
  }

  // Set ID balita yang sudah ditimbang atau masih draft bulan ini
  const visitsByBalitaId = new Map(thisMonthVisits.map(v => [v.balita_uuid, v]));

  // Filter
  const filtered = balitaList.filter(b => {
    if (selectedRt !== 'Semua' && b.alamat_rt !== selectedRt) return false;
    if (search.trim() !== '') {
      const s = search.toLowerCase();
      if (!b.nama_balita.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  // Urutkan alfabet
  filtered.sort((a, b) => a.nama_balita.localeCompare(b.nama_balita));

  const handlePrintPdf = async (balita: Balita) => {
    try {
      setGeneratingId(balita.local_uuid);
      const allVisits = await db.kunjungan
        .where('balita_uuid')
        .equals(balita.local_uuid)
        .sortBy('tanggal_kunjungan');
        
      const blob = await generateKartuPdf(balita, allVisits as KunjunganILP[]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Kartu_Bantu_ILP_${balita.nama_balita.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (err) {
      console.error("Error generating PDF:", err);
      alert("Gagal membuat PDF. Silakan coba lagi.");
    } finally {
      setGeneratingId(null);
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-6 p-4 pb-32">
      <header className="rounded-2xl border-2 border-primary-strong bg-primary p-5 text-on-primary">
        <h1 className="text-3xl font-bold tracking-wide">{APP_NAME}</h1>
        <p className="text-xl">{WILAYAH.posyandu}</p>
        <p className="text-xl opacity-95">
          {WILAYAH.desa}, {WILAYAH.kecamatan}
        </p>
      </header>

      <section aria-labelledby="status-app" className="flex flex-col gap-2">
        <div className="flex gap-2 items-center flex-wrap">
          {online ? (
            <StatusBadge tone="ok">Terhubung internet</StatusBadge>
          ) : (
            <StatusBadge tone="warn">Mode Offline</StatusBadge>
          )}
          
          {isConfigured && pendingCount > 0 && (
            <button 
              onClick={triggerSync} 
              disabled={isSyncing || !online}
              className="px-3 py-1 bg-warn text-warn-ink rounded-full text-sm font-bold shadow-sm"
            >
              {isSyncing ? 'Menyinkronkan...' : `${pendingCount} data belum terkirim`}
            </button>
          )}
        </div>
      </section>

      <section className="bg-surface p-4 rounded-xl border-2 border-line shadow-sm">
        <h2 className="text-xl font-bold mb-3">Unduh Rekapitulasi Bulanan</h2>
        <div className="flex gap-3">
          <button 
            onClick={async () => {
              setExportingExcel(true);
              try {
                await exportToExcel();
              } finally {
                setExportingExcel(false);
              }
            }}
            disabled={exportingExcel}
            className="flex-1 py-3 bg-ok text-white font-bold rounded-lg shadow-sm border-2 border-ok-ink active:bg-ok-ink disabled:opacity-50"
          >
            {exportingExcel ? 'Menyiapkan...' : 'Excel (.xlsx)'}
          </button>
          <button 
            onClick={() => window.open('/rekap-print', '_blank')}
            className="flex-1 py-3 bg-paper text-ink font-bold rounded-lg shadow-sm border-2 border-line active:bg-surface"
          >
            PDF / Cetak
          </button>
        </div>
      </section>

      {!installed && canInstall && (
        <BigButton fullWidth onClick={install}>
          Pasang di Layar Utama HP
        </BigButton>
      )}

      <div className="mt-2">
        <BigButton 
          fullWidth 
          variant="primary"
          onClick={() => navigate('/balita/baru')}
        >
          + Tambah Balita Baru
        </BigButton>
      </div>

      <section className="flex flex-col gap-4 mt-4">
        <h2 className="text-2xl font-bold text-ink border-b-2 border-line pb-2">Daftar Balita</h2>
        
        <input 
          type="text"
          placeholder="Cari nama balita..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-xl p-4 font-bold border-2 border-line rounded-xl bg-paper"
        />

        <div>
          <label className="block text-sm font-bold text-ink-soft uppercase tracking-wider mb-2">Filter RT</label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedRt('Semua')}
              className={`px-4 py-2 text-lg font-bold rounded-full border-2 transition-colors ${selectedRt === 'Semua' ? 'bg-primary text-on-primary border-primary' : 'bg-paper text-ink border-line'}`}
            >
              Semua
            </button>
            {RT_OPTIONS.map(rt => (
              <button
                key={rt}
                onClick={() => setSelectedRt(rt as RT)}
                className={`px-4 py-2 text-lg font-bold rounded-full border-2 transition-colors ${selectedRt === rt ? 'bg-primary text-on-primary border-primary' : 'bg-paper text-ink border-line'}`}
              >
                RT {rt}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 mt-4">
          {filtered.length === 0 ? (
            <div className="text-center p-8 bg-surface rounded-xl border border-line">
              <p className="text-ink-soft text-xl font-bold">Tidak ada balita ditemukan.</p>
            </div>
          ) : (
            filtered.map(balita => {
              const visit = visitsByBalitaId.get(balita.local_uuid);
              const isDone = visit && visit.sync_status !== 'draft';
              const isDraft = visit && visit.sync_status === 'draft';
              const isGenerating = generatingId === balita.local_uuid;

              return (
                <div 
                  key={balita.local_uuid} 
                  className="bg-paper p-4 rounded-xl border-2 border-line shadow-sm flex flex-col gap-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-2xl font-bold text-ink">{balita.nama_balita}</h3>
                      <p className="text-lg text-ink-soft">RT {balita.alamat_rt} • {balita.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</p>
                    </div>
                  </div>
                  
                  <div>
                    {isDone ? (
                      <StatusBadge tone="ok">Sudah Ditimbang Bulan Ini</StatusBadge>
                    ) : isDraft ? (
                      <StatusBadge tone="neutral">Sedang Ditimbang (Draft)</StatusBadge>
                    ) : (
                      <StatusBadge tone="warn">Belum Ditimbang</StatusBadge>
                    )}
                  </div>
                  
                  <div className="flex gap-2 mt-2">
                    {isDone ? (
                      <button 
                        onClick={() => navigate(`/kunjungan/${visit.local_uuid}/edit`)}
                        className="flex-1 py-3 bg-surface border-2 border-primary text-primary font-bold text-lg rounded-lg"
                      >
                        Edit
                      </button>
                    ) : (
                      <button 
                        onClick={() => navigate(`/timbang/${balita.local_uuid}/bb`)}
                        className="flex-1 py-3 bg-primary text-on-primary font-bold text-lg rounded-lg"
                      >
                        Timbang
                      </button>
                    )}
                    <button 
                      onClick={() => handlePrintPdf(balita)}
                      disabled={isGenerating}
                      className="px-4 py-3 bg-surface border-2 border-line text-ink font-bold text-lg rounded-lg disabled:opacity-50"
                      title="Cetak PDF"
                    >
                      {isGenerating ? '...' : 'PDF'}
                    </button>
                    <button 
                      onClick={() => navigate(`/balita/${balita.local_uuid}/riwayat`)}
                      className="px-4 py-3 bg-surface border-2 border-line text-ink font-bold text-lg rounded-lg"
                    >
                      Riwayat
                    </button>
                    <button 
                      onClick={() => navigate(`/balita/${balita.local_uuid}/edit`)}
                      className="px-4 py-3 bg-surface border-2 border-line text-ink font-bold text-lg rounded-lg"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <div className="mt-8 border-t-2 border-line pt-6">
        <BigButton 
          fullWidth 
          variant="secondary"
          onClick={() => navigate('/kalkulator')}
        >
          Kalkulator Bebas Z-Score
        </BigButton>
        <div className="mt-4">
          <button 
            onClick={() => navigate('/import/login')} 
            className="w-full py-4 text-ink-soft font-bold rounded-xl border-2 border-line bg-paper active:bg-surface"
          >
            📸 Impor Foto KMS (Admin)
          </button>
        </div>
      </div>
    </main>
  );
}
