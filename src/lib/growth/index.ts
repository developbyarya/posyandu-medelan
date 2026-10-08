/**
 * Minimum Weight Gain / Kenaikan Berat Badan Minimal (KBM) dalam Kg.
 * Sumber: Buku KIA / KMS Permenkes 2/2020.
 *
 * Catatan: Umur di sini merujuk pada umur anak SAAT penimbangan (dalam bulan bulat).
 * Misal, KBM umur 1 bulan = kenaikan dari 0 ke 1 bulan adalah 800g (0.8 kg).
 */
export function getKBM(ageMonths: number): number {
  if (ageMonths <= 1) return 0.8; // 800g
  if (ageMonths === 2) return 0.9; // 900g
  if (ageMonths === 3) return 0.8; // 800g
  if (ageMonths === 4) return 0.6; // 600g
  if (ageMonths === 5) return 0.5; // 500g
  if (ageMonths === 6) return 0.4; // 400g
  if (ageMonths >= 7 && ageMonths <= 10) return 0.3; // 300g
  // 11 - 60+ bulan
  return 0.2; // 200g
}

export type WeightTrend = 'N' | 'T' | 'B' | '-';
// N = Naik (Naik memenuhi KBM)
// T = Tidak Naik (Naik tidak memenuhi KBM, tetap, atau turun)
// B = Baru Pertama Kali Ditimbang
// - = Belum dinilai (misal tidak ada data bulan lalu, tapi bukan baru)

/**
 * Evaluasi status kenaikan berat badan.
 */
export function evaluateWeightTrend(
  isFirstTime: boolean,
  currentWeight: number,
  previousWeight: number | null,
  currentAgeMonths: number
): WeightTrend {
  if (isFirstTime || previousWeight === null) {
    return isFirstTime ? 'B' : '-';
  }

  const gain = currentWeight - previousWeight;
  const kbm = getKBM(currentAgeMonths);

  // JavaScript float precision handling for exact equality/comparison (e.g. 0.9 - 0.7 = 0.20000000000000007)
  // We use a small epsilon for floating point comparison if it's close enough
  const EPSILON = 0.0001;

  if (gain >= kbm - EPSILON) {
    return 'N'; // Naik memadai
  } else {
    return 'T'; // Tidak naik / kurang dari KBM
  }
}

/**
 * Aturan rujukan sesuai Formulir Kartu Bantu ILP (26 kolom):
 * Rujuk jika:
 * 1. 2x T berturut-turut (Bulan lalu T, bulan ini T)
 * 2. Berat badan di bawah garis merah (BGM) -> Z-Score BBU < -2 SD (KMS Gizi Kurang/Buruk) 
 * 3. TB/U sangat pendek/pendek (<-2 SD)
 * 4. LK Makrosefali atau Mikrosefali (<-2 atau >+2 SD)
 * 5. LILA (<-2 SD / Garis Merah Pita LILA - LILA < 11.5 cm)
 * 6. Skrining perkembangan tidak sesuai
 * 7. TBC >= 2 gejala
 */
export interface ReferralRuleInput {
  trendHistory: WeightTrend[]; // misal: ['T', 'T'] -> 2x berturut-turut
  zscoreBBU: number;
  zscoreTBU: number;
  zscoreBBTB: number;
  zscoreLK: number | null;
  lilaUnderweight: boolean; // Jika pita merah
  tbcSymptomsCount: number;
  developmentIncomplete: boolean;
}

export function checkReferral(input: ReferralRuleInput): { shouldRefer: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // 2x berturut-turut T
  if (input.trendHistory.length >= 2) {
    const last2 = input.trendHistory.slice(-2);
    if (last2[0] === 'T' && last2[1] === 'T') {
      reasons.push('Berat badan Tidak Naik (T) 2x berturut-turut');
    }
  }

  // BBU < -2 SD
  if (input.zscoreBBU < -2) {
    reasons.push('Berat Badan Kurang / BGM (Z-Score BB/U < -2)');
  }

  // TBU < -2 SD
  if (input.zscoreTBU < -2) {
    reasons.push('Anak Pendek / Stunting (Z-Score TB/U < -2)');
  }
  
  // BBTB < -2 SD or > +2 SD
  if (input.zscoreBBTB < -2) {
    reasons.push('Gizi Kurang/Buruk (Z-Score BB/TB < -2)');
  }
  if (input.zscoreBBTB > 2) {
    reasons.push('Gizi Lebih/Obesitas (Z-Score BB/TB > +2)');
  }

  // LK
  if (input.zscoreLK !== null) {
    if (input.zscoreLK < -2) {
      reasons.push('Lingkar Kepala Mikrosefali (Z-Score < -2)');
    }
    if (input.zscoreLK > 2) {
      reasons.push('Lingkar Kepala Makrosefali (Z-Score > +2)');
    }
  }

  if (input.lilaUnderweight) {
    reasons.push('LILA masuk area pita merah (Kurang Gizi Akut)');
  }

  if (input.developmentIncomplete) {
    reasons.push('Checklist perkembangan tidak lengkap / tidak sesuai umur');
  }

  if (input.tbcSymptomsCount >= 2) {
    reasons.push('Terdapat gejala suspek TBC (>= 2 gejala)');
  }

  return {
    shouldRefer: reasons.length > 0,
    reasons
  };
}
