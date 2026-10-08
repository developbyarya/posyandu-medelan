import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { updateDraftVisit } from '../../lib/wizard';
import { Stepper } from '../../components/Stepper';
import { BigKeypad } from '../../components/BigKeypad';
import { BigButton } from '../../components/BigButton';
import { useStt } from '../../lib/voice/stt';
import { speak } from '../../lib/voice/tts';
import { parseNumberId } from '../../lib/voice/parseNumberId';

export default function Step3Lingkar() {
  const { balitaId } = useParams<{ balitaId: string }>();
  const navigate = useNavigate();

  const [visitId, setVisitId] = useState<string | null>(null);
  
  // We use string for keypad
  const [activeInput, setActiveInput] = useState<'lk' | 'lila'>('lk');
  const [lk, setLk] = useState<string>('');
  const [lila, setLila] = useState<string>('');

  const balita = useLiveQuery(() => db.balita.where('local_uuid').equals(balitaId!).first(), [balitaId]);
  const stt = useStt();

  const getSpeakText = (type: 'lk' | 'lila') => {
    if (!balita) return '';
    return type === 'lk' 
      ? `Berapa lingkar kepala ${balita.nama_balita} dalam sentimeter?` 
      : `Berapa lingkar lengan atas ${balita.nama_balita} dalam sentimeter?`;
  };

  useEffect(() => {
    if (balita) {
      const todayStr = new Date().toLocaleDateString('en-CA');
      db.kunjungan.where('balita_uuid').equals(balita.local_uuid).and(k => k.tanggal_kunjungan === todayStr).first().then(v => {
        if (v) {
          setVisitId(v.local_uuid);
          if (v.lingkar_kepala !== undefined) {
            setLk(v.lingkar_kepala.toString());
          } else {
            speak(getSpeakText('lk'));
          }
          if (v.lila !== undefined) setLila(v.lila.toString());
        }
      });
    }
  }, [balita]);

  useEffect(() => {
    if (stt.transcript) {
      const parsed = parseNumberId(stt.transcript);
      if (parsed !== null) {
        setTimeout(() => {
          if (activeInput === 'lk') setLk(parsed.toString());
          else setLila(parsed.toString());
        }, 0);
      }
    }
  }, [stt.transcript, activeInput]);

  const handleNext = async () => {
    if (visitId) {
      await updateDraftVisit(visitId, { 
        lingkar_kepala: lk ? parseFloat(lk) : undefined,
        lila: lila ? parseFloat(lila) : undefined
      });
    }
    navigate(`/timbang/${balitaId}/skrining`);
  };

  if (!balita || !visitId) return <div className="text-center p-4 text-xl">Memuat...</div>;

  return (
    <div>
      <Stepper currentStep={3} totalSteps={6} title="Lingkar Kepala & LILA" />

      <div className="mb-6 space-y-4">
        <p className="text-ink-soft text-lg font-bold bg-warn-soft p-3 rounded-lg border border-warn text-warn-ink">
          Tahap ini opsional (bisa dilewati jika tidak diukur).
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div 
            onClick={() => setActiveInput('lk')}
            className={`p-4 rounded-xl border-4 text-center cursor-pointer transition-colors ${activeInput === 'lk' ? 'border-primary bg-primary/10' : 'border-line bg-surface'}`}
          >
            <p className="font-bold text-ink mb-2">Lingkar Kepala</p>
            <p className="text-3xl font-bold text-primary">{lk ? `${lk} cm` : '-'}</p>
          </div>
          
          <div 
            onClick={() => setActiveInput('lila')}
            className={`p-4 rounded-xl border-4 text-center cursor-pointer transition-colors ${activeInput === 'lila' ? 'border-primary bg-primary/10' : 'border-line bg-surface'}`}
          >
            <p className="font-bold text-ink mb-2">LILA</p>
            <p className="text-3xl font-bold text-primary">{lila ? `${lila} cm` : '-'}</p>
          </div>
        </div>

        <div className="flex items-center justify-between bg-surface p-3 rounded-xl border-2 border-line">
          <button 
            onClick={() => speak(getSpeakText(activeInput))}
            className="px-3 py-2 text-ink-soft bg-paper border-2 border-line rounded-lg font-bold flex items-center gap-2 active:bg-line"
            title="Ulangi Pertanyaan"
          >
            <span className="text-xl">🔊</span> Ulang
          </button>
          
          <button 
            onClick={stt.isListening ? stt.stopListening : stt.startListening}
            disabled={!stt.isSupported || !stt.isOnline}
            className={`px-6 py-2 rounded-lg border-2 font-bold flex items-center gap-2 transition-colors ${
              stt.isListening 
                ? 'bg-danger text-white border-danger-ink animate-pulse' 
                : stt.isSupported && stt.isOnline
                  ? 'bg-primary text-white border-primary-strong'
                  : 'bg-surface text-line border-line'
            }`}
            title="Gunakan Suara"
          >
            <span className="text-2xl">🎙️</span>
            {stt.isListening ? 'Mendengarkan...' : 'Gunakan Suara'}
          </button>
        </div>

        {stt.error && (
          <p className="text-danger-ink bg-danger-soft p-3 rounded-lg font-bold border border-danger">
            {stt.error}
          </p>
        )}

        <BigKeypad 
          value={activeInput === 'lk' ? lk : lila} 
          onChange={val => activeInput === 'lk' ? setLk(val) : setLila(val)} 
          allowDecimal={true} 
        />
      </div>

      <div className="flex flex-col gap-3">
        <BigButton variant="primary" onClick={handleNext} fullWidth>
          Lanjut ke Skrining
        </BigButton>
        <BigButton variant="secondary" onClick={handleNext} fullWidth>
          Lewati Tahap Ini
        </BigButton>
      </div>
    </div>
  );
}
