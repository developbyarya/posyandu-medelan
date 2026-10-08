import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { getOrCreateDraftVisit, updateDraftVisit } from '../../lib/wizard';
import type { KunjunganILP } from '../../db/types';
import { Stepper } from '../../components/Stepper';
import { BigKeypad } from '../../components/BigKeypad';
import { BigButton } from '../../components/BigButton';
import { useStt } from '../../lib/voice/stt';
import { speak } from '../../lib/voice/tts';
import { parseNumberId } from '../../lib/voice/parseNumberId';

export default function Step1BB() {
  const { balitaId } = useParams<{ balitaId: string }>();
  const navigate = useNavigate();

  const [visitId, setVisitId] = useState<string | null>(null);
  const [bb, setBb] = useState<string>('');

  const balita = useLiveQuery(() => db.balita.where('local_uuid').equals(balitaId!).first(), [balitaId]);
  const stt = useStt();

  useEffect(() => {
    if (balita) {
      getOrCreateDraftVisit(balita.local_uuid).then(v => {
        setVisitId(v.local_uuid);
        if (v.bb !== undefined) {
          setBb(v.bb.toString());
        } else {
          // Play TTS prompt only if weight hasn't been filled
          speak(`Berapa berat badan ${balita.nama_balita} dalam kilogram?`);
        }
      });
    }
  }, [balita]);

  useEffect(() => {
    if (stt.transcript) {
      const parsed = parseNumberId(stt.transcript);
      if (parsed !== null) {
        setTimeout(() => setBb(parsed.toString()), 0);
      }
    }
  }, [stt.transcript]);

  const handleNext = async () => {
    if (!bb) {
      alert('Masukkan berat badan!');
      return;
    }
    
    const bbNum = parseFloat(bb);
    if (bbNum < 1 || bbNum > 40) {
      const confirm = window.confirm(`Berat badan tercatat ${bbNum} kg. Apakah Anda yakin ini benar?`);
      if (!confirm) return;
    }

    if (visitId) {
      await updateDraftVisit(visitId, { bb: bbNum } as Partial<KunjunganILP>);
    }
    navigate(`/timbang/${balitaId}/tb`);
  };

  if (!balita || !visitId) return <div className="text-center p-4 text-xl">Memuat...</div>;

  return (
    <div>
      <Stepper currentStep={1} totalSteps={6} title="Berat Badan (BB)" />

      <div className="mb-6 space-y-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="block text-2xl font-bold text-ink">
              Berat Badan <span className="text-primary">{balita.nama_balita}</span>
            </label>
            <button 
              onClick={() => speak(`Berapa berat badan ${balita.nama_balita} dalam kilogram?`)}
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
              value={bb ? `${bb} kg` : ''}
              className="flex-1 w-full text-4xl sm:text-5xl p-4 sm:p-6 font-bold border-4 border-line rounded-xl bg-surface text-center outline-none"
              placeholder="0.0 kg"
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

        <BigKeypad value={bb} onChange={setBb} allowDecimal={true} />
      </div>

      <BigButton variant="primary" onClick={handleNext} fullWidth>
        Lanjut ke Tinggi Badan
      </BigButton>
    </div>
  );
}
