import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../db/db';
import { BigButton } from '../components/BigButton';
import type { KunjunganILP } from '../db/types';

import {
  calculateBBU, getStatusBBU,
  calculateTBU, getStatusTBU,
  calculateBBPB, calculateBBTB, getStatusBBTB,
  calculateLK, getStatusLK
} from '../lib/zscore';
import { evaluateWeightTrend, checkReferral, type WeightTrend } from '../lib/growth';

export default function EditKunjungan() {
  const { visitId } = useParams<{ visitId: string }>();
  const navigate = useNavigate();

  const [visit, setVisit] = useState<KunjunganILP | null>(null);
  const [balitaGender, setBalitaGender] = useState<'L'|'P'|null>(null);
  const [previousVisits, setPreviousVisits] = useState<KunjunganILP[]>([]);
  
  // Form fields
  const [bb, setBb] = useState('');
  const [tb, setTb] = useState('');
  const [posisi, setPosisi] = useState<'berdiri'|'berbaring'>('berbaring');
  const [lingkar, setLingkar] = useState('');
  const [lila, setLila] = useState('');
  const [checklist, setChecklist] = useState<'Lengkap'|'Tidak Lengkap'>('Lengkap');

  useEffect(() => {
    async function load() {
      if (!visitId) return;
      const v = await db.kunjungan.where('local_uuid').equals(visitId).first();
      if (v) {
        setVisit(v);
        setBb(v.bb?.toString() || '');
        setTb(v.tb?.toString() || '');
        setPosisi(v.posisi_ukur || 'berbaring');
        setLingkar(v.lingkar_kepala?.toString() || '');
        setLila(v.lila?.toString() || '');
        setChecklist(v.checklist_perkembangan || 'Lengkap');
        
        const b = await db.balita.where('local_uuid').equals(v.balita_uuid).first();
        if (b) {
          setBalitaGender(b.jenis_kelamin);
          const allV = await db.kunjungan.where('balita_uuid').equals(b.local_uuid).sortBy('tanggal_kunjungan');
          setPreviousVisits(allV.filter(k => k.tanggal_kunjungan < v.tanggal_kunjungan));
        }
      }
    }
    load();
  }, [visitId]);

  const handleSave = async () => {
    if (!visit || !balitaGender) return;
    
    const bbVal = parseFloat(bb);
    const tbVal = parseFloat(tb);
    const lkVal = parseFloat(lingkar);
    const lilaVal = parseFloat(lila);

    const ageMonths = visit.umur_bulan;
    const gender = balitaGender;
    
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

    // Kenaikan BB
    const historyTrend = previousVisits.map(v => v.status_kenaikan_bb).filter(Boolean) as string[];
    let trend = 'B';
    if (!isNaN(bbVal)) {
      const isFirst = previousVisits.length === 0;
      const prevWeight = isFirst ? null : (previousVisits[previousVisits.length - 1]?.bb ?? null);
      trend = evaluateWeightTrend(isFirst, bbVal, prevWeight, ageMonths);
    }

    const lilaRed = !isNaN(lilaVal) && lilaVal > 0 && lilaVal < 11.5;
    
    let tbcCount = 0;
    if (visit.tbc_batuk) tbcCount++;
    if (visit.tbc_demam) tbcCount++;
    if (visit.tbc_bb_tidak_naik) tbcCount++;
    if (visit.tbc_kontak) tbcCount++;

    const ref = checkReferral({
      trendHistory: historyTrend as WeightTrend[],
      zscoreBBU: zbbu, zscoreTBU: ztbu, zscoreBBTB: zbbtb, zscoreLK: zlk,
      lilaUnderweight: lilaRed, tbcSymptomsCount: tbcCount,
      developmentIncomplete: checklist === 'Tidak Lengkap'
    });

    await db.kunjungan.where('local_uuid').equals(visit.local_uuid).modify({
      bb: isNaN(bbVal) ? visit.bb : bbVal,
      tb: isNaN(tbVal) ? visit.tb : tbVal,
      posisi_ukur: posisi,
      lingkar_kepala: isNaN(lkVal) ? visit.lingkar_kepala : lkVal,
      lila: isNaN(lilaVal) ? visit.lila : lilaVal,
      checklist_perkembangan: checklist,
      
      zbbu, status_bbu: getStatusBBU(zbbu),
      ztbu, status_tbu: getStatusTBU(ztbu),
      zbbtb, status_bbtb: getStatusBBTB(zbbtb),
      status_lk: zlk !== null ? getStatusLK(zlk) : visit.status_lk,
      status_lila: lilaRed ? 'Kurang (Pita Merah)' : 'Normal (Pita Hijau)',
      status_kenaikan_bb: trend as any,
      rujuk_puskesmas: ref.shouldRefer,
      
      sync_status: 'pending',
      updated_at: new Date().toISOString()
    });

    navigate(`/balita/${visit.balita_uuid}/riwayat`);
  };

  if (!visit) return <div className="p-4 text-center">Memuat...</div>;

  return (
    <div className="p-4 max-w-xl mx-auto pb-24 space-y-6">
      <h1 className="text-3xl font-bold text-primary">Edit Data Kunjungan</h1>
      <p className="text-ink-soft">Tanggal: {new Date(visit.tanggal_kunjungan).toLocaleDateString('id-ID')}</p>

      <div className="bg-surface p-4 rounded-xl border-2 border-line space-y-5">
        <div>
          <label className="block text-xl font-bold mb-2">Berat Badan (kg)</label>
          <input type="number" step="0.1" value={bb} onChange={e=>setBb(e.target.value)} className="w-full text-2xl p-4 border-2 border-line rounded-xl bg-paper" />
        </div>
        <div>
          <label className="block text-xl font-bold mb-2">Tinggi Badan (cm)</label>
          <input type="number" step="0.1" value={tb} onChange={e=>setTb(e.target.value)} className="w-full text-2xl p-4 border-2 border-line rounded-xl bg-paper" />
        </div>
        <div>
          <label className="block text-xl font-bold mb-2">Posisi Ukur</label>
          <select value={posisi} onChange={e=>setPosisi(e.target.value as any)} className="w-full text-xl p-4 border-2 border-line rounded-xl bg-paper">
            <option value="berbaring">Berbaring</option>
            <option value="berdiri">Berdiri</option>
          </select>
        </div>
        <div>
          <label className="block text-xl font-bold mb-2">Lingkar Kepala (cm)</label>
          <input type="number" step="0.1" value={lingkar} onChange={e=>setLingkar(e.target.value)} className="w-full text-xl p-4 border-2 border-line rounded-xl bg-paper" />
        </div>
        <div>
          <label className="block text-xl font-bold mb-2">LILA (cm)</label>
          <input type="number" step="0.1" value={lila} onChange={e=>setLila(e.target.value)} className="w-full text-xl p-4 border-2 border-line rounded-xl bg-paper" />
        </div>
        <div>
          <label className="block text-xl font-bold mb-2">Perkembangan</label>
          <select value={checklist} onChange={e=>setChecklist(e.target.value as any)} className="w-full text-xl p-4 border-2 border-line rounded-xl bg-paper">
            <option value="Lengkap">Lengkap</option>
            <option value="Tidak Lengkap">Tidak Lengkap</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <BigButton onClick={handleSave} variant="primary">Simpan & Hitung Ulang</BigButton>
        <BigButton onClick={() => navigate(-1)} variant="secondary">Batal</BigButton>
      </div>
    </div>
  );
}
