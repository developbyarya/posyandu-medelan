import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { updateDraftVisit } from '../../lib/wizard';
import type { KunjunganILP } from '../../db/types';
import { Stepper } from '../../components/Stepper';
import { BigKeypad } from '../../components/BigKeypad';
import { BigButton } from '../../components/BigButton';
import { useStt } from '../../lib/voice/stt';
import { speak } from '../../lib/voice/tts';
import { parseNumberId } from '../../lib/voice/parseNumberId';

export default function Step2TB() {
  const { balitaId } = useParams<{ balitaId: string }>();
  const navigate = useNavigate();

  const [visitId, setVisitId] = useState<string | null>(null);
  const [tb, setTb] = useState<string>('');
  const [posisi, setPosisi] = useState<'berbaring' | 'berdiri'>('berbaring');

  const balita = useLiveQuery(() => db.balita.where('local_uuid').equals(balitaId!).first(), [balitaId]);
  const stt = useStt();

  useEffect(() => {
    if (balita) {
      const todayStr = new Date().toLocaleDateString('en-CA');
      db.kunjungan.where('balita_uuid').equals(balita.local_uuid).and(k => k.tanggal_kunjungan === todayStr).first().then(v => {
        if (v) {
          setVisitId(v.local_uuid);
          if (v.tb !== undefined) {
            setTb(v.tb.toString());
          } else {
            speak(`Berapa tinggi badan ${balita.nama_balita} dalam sentimeter?`);
          }
          if (v.posisi_ukur) setPosisi(v.posisi_ukur);
          else {
            // Default posisi: < 24 bulan = telentang, >= 24 = berdiri
            // Kita butuh fungsi umur, tapi bisa diestimasi kasar.
            const dob = new Date(balita.tanggal_lahir);
            const now = new Date();
            const months = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
            if (months >= 24) setPosisi('berdiri');
          }
        }
      });
    }
  }, [balita]);

  useEffect(() => {
    if (stt.transcript) {
      const parsed = parseNumberId(stt.transcript);
      if (parsed !== null) {
        setTimeout(() => setTb(parsed.toString()), 0);
      }
    }
  }, [stt.transcript]);

  const handleNext = async () => {
    if (!tb) {
      alert('Masukkan tinggi badan!');
      return;
    }
    
    const tbNum = parseFloat(tb);
    if (tbNum < 30 || tbNum > 130) {
      const confirm = window.confirm(`Tinggi/Panjang tercatat ${tbNum} cm. Yakin?`);
      if (!confirm) return;
    }

    if (visitId) {
      await updateDraftVisit(visitId, { tb: tbNum, posisi_ukur: posisi } as Partial<KunjunganILP>);
    }
    navigate(`/timbang/${balitaId}/lingkar`);
  };

  if (!balita || !visitId) return <div className="text-center p-4 text-xl">Memuat...</div>;

  return (
    <div>
      <Stepper currentStep={2} totalSteps={6} title="Tinggi / Panjang Badan" />

      <div className="mb-6 space-y-4">
        
        <div className="flex bg-surface p-2 rounded-xl border-2 border-line">
          <button 
            onClick={() => setPosisi('berbaring')}
            className={`flex-1 py-3 text-xl font-bold rounded-lg transition-colors ${posisi === 'berbaring' ? 'bg-primary text-on-primary' : 'bg-transparent text-ink-soft'}`}
          >
            Telentang (PB)
          </button>
          <button 
            onClick={() => setPosisi('berdiri')}
            className={`flex-1 py-3 text-xl font-bold rounded-lg transition-colors ${posisi === 'berdiri' ? 'bg-primary text-on-primary' : 'bg-transparent text-ink-soft'}`}
          >
            Berdiri (TB)
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="block text-2xl font-bold text-ink">
              Tinggi Badan
            </label>
            <button 
              onClick={() => speak(`Berapa tinggi badan ${balita.nama_balita} dalam sentimeter?`)}
              className="px-3 py-2 text-ink-soft bg-surface border-2 border-line rounded-lg font-bold flex items-center gap-2 active:bg-line"
              title="Ulangi Pertanyaan"
            >
              <span className="text-xl">🔊</span> Ulang
            </button>
          </div>

          <div className="flex items-center gap-3">
            <input 
              type="text" 
              readOnly
              value={tb ? `${tb} cm` : ''}
              className="flex-1 w-full text-4xl sm:text-5xl p-4 sm:p-6 font-bold border-4 border-line rounded-xl bg-surface text-center outline-none"
              placeholder="0.0 cm"
            />
            
            <button 
              onClick={stt.isListening ? stt.stopListening : stt.startListening}
              disabled={!stt.isSupported || !stt.isOnline}
              className={`shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 flex items-center justify-center transition-colors ${
                stt.isListening 
                  ? 'bg-danger text-white border-danger-ink animate-pulse' 
                  : stt.isSupported && stt.isOnline
                    ? 'bg-primary text-white border-primary-strong'
                    : 'bg-surface text-line border-line'
              }`}
              title="Gunakan Suara"
            >
              <span className="text-3xl sm:text-4xl">🎙️</span>
            </button>
          </div>
        </div>
        
        {stt.error && (
          <p className="text-danger-ink bg-danger-soft p-3 rounded-lg font-bold border border-danger">
            {stt.error}
          </p>
        )}
        
        <BigKeypad value={tb} onChange={setTb} allowDecimal={true} />
      </div>

      <BigButton variant="primary" onClick={handleNext} fullWidth>
        Lanjut ke Lingkar Kepala & LILA
      </BigButton>
    </div>
  );
}
