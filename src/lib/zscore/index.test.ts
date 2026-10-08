import { describe, it, expect } from 'vitest';
import { calculateBBU, calculateTBU, calculateBBPB, getStatusBBU } from './index';

describe('Z-Score Engine', () => {
  it('calculateBBU (Boys 0 months) matches exact SD boundaries', () => {
    // Boy 0 months BB/U table:
    // -3SD=2.1, -2SD=2.5, -1SD=2.9, Median=3.3, +1SD=3.9, +2SD=4.4, +3SD=5.0
    expect(calculateBBU('L', 0, 3.3)).toBe(0);
    expect(calculateBBU('L', 0, 3.9)).toBe(1);
    expect(calculateBBU('L', 0, 4.4)).toBe(2);
    expect(calculateBBU('L', 0, 5.0)).toBe(3);
    
    expect(calculateBBU('L', 0, 2.9)).toBe(-1);
    expect(calculateBBU('L', 0, 2.5)).toBe(-2);
    expect(calculateBBU('L', 0, 2.1)).toBe(-3);
  });

  it('calculateBBU interpolates correctly between SD bands', () => {
    // BB/U Boy 0 months. Median=3.3, -1SD=2.9. 
    // Weight=3.1 is exactly halfway between Median and -1SD -> z = -0.5
    expect(calculateBBU('L', 0, 3.1)).toBeCloseTo(-0.5, 3);
    
    // Weight=4.15 is halfway between +1SD(3.9) and +2SD(4.4).
    expect(calculateBBU('L', 0, 4.15)).toBeCloseTo(1.5, 3);
  });

  it('extrapolates beyond -3 and +3 SD', () => {
    // BB/U Boy 0 months.
    // > +3 SD: slope is between +2(4.4) and +3(5.0) -> distance is 0.6.
    // If weight is 5.6, it is +1 SD distance above 3 SD -> 4.0
    expect(calculateBBU('L', 0, 5.6)).toBeCloseTo(4.0, 3);

    // < -3 SD: slope between -2(2.5) and -3(2.1) -> distance is 0.4.
    // If weight is 1.7, it is -1 SD distance below -3 SD -> -4.0
    expect(calculateBBU('L', 0, 1.7)).toBeCloseTo(-4.0, 3);
  });

  it('calculateTBU handles decimal interpolation for age (though age is usually integer)', () => {
    // If age is somehow decimal, it should interpolate the reference values.
    // But ageMonths is integer from posyandu.
    // Still good to verify.
    expect(calculateTBU('L', 0, 49.9)).toBe(0); // Boy 0mo TBU median is 49.9
  });

  it('calculateBBPB handles decimal interpolation for length key', () => {
    // Boy BB/PB
    // Key 65.0 cm: Median=7.3, +1SD=7.9
    // Key 65.5 cm: Median=7.4, +1SD=8.0
    
    // If length is 65.25 (halfway between 65.0 and 65.5),
    // Interpolated Median = 7.35
    // If weight is 7.35, zscore should be 0.
    expect(calculateBBPB('L', 65.25, 7.35)).toBeCloseTo(0, 3);
    
    // Exact keys:
    expect(calculateBBPB('L', 65.0, 7.3)).toBe(0);
    expect(calculateBBPB('L', 65.0, 7.9)).toBe(1);
  });

  it('getStatusBBU maps to correct Permenkes category', () => {
    expect(getStatusBBU(-3.1)).toBe('Gizi Buruk (Severely Underweight)');
    expect(getStatusBBU(-2.5)).toBe('Gizi Kurang (Underweight)');
    expect(getStatusBBU(-1.5)).toBe('Berat Badan Normal');
    expect(getStatusBBU(0.5)).toBe('Berat Badan Normal');
    expect(getStatusBBU(1.0)).toBe('Berat Badan Normal');
    expect(getStatusBBU(1.1)).toBe('Risiko Berat Badan Lebih');
  });
});
