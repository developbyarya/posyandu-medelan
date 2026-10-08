import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { updateDraftVisit } from '../../lib/wizard';
import type { KunjunganILP } from '../../db/types';
import { Stepper } from '../../components/Stepper';
import { BigButton } from '../../components/BigButton';

const Toggle = ({ label, value, onChange }: { label: string, value: boolean, onChange: (v: boolean) => void }) => (
  <div className="flex justify-between items-center bg-surface p-4 rounded-xl border border-line">
    <span className="text-xl font-bold text-ink flex-1">{label}</span>
    <div className="flex gap-2">
      <button 
        onClick={() => onChange(true)}
        className={`px-5 py-3 text-lg font-bold rounded-lg border-2 ${value ? 'bg-primary text-white border-primary' : 'bg-paper text-ink border-line'}`}
      >Ya</button>
      <button 
        onClick={() => onChange(false)}
        className={`px-5 py-3 text-lg font-bold rounded-lg border-2 ${!value ? 'bg-danger text-white border-danger' : 'bg-paper text-ink border-line'}`}
      >Tdk</button>
    </div>
  </div>
);

export default function Step4Skrining() {
  const { balitaId } = useParams<{ balitaId: string }>();
  const navigate = useNavigate();

  const [visitId, setVisitId] = useState<string | null>(null);
  
  const [devLengkap, setDevLengkap] = useState<boolean>(true);
  
  const [tbc1, setTbc1] = useState<boolean>(false);
  const [tbc2, setTbc2] = useState<boolean>(false);
  const [tbc3, setTbc3] = useState<boolean>(false);
  const [tbc4, setTbc4] = useState<boolean>(false);
  
  const [asi, setAsi] = useState<boolean>(false);
  const [vitA, setVitA] = useState<boolean>(false);
  const [obatCacing, setObatCacing] = useState<boolean>(false);

  const balita = useLiveQuery(() => db.balita.where('local_uuid').equals(balitaId!).first(), [balitaId]);

  useEffect(() => {
    if (balita) {
      const todayStr = new Date().toLocaleDateString('en-CA');
      db.kunjungan.where('balita_uuid').equals(balita.local_uuid).and(k => k.tanggal_kunjungan === todayStr).first().then(v => {
        if (v) {
          setVisitId(v.local_uuid);
          setDevLengkap(v.checklist_perkembangan === 'Lengkap');
          setTbc1(v.tbc_batuk ?? false);
          setTbc2(v.tbc_demam ?? false);
          setTbc3(v.tbc_bb_tidak_naik ?? false);
          setTbc4(v.tbc_kontak ?? false);
          setAsi(v.asi_eksklusif ?? false);
          setVitA(v.vitamin_a ?? false);
          setObatCacing(v.obat_cacing ?? false);
        }
      });
    }
  }, [balita]);

  const handleNext = async () => {
    if (visitId) {
      await updateDraftVisit(visitId, { 
        checklist_perkembangan: devLengkap ? 'Lengkap' : 'Tidak Lengkap',
        tbc_batuk: tbc1,
        tbc_demam: tbc2,
        tbc_bb_tidak_naik: tbc3,
        tbc_kontak: tbc4,
        asi_eksklusif: asi,
        vitamin_a: vitA,
        obat_cacing: obatCacing
      } as Partial<KunjunganILP>); // using `as any` or fixing Partial<KunjunganILP> usage
    }
    navigate(`/timbang/${balitaId}/catatan`);
  };



  if (!balita || !visitId) return <div className="text-center p-4 text-xl">Memuat...</div>;

  return (
    <div>
      <Stepper currentStep={4} totalSteps={6} title="Skrining Kesehatan" />

      <div className="space-y-6 mb-6">
        
        {/* Perkembangan */}
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-ink bg-line px-3 py-1 rounded inline-block mb-2">Buku KIA: Perkembangan</h3>
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => setDevLengkap(true)}
              className={`p-4 rounded-xl border-4 text-left ${devLengkap ? 'border-ok bg-ok-soft text-ok-ink' : 'border-line bg-surface'}`}
            >
              <p className="text-xl font-bold">Lengkap / Sesuai Umur</p>
            </button>
            <button 
              onClick={() => setDevLengkap(false)}
              className={`p-4 rounded-xl border-4 text-left ${!devLengkap ? 'border-warn bg-warn-soft text-warn-ink' : 'border-line bg-surface'}`}
            >
              <p className="text-xl font-bold">Tidak Lengkap / Belum Sesuai</p>
            </button>
          </div>
        </div>

        {/* TBC */}
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-ink bg-line px-3 py-1 rounded inline-block mb-2">Skrining Gejala TBC</h3>
          <Toggle label="Batuk ≥ 2 minggu?" value={tbc1} onChange={setTbc1} />
          <Toggle label="Demam ≥ 2 minggu?" value={tbc2} onChange={setTbc2} />
          <Toggle label="BB turun/tetap 2 bln?" value={tbc3} onChange={setTbc3} />
          <Toggle label="Kontak pasien TBC?" value={tbc4} onChange={setTbc4} />
        </div>

        {/* Nutrisi */}
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-ink bg-line px-3 py-1 rounded inline-block mb-2">Nutrisi & Suplementasi</h3>
          <Toggle label="ASI Eksklusif (<6 bln)?" value={asi} onChange={setAsi} />
          <Toggle label="Dapat Vitamin A?" value={vitA} onChange={setVitA} />
          <Toggle label="Dapat Obat Cacing?" value={obatCacing} onChange={setObatCacing} />
        </div>

      </div>

      <BigButton variant="primary" onClick={handleNext} fullWidth>
        Lanjut ke Catatan
      </BigButton>
    </div>
  );
}
