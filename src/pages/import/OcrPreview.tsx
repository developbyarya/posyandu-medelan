import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, newUuid } from '../../db/db';
import { BigButton } from '../../components/BigButton';
import {
  calculateBBU, getStatusBBU,
  calculateTBU, getStatusTBU,
  calculateBBPB, calculateBBTB, getStatusBBTB,
  calculateLK, getStatusLK
} from '../../lib/zscore';
import { evaluateWeightTrend, checkReferral, type WeightTrend } from '../../lib/growth';

function getAgeMonths(dobStr: string, visitDateStr: string): number {
  const dob = new Date(dobStr);
  const visit = new Date(visitDateStr);
  let months = (visit.getFullYear() - dob.getFullYear()) * 12;
  months -= dob.getMonth();
  months += visit.getMonth();
  if (visit.getDate() < dob.getDate()) {
    months--;
  }
  return Math.max(0, months);
}

export default function OcrPreview() {
  const navigate = useNavigate();
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  // New Balita Modal State
  const [showModal, setShowModal] = useState(false);
  const [nbNama, setNbNama] = useState('');
  const [nbTglLahir, setNbTglLahir] = useState('');
  const [nbJk, setNbJk] = useState<'L' | 'P'>('L');
  const [nbRt, setNbRt] = useState('1');
  const [nbNamaOrtu, setNbNamaOrtu] = useState('');

  // Load balita for dropdowns
  const balitaList = useLiveQuery(() => db.balita.filter(b => !b.deleted_at && !b.is_pindah).toArray(), []) || [];

  useEffect(() => {
    const dataStr = sessionStorage.getItem('ocr_preview_data');
    const imgStr = sessionStorage.getItem('ocr_preview_image');
    if (!dataStr || !imgStr) {
      navigate('/import/upload');
      return;
    }
    try {
      const data = JSON.parse(dataStr);
      // Ensure it's an array
      const arr = Array.isArray(data) ? data : [data];
      setParsedData(arr.map(row => ({
        ...row,
        // Attempt to auto match balita UUID based on name
        selectedBalitaUuid: '' 
      })));
      setImgSrc(imgStr);
    } catch (e) {
      navigate('/import/upload');
    }
  }, [navigate]);

  useEffect(() => {
    if (parsedData.length > 0 && balitaList.length > 0) {
      const hasEmpty = parsedData.some(r => !r.selectedBalitaUuid);
      if (!hasEmpty) return;

      // Auto-match strings for empty rows
      setParsedData(prev => prev.map(row => {
        if (row.selectedBalitaUuid) return row;
        
        let bestMatch = '';
        if (row.nama_balita) {
          const s = row.nama_balita.toLowerCase();
          const match = balitaList.find(b => b.nama_balita.toLowerCase().includes(s) || s.includes(b.nama_balita.toLowerCase()));
          if (match) bestMatch = match.local_uuid;
        }
        return { ...row, selectedBalitaUuid: bestMatch };
      }));
    }
  }, [balitaList]);

  const updateRow = (index: number, field: string, value: any) => {
    const newData = [...parsedData];
    newData[index] = { ...newData[index], [field]: value };
    setParsedData(newData);
  };

  const removeRow = (index: number) => {
    setParsedData(parsedData.filter((_, i) => i !== index));
  };

  const handleCreateBalita = async () => {
    if (!nbNama || !nbTglLahir || !nbNamaOrtu) {
      alert("Nama Balita, Nama Orang Tua, dan Tanggal Lahir wajib diisi!");
      return;
    }
    const newBalita = {
      local_uuid: newUuid(),
      created_at: new Date().toISOString(),
      nama_balita: nbNama.trim(),
      tanggal_lahir: nbTglLahir,
      jenis_kelamin: nbJk,
      alamat_rt: nbRt,
      nama_ortu: nbNamaOrtu.trim(),
      dusun: 'Medelan',
      posyandu: 'Posyandu Medelan',
      sync_status: 'pending' as const,
      updated_at: new Date().toISOString()
    };
    try {
      await db.balita.add(newBalita as any);
      setShowModal(false);
      // Reset the fields
      setNbNama('');
      setNbTglLahir('');
      setNbNamaOrtu('');
    } catch (e) {
      alert("Gagal membuat balita.");
    }
  };
  const handleSave = async () => {
    setSaving(true);
    try {
      for (const row of parsedData) {
        if (!row.selectedBalitaUuid || !row.tanggal_kunjungan) continue;
        
        // Cek existing
        const existing = await db.kunjungan
          .where('balita_uuid').equals(row.selectedBalitaUuid)
          .and(k => k.tanggal_kunjungan === row.tanggal_kunjungan)
          .first();

        const balita = balitaList.find(b => b.local_uuid === row.selectedBalitaUuid);
        if (!balita) continue;

        const ageMonths = getAgeMonths(balita.tanggal_lahir, row.tanggal_kunjungan);
        const gender = balita.jenis_kelamin;

        const bbVal = parseFloat(row.bb);
        const tbVal = parseFloat(row.tb);
        const lkVal = parseFloat(row.lingkar_kepala);
        const lilaVal = parseFloat(row.lila);
        const posisi = (row.posisi_ukur === 'berdiri' ? 'berdiri' : 'berbaring') as 'berbaring' | 'berdiri';

        let zbbu = 0, ztbu = 0, zbbtb = 0, zlk = null;
        
        if (!isNaN(bbVal)) zbbu = calculateBBU(gender, ageMonths, bbVal);
        if (!isNaN(tbVal)) ztbu = calculateTBU(gender, ageMonths, tbVal);
        
        if (!isNaN(bbVal) && !isNaN(tbVal)) {
          if (ageMonths < 24 || posisi === 'berbaring') {
            let adj = tbVal;
            if (ageMonths >= 24 && posisi === 'berbaring') adj -= 0.7;
            else if (ageMonths < 24 && posisi === 'berdiri') adj += 0.7;
            zbbtb = calculateBBPB(gender, adj, bbVal);
          } else {
            zbbtb = calculateBBTB(gender, tbVal, bbVal);
          }
        }
    
        if (!isNaN(lkVal) && lkVal > 0) zlk = calculateLK(gender, ageMonths, lkVal);

        const allPrevious = await db.kunjungan.where('balita_uuid').equals(balita.local_uuid).sortBy('tanggal_kunjungan');
        const previousVisits = allPrevious.filter(k => k.tanggal_kunjungan < row.tanggal_kunjungan);
        
        const historyTrend = previousVisits.map(v => v.status_kenaikan_bb).filter(Boolean) as string[];
        let trend = 'B';
        if (!isNaN(bbVal)) {
          const isFirst = previousVisits.length === 0;
          const prevWeight = isFirst ? null : (previousVisits[previousVisits.length - 1]?.bb ?? null);
          trend = evaluateWeightTrend(isFirst, bbVal, prevWeight, ageMonths);
        }

        const lilaRed = !isNaN(lilaVal) && lilaVal > 0 && lilaVal < 11.5;

        // Note: For OCR, we usually don't have checklist and tbc info directly from the table format.
        // We'll leave them as default/undefined or parse if possible, here defaulting to 0 TBC and complete dev.
        const ref = checkReferral({
          trendHistory: historyTrend as WeightTrend[],
          zscoreBBU: zbbu, zscoreTBU: ztbu, zscoreBBTB: zbbtb, zscoreLK: zlk,
          lilaUnderweight: lilaRed, tbcSymptomsCount: 0,
          developmentIncomplete: false
        });

        const payload = {
          balita_uuid: balita.local_uuid,
          tanggal_kunjungan: row.tanggal_kunjungan,
          umur_bulan: ageMonths,
          bb: isNaN(bbVal) ? undefined : bbVal,
          tb: isNaN(tbVal) ? undefined : tbVal,
          posisi_ukur: posisi,
          lingkar_kepala: isNaN(lkVal) ? undefined : lkVal,
          lila: isNaN(lilaVal) ? undefined : lilaVal,
          
          zbbu, status_bbu: getStatusBBU(zbbu),
          ztbu, status_tbu: getStatusTBU(ztbu),
          zbbtb, status_bbtb: getStatusBBTB(zbbtb),
          status_lk: zlk !== null ? getStatusLK(zlk) : undefined,
          status_lila: lilaRed ? 'Kurang (Pita Merah)' : 'Normal (Pita Hijau)',
          status_kenaikan_bb: trend as any,
          rujuk_puskesmas: ref.shouldRefer,

          sync_status: 'pending' as const,
          updated_at: new Date().toISOString()
        };

        if (existing) {
          await db.kunjungan.where('local_uuid').equals(existing.local_uuid).modify(payload);
        } else {
          await db.kunjungan.add({
            local_uuid: newUuid(),
            created_at: new Date().toISOString(),
            ...payload
          } as any);
        }
      }
      
      sessionStorage.removeItem('ocr_preview_data');
      sessionStorage.removeItem('ocr_preview_image');
      alert("Data berhasil diimpor!");
      navigate('/');
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan data.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto pb-24 space-y-6">
      <h1 className="text-3xl font-bold text-primary">Preview Data</h1>
      <p className="text-ink-soft">Periksa dan perbaiki data hasil scan AI sebelum disimpan.</p>

      {imgSrc && (
        <div className="rounded-xl overflow-hidden border-2 border-line h-48 bg-black">
          <img src={imgSrc} alt="Scanned" className="w-full h-full object-contain" />
        </div>
      )}

      <div className="space-y-6">
        {parsedData.map((row, i) => (
          <div key={i} className="bg-surface p-4 rounded-xl border-2 border-line space-y-4 relative">
            <button onClick={() => removeRow(i)} className="absolute top-2 right-4 text-danger-ink font-bold">Hapus</button>
            <h3 className="font-bold text-lg border-b border-line pb-2">Baris {i + 1}</h3>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-bold mb-1">Hubungkan ke Balita</label>
                <div className="flex justify-between items-end gap-2">
                  <div className="flex-1">
                    <select 
                      value={row.selectedBalitaUuid} 
                      onChange={e => updateRow(i, 'selectedBalitaUuid', e.target.value)}
                      className="w-full p-3 border-2 border-line rounded-lg bg-paper"
                    >
                      <option value="">-- Pilih Balita --</option>
                      {balitaList.map(b => (
                        <option key={b.local_uuid} value={b.local_uuid}>{b.nama_balita} (RT {b.alamat_rt})</option>
                      ))}
                    </select>
                  </div>
                  <button 
                    onClick={() => {
                      setNbNama(row.nama_balita || '');
                      setNbTglLahir(row.tanggal_lahir || '');
                      setNbNamaOrtu(row.nama_ortu || row.namaOrtu || '');
                      setShowModal(true);
                    }} 
                    className="p-3 bg-primary text-white font-bold rounded-lg whitespace-nowrap"
                  >
                    + Baru
                  </button>
                </div>
                {row.nama_balita && (
                  <p className="text-xs text-ink-soft mt-1">Terbaca dari foto: "{row.nama_balita}" {row.tanggal_lahir && `(Lahir: ${row.tanggal_lahir})`}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-1">Tanggal</label>
                  <input type="date" value={row.tanggal_kunjungan || ''} onChange={e => updateRow(i, 'tanggal_kunjungan', e.target.value)} className="w-full p-3 border-2 border-line rounded-lg bg-paper" />
                  {row.umur_bulan && (
                    <p className="text-xs text-ink-soft mt-1">Umur bacaan: {row.umur_bulan} bln</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Berat (kg)</label>
                  <input type="number" step="0.1" value={row.bb || ''} onChange={e => updateRow(i, 'bb', e.target.value)} className="w-full p-3 border-2 border-line rounded-lg bg-paper" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Tinggi (cm)</label>
                  <input type="number" step="0.1" value={row.tb || ''} onChange={e => updateRow(i, 'tb', e.target.value)} className="w-full p-3 border-2 border-line rounded-lg bg-paper" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Posisi</label>
                  <select value={row.posisi_ukur || 'berbaring'} onChange={e => updateRow(i, 'posisi_ukur', e.target.value)} className="w-full p-3 border-2 border-line rounded-lg bg-paper">
                    <option value="berbaring">Baring</option>
                    <option value="berdiri">Berdiri</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">LK (cm)</label>
                  <input type="number" step="0.1" value={row.lingkar_kepala || ''} onChange={e => updateRow(i, 'lingkar_kepala', e.target.value)} className="w-full p-3 border-2 border-line rounded-lg bg-paper" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">LiLA (cm)</label>
                  <input type="number" step="0.1" value={row.lila || ''} onChange={e => updateRow(i, 'lila', e.target.value)} className="w-full p-3 border-2 border-line rounded-lg bg-paper" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 pt-4">
        <BigButton onClick={handleSave} variant="primary" disabled={saving}>
          {saving ? 'Menyimpan...' : 'Simpan Semua Data'}
        </BigButton>
        <BigButton onClick={() => navigate('/import/upload')} variant="secondary" disabled={saving}>
          Batal & Ulangi Foto
        </BigButton>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-surface p-6 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto space-y-4">
            <h2 className="text-2xl font-bold text-primary border-b border-line pb-2">Buat Balita Baru</h2>
            
            <div>
              <label className="block text-sm font-bold mb-1">Nama Balita</label>
              <input type="text" value={nbNama} onChange={e => setNbNama(e.target.value)} className="w-full p-3 border-2 border-line rounded-lg bg-paper" />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Tanggal Lahir (wajib)</label>
              <input type="date" value={nbTglLahir} onChange={e => setNbTglLahir(e.target.value)} className="w-full p-3 border-2 border-line rounded-lg bg-paper" />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Jenis Kelamin</label>
              <select value={nbJk} onChange={e => setNbJk(e.target.value as 'L'|'P')} className="w-full p-3 border-2 border-line rounded-lg bg-paper">
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Nama Orang Tua</label>
              <input type="text" value={nbNamaOrtu} onChange={e => setNbNamaOrtu(e.target.value)} className="w-full p-3 border-2 border-line rounded-lg bg-paper" />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">RT</label>
              <input type="number" value={nbRt} onChange={e => setNbRt(e.target.value)} className="w-full p-3 border-2 border-line rounded-lg bg-paper" />
            </div>
            
            <div className="flex gap-2 pt-4">
              <button onClick={handleCreateBalita} className="flex-1 p-3 bg-primary text-white font-bold rounded-lg">Simpan Balita</button>
              <button onClick={() => setShowModal(false)} className="flex-1 p-3 border-2 border-line text-ink-soft font-bold rounded-lg">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
