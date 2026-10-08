import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { updateDraftVisit } from '../../lib/wizard';
import type { KunjunganILP } from '../../db/types';
import { Stepper } from '../../components/Stepper';
import { BigButton } from '../../components/BigButton';

export default function Step4bCatatan() {
  const { balitaId } = useParams<{ balitaId: string }>();
  const navigate = useNavigate();

  const [visitId, setVisitId] = useState<string | null>(null);
  
  const [imunisasi, setImunisasi] = useState<string>('');
  const [pmt, setPmt] = useState<string>('');
  const [gejala, setGejala] = useState<string>('');
  const [edukasi, setEdukasi] = useState<string>('');

  const balita = useLiveQuery(() => db.balita.where('local_uuid').equals(balitaId!).first(), [balitaId]);

  useEffect(() => {
    if (balita) {
      const todayStr = new Date().toLocaleDateString('en-CA');
      db.kunjungan.where('balita_uuid').equals(balita.local_uuid).and(k => k.tanggal_kunjungan === todayStr).first().then(v => {
        if (v) {
          setVisitId(v.local_uuid);
          setImunisasi(v.imunisasi || '');
          setPmt(v.pmt_diterima || '');
          setGejala(v.ada_gejala_sakit || '');
          setEdukasi(v.edukasi || '');
        }
      });
    }
  }, [balita]);

  const handleNext = async () => {
    if (visitId) {
      await updateDraftVisit(visitId, { 
        imunisasi: imunisasi,
        pmt_diterima: pmt,
        ada_gejala_sakit: gejala,
        edukasi: edukasi
      } as Partial<KunjunganILP>);
    }
    navigate(`/timbang/${balitaId}/hasil`);
  };

  if (!balita || !visitId) return <div className="text-center p-4 text-xl">Memuat...</div>;

  return (
    <div className="pb-12">
      <Stepper currentStep={5} totalSteps={6} title="Catatan & Lain-lain" />

      <div className="space-y-6 mb-8">
        
        <div className="space-y-2">
          <label className="text-xl font-bold text-ink">Imunisasi (Opsional)</label>
          <input 
            type="text" 
            value={imunisasi} 
            onChange={(e) => setImunisasi(e.target.value)} 
            placeholder="Contoh: BCG, Polio 1"
            className="w-full p-4 text-xl rounded-xl border-2 border-line bg-surface focus:border-primary focus:outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xl font-bold text-ink">PMT Diterima (Opsional)</label>
          <input 
            type="text" 
            value={pmt} 
            onChange={(e) => setPmt(e.target.value)} 
            placeholder="Contoh: Biskuit, Telur"
            className="w-full p-4 text-xl rounded-xl border-2 border-line bg-surface focus:border-primary focus:outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xl font-bold text-ink">Gejala Sakit / Keluhan (Opsional)</label>
          <input 
            type="text" 
            value={gejala} 
            onChange={(e) => setGejala(e.target.value)} 
            placeholder="Contoh: Batuk pilek"
            className="w-full p-4 text-xl rounded-xl border-2 border-line bg-surface focus:border-primary focus:outline-none"
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-xl font-bold text-ink">Edukasi yang diberikan (Opsional)</label>
          <input 
            type="text" 
            value={edukasi} 
            onChange={(e) => setEdukasi(e.target.value)} 
            placeholder="Contoh: Kurangi manis"
            className="w-full p-4 text-xl rounded-xl border-2 border-line bg-surface focus:border-primary focus:outline-none"
          />
        </div>

      </div>

      <BigButton variant="primary" onClick={handleNext} fullWidth>
        Lihat Hasil Pengukuran
      </BigButton>
    </div>
  );
}
