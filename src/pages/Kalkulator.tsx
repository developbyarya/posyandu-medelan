import { useState } from 'react';
import { calculateBBU, calculateTBU, calculateBBPB, calculateBBTB, calculateLK, getStatusBBU, getStatusTBU, getStatusBBTB, getStatusLK, type Gender } from '../lib/zscore';
import { BigButton } from '../components/BigButton';
import { StatusBadge } from '../components/StatusBadge';

export default function KalkulatorBebas() {
  const [gender, setGender] = useState<Gender>('L');
  const [ageMonths, setAgeMonths] = useState<number | ''>('');
  const [weight, setWeight] = useState<number | ''>('');
  const [height, setHeight] = useState<number | ''>('');
  const [hc, setHc] = useState<number | ''>('');
  const [measureMethod, setMeasureMethod] = useState<'PB' | 'TB'>('PB');

  let results: any = null;

  if (ageMonths !== '' && weight !== '' && height !== '') {
    const age = Number(ageMonths);
    const w = Number(weight);
    const h = Number(height);
    
    // Convert PB/TB if necessary based on age
    let adjustedHeightForZScore = h;
    let bbtbMethod: 'PB' | 'TB' = age < 24 ? 'PB' : 'TB';
    
    if (age < 24) {
      bbtbMethod = 'PB';
      if (measureMethod === 'TB') adjustedHeightForZScore += 0.7;
    } else {
      bbtbMethod = 'TB';
      if (measureMethod === 'PB') adjustedHeightForZScore -= 0.7;
    }

    const zBBU = calculateBBU(gender, age, w);
    const zTBU = calculateTBU(gender, age, adjustedHeightForZScore);
    const zBBTB = bbtbMethod === 'PB' 
      ? calculateBBPB(gender, adjustedHeightForZScore, w)
      : calculateBBTB(gender, adjustedHeightForZScore, w);
      
    let zLK = null;
    if (hc !== '') {
      zLK = calculateLK(gender, age, Number(hc));
    }

    results = {
      zBBU, zTBU, zBBTB, zLK,
      statusBBU: getStatusBBU(zBBU),
      statusTBU: getStatusTBU(zTBU),
      statusBBTB: getStatusBBTB(zBBTB),
      statusLK: zLK !== null ? getStatusLK(zLK) : null
    };
  }

  // Helper for color based on Z-score
  const getBadgeType = (z: number, indicator: string): 'ok' | 'warn' | 'danger' => {
    if (indicator === 'BBU' || indicator === 'TBU') {
      if (z < -2) return 'danger';
      if (z > 2) return 'warn';
      return 'ok';
    }
    if (indicator === 'BBTB') {
      if (z < -2 || z > 2) return 'danger';
      if (z > 1) return 'warn'; // risiko gizi lebih
      return 'ok';
    }
    if (indicator === 'LK') {
      if (z < -2 || z > 2) return 'danger';
      return 'ok';
    }
    return 'ok';
  };

  return (
    <div className="p-4 max-w-xl mx-auto pb-24">
      <h1 className="text-3xl font-bold mb-6 text-primary">Kalkulator Z-Score WHO</h1>
      <p className="text-ink-soft mb-6">
        Kalkulator bebas berdasarkan standar Permenkes No. 2 Tahun 2020.
      </p>

      <div className="space-y-6 bg-surface p-4 rounded-xl shadow-sm border border-line">
        
        {/* Gender */}
        <div>
          <label className="block text-xl font-bold mb-3 text-ink">Jenis Kelamin</label>
          <div className="flex gap-4">
            <button 
              onClick={() => setGender('L')}
              className={`flex-1 py-4 text-xl font-bold rounded-xl border-2 transition-colors ${gender === 'L' ? 'bg-primary text-on-primary border-primary' : 'bg-paper text-ink border-line'}`}
            >
              Laki-laki
            </button>
            <button 
              onClick={() => setGender('P')}
              className={`flex-1 py-4 text-xl font-bold rounded-xl border-2 transition-colors ${gender === 'P' ? 'bg-primary text-on-primary border-primary' : 'bg-paper text-ink border-line'}`}
            >
              Perempuan
            </button>
          </div>
        </div>

        {/* Umur */}
        <div>
          <label className="block text-xl font-bold mb-2 text-ink">Umur (Bulan)</label>
          <input 
            type="number" 
            value={ageMonths}
            onChange={(e) => setAgeMonths(e.target.value ? Number(e.target.value) : '')}
            className="w-full text-3xl p-4 font-bold border-2 border-line rounded-xl bg-paper"
            placeholder="Misal: 12"
          />
        </div>

        {/* Berat Badan */}
        <div>
          <label className="block text-xl font-bold mb-2 text-ink">Berat Badan (kg)</label>
          <input 
            type="number" step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value ? Number(e.target.value) : '')}
            className="w-full text-3xl p-4 font-bold border-2 border-line rounded-xl bg-paper"
            placeholder="Misal: 8.5"
          />
        </div>

        {/* Tinggi Badan */}
        <div>
          <label className="block text-xl font-bold mb-2 text-ink">Tinggi / Panjang Badan (cm)</label>
          <div className="flex gap-2 mb-3">
            <button 
              onClick={() => setMeasureMethod('PB')}
              className={`flex-1 py-2 text-lg font-bold rounded-lg border-2 ${measureMethod === 'PB' ? 'bg-ink text-paper border-ink' : 'bg-paper text-ink border-line'}`}
            >
              Telentang (PB)
            </button>
            <button 
              onClick={() => setMeasureMethod('TB')}
              className={`flex-1 py-2 text-lg font-bold rounded-lg border-2 ${measureMethod === 'TB' ? 'bg-ink text-paper border-ink' : 'bg-paper text-ink border-line'}`}
            >
              Berdiri (TB)
            </button>
          </div>
          <input 
            type="number" step="0.1"
            value={height}
            onChange={(e) => setHeight(e.target.value ? Number(e.target.value) : '')}
            className="w-full text-3xl p-4 font-bold border-2 border-line rounded-xl bg-paper"
            placeholder="Misal: 75.4"
          />
        </div>

        {/* Lingkar Kepala */}
        <div>
          <label className="block text-xl font-bold mb-2 text-ink">Lingkar Kepala (cm) - <span className="font-normal text-lg">Opsional</span></label>
          <input 
            type="number" step="0.1"
            value={hc}
            onChange={(e) => setHc(e.target.value ? Number(e.target.value) : '')}
            className="w-full text-3xl p-4 font-bold border-2 border-line rounded-xl bg-paper"
            placeholder="Misal: 45.0"
          />
        </div>

      </div>

      {/* Hasil */}
      {results && (
        <div className="mt-8 space-y-4">
          <h2 className="text-2xl font-bold text-ink border-b-2 border-line pb-2">Hasil Kalkulasi</h2>
          
          <div className="bg-paper p-4 rounded-xl border border-line shadow-sm space-y-4">
            
            <div>
              <p className="text-sm font-bold text-ink-soft uppercase tracking-wider mb-1">Berat Badan per Umur (BB/U)</p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-ink">Z: {results.zBBU.toFixed(2)} SD</span>
                <StatusBadge tone={getBadgeType(results.zBBU, 'BBU')}>{results.statusBBU}</StatusBadge>
              </div>
            </div>

            <hr className="border-line" />

            <div>
              <p className="text-sm font-bold text-ink-soft uppercase tracking-wider mb-1">Tinggi Badan per Umur (TB/U)</p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-ink">Z: {results.zTBU.toFixed(2)} SD</span>
                <StatusBadge tone={getBadgeType(results.zTBU, 'TBU')}>{results.statusTBU}</StatusBadge>
              </div>
            </div>

            <hr className="border-line" />

            <div>
              <p className="text-sm font-bold text-ink-soft uppercase tracking-wider mb-1">Berat per Tinggi Badan (BB/TB)</p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-ink">Z: {results.zBBTB.toFixed(2)} SD</span>
                <StatusBadge tone={getBadgeType(results.zBBTB, 'BBTB')}>{results.statusBBTB}</StatusBadge>
              </div>
            </div>

            {results.zLK !== null && (
              <>
                <hr className="border-line" />
                <div>
                  <p className="text-sm font-bold text-ink-soft uppercase tracking-wider mb-1">Lingkar Kepala per Umur</p>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-ink">Z: {results.zLK.toFixed(2)} SD</span>
                    <StatusBadge tone={getBadgeType(results.zLK, 'LK')}>{results.statusLK}</StatusBadge>
                  </div>
                </div>
              </>
            )}

          </div>
        </div>
      )}
      
      {!results && (
        <div className="mt-8 bg-warn-soft p-4 rounded-xl border border-warn">
          <p className="text-warn-ink font-bold text-lg text-center">Isi form di atas secara lengkap untuk melihat hasil Z-Score.</p>
        </div>
      )}

      <div className="mt-8">
        <BigButton onClick={() => window.history.back()} variant="secondary">
          Kembali
        </BigButton>
      </div>

    </div>
  );
}
