import { describe, it, expect } from 'vitest';
import { parseNumberId } from './parseNumberId';

describe('parseNumberId', () => {
  it('parses standard digits', () => {
    expect(parseNumberId('8')).toBe(8);
    expect(parseNumberId('8.5')).toBe(8.5);
    expect(parseNumberId('120')).toBe(120);
  });

  it('parses comma as decimal separator (Indonesian locale)', () => {
    expect(parseNumberId('8,5')).toBe(8.5);
    expect(parseNumberId('11,25')).toBe(11.25);
  });

  it('parses spoken decimal words', () => {
    expect(parseNumberId('8 koma 5')).toBe(8.5);
    expect(parseNumberId('12 titik 4')).toBe(12.4);
    expect(parseNumberId('8 setengah')).toBe(8.5);
  });

  it('ignores surrounding text', () => {
    expect(parseNumberId('beratnya 8,5 kg')).toBe(8.5);
    expect(parseNumberId('tingginya 75 setengah cm')).toBe(75.5);
    expect(parseNumberId('kayaknya 12,4')).toBe(12.4);
  });

  it('returns null for invalid inputs', () => {
    expect(parseNumberId('')).toBeNull();
    expect(parseNumberId('berat badan')).toBeNull();
    // Jika tidak ada angka sama sekali
    expect(parseNumberId('delapan koma lima')).toBeNull(); // Karena kita tidak bikin NLP full
  });
});
