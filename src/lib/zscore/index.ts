import { zscoreData, type ZScoreTable } from './data';

export type Gender = 'L' | 'P';

/**
 * Menghitung estimasi Z-Score dengan interpolasi linear antar SD band.
 * Karena tabel Permenkes hanya memberikan nilai di -3, -2, -1, 0, 1, 2, 3 SD,
 * metode ini menjamin batas kategori akan 100% akurat sesuai tabel panduan fisik Kader.
 */
export function interpolateZScore(value: number, row: ZScoreTable[string]): number {
  if (value === row['0']) return 0;
  
  if (value > row['0']) {
    if (value <= row['1']) return 0 + (value - row['0']) / (row['1'] - row['0']);
    if (value <= row['2']) return 1 + (value - row['1']) / (row['2'] - row['1']);
    if (value <= row['3']) return 2 + (value - row['2']) / (row['3'] - row['2']);
    // Extrapolate > +3 SD
    return 3 + (value - row['3']) / (row['3'] - row['2']);
  } else {
    if (value >= row['-1']) return 0 - (row['0'] - value) / (row['0'] - row['-1']);
    if (value >= row['-2']) return -1 - (row['-1'] - value) / (row['-1'] - row['-2']);
    if (value >= row['-3']) return -2 - (row['-2'] - value) / (row['-2'] - row['-3']);
    // Extrapolate < -3 SD
    return -3 - (row['-3'] - value) / (row['-2'] - row['-3']);
  }
}

/**
 * Mencari baris tabel yang sesuai. Jika input key berupa desimal (seperti panjang badan 75.4),
 * dan tidak ada di tabel, kita membulatkan ke key terdekat yang tersedia di tabel BB/PB atau BB/TB,
 * atau melakukan interpolasi pada nilai SD-nya sendiri.
 * Permenkes menggunakan panjang/tinggi badan dengan resolusi 0.5 cm atau 0.1 cm.
 * Di tabel, nilainya beresolusi 0.5 cm (misal 65.0, 65.5).
 */
export function getInterpolatedRow(table: ZScoreTable, keyNum: number): ZScoreTable[string] {
  const exact = table[keyNum.toFixed(1)] || table[keyNum.toString()];
  if (exact) return exact;

  // Find nearest keys below and above
  const keys = Object.keys(table).map(Number).sort((a, b) => a - b);
  
  if (keys.length === 0) throw new Error("Table is empty");

  const firstKey = keys[0]!;
  if (keyNum <= firstKey) return table[firstKey.toFixed(1)] || table[firstKey.toString()]!;
  
  const lastKey = keys[keys.length - 1]!;
  if (keyNum >= lastKey) {
    return table[lastKey.toFixed(1)] || table[lastKey.toString()]!;
  }

  let lowerKey = firstKey;
  let upperKey = lastKey;

  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i]!;
    const kNext = keys[i + 1]!;
    if (keyNum > k && keyNum < kNext) {
      lowerKey = k;
      upperKey = kNext;
      break;
    }
  }

  const rowL = table[lowerKey.toFixed(1)] || table[lowerKey.toString()];
  const rowU = table[upperKey.toFixed(1)] || table[upperKey.toString()];

  if (!rowL || !rowU) throw new Error("Could not find interpolation bounds");

  // Interpolate the SD reference row itself
  const factor = (keyNum - lowerKey) / (upperKey - lowerKey);
  const interp = (valL: number, valU: number) => valL + factor * (valU - valL);

  return {
    '-3': interp(rowL['-3'], rowU['-3']),
    '-2': interp(rowL['-2'], rowU['-2']),
    '-1': interp(rowL['-1'], rowU['-1']),
    '0': interp(rowL['0'], rowU['0']),
    '1': interp(rowL['1'], rowU['1']),
    '2': interp(rowL['2'], rowU['2']),
    '3': interp(rowL['3'], rowU['3']),
  };
}

export function calculateBBU(gender: Gender, ageMonths: number, weight: number): number {
  const table = zscoreData.bbu[gender];
  const row = getInterpolatedRow(table, ageMonths);
  return interpolateZScore(weight, row);
}

export function calculateTBU(gender: Gender, ageMonths: number, lengthOrHeight: number): number {
  const table = zscoreData.tbu[gender];
  const row = getInterpolatedRow(table, ageMonths);
  return interpolateZScore(lengthOrHeight, row);
}

/**
 * Menghitung BB/PB (Berat Badan menurut Panjang Badan) untuk anak < 24 bulan (diukur telentang)
 */
export function calculateBBPB(gender: Gender, length: number, weight: number): number {
  const table = zscoreData.bbpb[gender];
  const row = getInterpolatedRow(table, length);
  return interpolateZScore(weight, row);
}

/**
 * Menghitung BB/TB (Berat Badan menurut Tinggi Badan) untuk anak >= 24 bulan (diukur berdiri)
 */
export function calculateBBTB(gender: Gender, height: number, weight: number): number {
  const table = zscoreData.bbtb[gender];
  const row = getInterpolatedRow(table, height);
  return interpolateZScore(weight, row);
}

export function calculateLK(gender: Gender, ageMonths: number, headCircumference: number): number {
  const table = zscoreData.lk[gender];
  const row = getInterpolatedRow(table, ageMonths);
  return interpolateZScore(headCircumference, row);
}

// === Klasifikasi Kategori Permenkes No. 2 Tahun 2020 ===

export function getStatusBBU(zscore: number): 'Gizi Buruk (Severely Underweight)' | 'Gizi Kurang (Underweight)' | 'Berat Badan Normal' | 'Risiko Berat Badan Lebih' {
  if (zscore < -3) return 'Gizi Buruk (Severely Underweight)';
  if (zscore < -2) return 'Gizi Kurang (Underweight)';
  if (zscore <= 1) return 'Berat Badan Normal';
  return 'Risiko Berat Badan Lebih';
}

export function getStatusTBU(zscore: number): 'Sangat Pendek (Severely Stunted)' | 'Pendek (Stunted)' | 'Normal' | 'Tinggi' {
  if (zscore < -3) return 'Sangat Pendek (Severely Stunted)';
  if (zscore < -2) return 'Pendek (Stunted)';
  if (zscore <= 3) return 'Normal';
  return 'Tinggi';
}

export function getStatusBBTB(zscore: number): 'Gizi Buruk (Severely Wasted)' | 'Gizi Kurang (Wasted)' | 'Gizi Baik (Normal)' | 'Beresiko Gizi Lebih (Possible Risk of Overweight)' | 'Gizi Lebih (Overweight)' | 'Obesitas (Obese)' {
  if (zscore < -3) return 'Gizi Buruk (Severely Wasted)';
  if (zscore < -2) return 'Gizi Kurang (Wasted)';
  if (zscore <= 1) return 'Gizi Baik (Normal)';
  if (zscore <= 2) return 'Beresiko Gizi Lebih (Possible Risk of Overweight)';
  if (zscore <= 3) return 'Gizi Lebih (Overweight)';
  return 'Obesitas (Obese)';
}

export function getStatusLK(zscore: number): 'Makrosefali' | 'Normal' | 'Mikrosefali' {
  if (zscore > 2) return 'Makrosefali';
  if (zscore < -2) return 'Mikrosefali';
  return 'Normal';
}
