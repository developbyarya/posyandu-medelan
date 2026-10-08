export function parseNumberId(transcript: string): number | null {
  if (!transcript) return null;
  
  let t = transcript.toLowerCase().trim();
  
  // Web Speech API dalam mode bahasa Indonesia sering kali sudah
  // langsung memberikan angka (contoh: diucapkan "delapan koma lima",
  // STT Google mengembalikan string "8,5").
  
  // 1. Normalisasi format lokal ke float standar
  t = t.replace(/,/g, '.');
  
  // 2. Normalisasi kata kunci yang sering gagal diubah jadi angka oleh STT
  t = t.replace(/\bsetengah\b/g, '.5');
  t = t.replace(/\bkoma\b/g, '.');
  t = t.replace(/\btitik\b/g, '.');
  
  // Hapus spasi di sekitar titik (misal: "8 . 5")
  t = t.replace(/\s*\.\s*/g, '.');

  // 3. Ekstrak angka pertama yang ditemukan
  // Ini mengabaikan kata-kata pengantar seperti "beratnya 8.5 kg"
  const matches = t.match(/\d+(\.\d+)?/);
  if (matches) {
    const val = parseFloat(matches[0]);
    if (!isNaN(val)) return val;
  }

  return null;
}
