import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { finishVisit } from '../../lib/wizard';
import { Stepper } from '../../components/Stepper';
import { BigButton } from '../../components/BigButton';

import {
  calculateBBU, getStatusBBU,
  calculateTBU, getStatusTBU,
  calculateBBPB, calculateBBTB, getStatusBBTB,
  calculateLK, getStatusLK
} from '../../lib/zscore';

import { evaluateWeightTrend, checkReferral, type WeightTrend } from '../../lib/growth';
import type { StatusKenaikanBB, KunjunganILP } from '../../db/types';
import { generateKartuPdf } from '../../lib/pdf/generateKartu';

function getAgeMonths(dobStr: string, visitDateStr: string): number {
  const dob = new Date(dobStr);
  const visit = new Date(visitDateStr);
  const months = (visit.getFullYear() - dob.getFullYear()) * 12 + (visit.getMonth() - dob.getMonth());
  return months;
}

export default function Step5Hasil() {
  const { balitaId } = useParams<{ balitaId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [hasil, setHasil] = useState<Partial<KunjunganILP> | null>(null);
  const [referral, setReferral] = useState<{shouldRefer: boolean, reasons: string[]} | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const balita = useLiveQuery(() => db.balita.where('local_uuid').equals(balitaId!).first(), [balitaId]);
  const todayStr = new Date().toLocaleDateString('en-CA');
  const visit = useLiveQuery(() => db.kunjungan.where('balita_uuid').equals(balitaId!).and(k => k.tanggal_kunjungan === todayStr).first(), [balitaId]);

  useEffect(() => {
    if (balita && visit && loading) {
      async function calc() {
        try {
          // Calculate age
          const ageMonths = getAgeMonths(balita!.tanggal_lahir, visit!.tanggal_kunjungan);

          // Get previous visits
          const allVisits = await db.kunjungan
            .where('balita_uuid')
            .equals(balita!.local_uuid)
            .sortBy('tanggal_kunjungan');

          const previousVisits = allVisits.filter(v => v.tanggal_kunjungan < visit!.tanggal_kunjungan);
          const lastVisit = previousVisits.length > 0 ? previousVisits[previousVisits.length - 1] : null;

          // Compute Z-Scores
          const gender = balita!.jenis_kelamin;
          
          let zbbu = 0, ztbu = 0, zbbtb = 0, zlk = null;
          
          if (visit!.bb !== undefined) {
            zbbu = calculateBBU(gender, ageMonths, visit!.bb);
          }
          if (visit!.tb !== undefined) {
            ztbu = calculateTBU(gender, ageMonths, visit!.tb);
          }
          if (visit!.bb !== undefined && visit!.tb !== undefined) {
            if (ageMonths < 24 || visit!.posisi_ukur === 'berbaring') {
              let adjustedLength = visit!.tb;
              if (ageMonths >= 24 && visit!.posisi_ukur === 'berbaring') {
                adjustedLength -= 0.7; // Koreksi
              } else if (ageMonths < 24 && visit!.posisi_ukur === 'berdiri') {
                adjustedLength += 0.7; // Koreksi
              }
              zbbtb = calculateBBPB(gender, adjustedLength, visit!.bb);
            } else {
              const adjustedHeight = visit!.tb;
              zbbtb = calculateBBTB(gender, adjustedHeight, visit!.bb);
            }
          }

          if (visit!.lingkar_kepala !== undefined && visit!.lingkar_kepala > 0) {
            zlk = calculateLK(gender, ageMonths, visit!.lingkar_kepala);
          }

          // Evaluate weight trend
          const historyTrend = previousVisits.map(v => v.status_kenaikan_bb).filter(Boolean) as string[];
          let trend: StatusKenaikanBB = 'B';
          
          if (visit!.bb !== undefined) {
            const isFirstTime = previousVisits.length === 0;
            const prevWeight = lastVisit?.bb || null;
            const evalTrend = evaluateWeightTrend(isFirstTime, visit!.bb, prevWeight, ageMonths);
            trend = evalTrend as StatusKenaikanBB;
          }

          // Generate referral
          const lilaRed = visit!.lila !== undefined && visit!.lila < 11.5;
          let tbcSymptomsCount = 0;
          if (visit!.tbc_batuk) tbcSymptomsCount++;
          if (visit!.tbc_demam) tbcSymptomsCount++;
          if (visit!.tbc_bb_tidak_naik) tbcSymptomsCount++;
          if (visit!.tbc_kontak) tbcSymptomsCount++;

          const ref = checkReferral({
            trendHistory: historyTrend as WeightTrend[],
            zscoreBBU: zbbu,
            zscoreTBU: ztbu,
            zscoreBBTB: zbbtb,
            zscoreLK: zlk,
            lilaUnderweight: lilaRed,
            tbcSymptomsCount,
            developmentIncomplete: visit!.checklist_perkembangan === 'Tidak Lengkap'
          });

          // Build final updates
          const updates = {
            umur_bulan: ageMonths,
            zbbu: zbbu,
            status_bbu: getStatusBBU(zbbu),
            ztbu: ztbu,
            status_tbu: getStatusTBU(ztbu),
            zbbtb: zbbtb,
            status_bbtb: getStatusBBTB(zbbtb),
            status_lk: zlk !== null ? getStatusLK(zlk) : undefined,
            status_lila: lilaRed ? 'Kurang (Pita Merah)' : 'Normal (Pita Hijau)',
            status_kenaikan_bb: trend,
            rujuk_puskesmas: ref.shouldRefer
          };

          // Save to draft for now (so it's saved before we complete it)
          await db.kunjungan.where('local_uuid').equals(visit!.local_uuid).modify(updates as Partial<KunjunganILP>);

          setHasil(updates);
          setReferral(ref);
          setLoading(false);

        } catch (e) {
          console.error("Error calculating results", e);
          setLoading(false);
        }
      }
      calc();
    }
  }, [balita, visit, loading]);

  const handleFinish = async () => {
    if (visit) {
      await finishVisit(visit.local_uuid);
      navigate('/');
    }
  };

  const handleFinishAndPrint = async () => {
    if (visit && balita) {
      try {
        setIsGeneratingPdf(true);
        await finishVisit(visit.local_uuid);
        
        // Fetch all completed visits for the PDF
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
        
        // cleanup
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
        
        navigate('/');
      } catch (err) {
        console.error("Error generating PDF:", err);
        alert("Gagal membuat PDF. Silakan coba lagi.");
      } finally {
        setIsGeneratingPdf(false);
      }
    }
  };

  if (loading || !hasil) return <div className="text-center p-4 text-xl">Menghitung...</div>;

  return (
    <div className="pb-12">
      <Stepper currentStep={6} totalSteps={6} title="Hasil & Kesimpulan" />

      <div className="space-y-6 mb-8">
        
        {/* Rujukan Alert */}
        {referral?.shouldRefer && (
          <div className="bg-danger-soft border-l-8 border-danger p-4 rounded-r-xl">
            <h3 className="text-2xl font-bold text-danger-ink flex items-center gap-2 mb-2">
              ⚠️ PERHATIAN: RUJUK KE PUSKESMAS / BIDAN
            </h3>
            <ul className="list-disc pl-6 text-lg font-bold text-danger-ink">
              {referral.reasons.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        )}

        <div className="bg-surface p-4 rounded-xl border border-line space-y-4">
          <div>
            <p className="text-ink-soft">Status Berat Badan (BB/U)</p>
            <p className="text-2xl font-bold">{hasil.status_bbu} <span className="text-lg font-normal text-ink-soft">({hasil.zbbu?.toFixed(2) ?? '-'} SD)</span></p>
          </div>
          <div>
            <p className="text-ink-soft">Status Tinggi Badan (TB/U)</p>
            <p className="text-2xl font-bold">{hasil.status_tbu} <span className="text-lg font-normal text-ink-soft">({hasil.ztbu?.toFixed(2) ?? '-'} SD)</span></p>
          </div>
          <div>
            <p className="text-ink-soft">Status Gizi (BB/TB)</p>
            <p className="text-2xl font-bold">{hasil.status_bbtb} <span className="text-lg font-normal text-ink-soft">({hasil.zbbtb?.toFixed(2) ?? '-'} SD)</span></p>
          </div>
          <div>
            <p className="text-ink-soft">Kenaikan BB Bulan Ini</p>
            <p className="text-2xl font-bold">{
              hasil.status_kenaikan_bb === 'N' ? 'Naik (N)' :
              hasil.status_kenaikan_bb === 'T' ? 'Tidak Naik (T)' :
              hasil.status_kenaikan_bb === 'B' ? 'Pertama Kali (B)' : 'Belum Ditimbang (-)'
            }</p>
          </div>
        </div>

      </div>

      <div className="space-y-4">
        <BigButton variant="primary" onClick={handleFinishAndPrint} disabled={isGeneratingPdf} fullWidth>
          {isGeneratingPdf ? 'Membuat PDF...' : 'Selesai, Simpan & Cetak PDF'}
        </BigButton>
        <BigButton variant="secondary" onClick={handleFinish} disabled={isGeneratingPdf} fullWidth>
          Selesai Tanpa Cetak
        </BigButton>
      </div>
    </div>
  );
}
