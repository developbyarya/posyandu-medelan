import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BigButton } from '../../components/BigButton';

export default function OcrUpload() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionStorage.getItem('ocr_auth')) {
      navigate('/import/login');
    }
  }, [navigate]);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1600;
        
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        // Compress to JPEG with 70% quality
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Gagal memuat gambar untuk kompresi."));
      };
      
      img.src = url;
    });
  };

  const processImage = async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const dataUrl = await compressImage(file);
      const base64Part = dataUrl.split(',')[1];
      
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("VITE_GEMINI_API_KEY tidak ditemukan di environment.");
      }

      const prompt = `Anda adalah asisten data entry untuk KMS/Kartu Bantu Posyandu balita.
Tugas Anda adalah membaca tabel dari gambar tulisan tangan ini dan mengekstrak baris-baris data ke dalam format JSON array.
Dokumen ini bisa berupa rekapan banyak balita, atau buku KIA/Kartu Bantu khusus untuk SATU balita. 

PENTING 1: Jika dokumen ini adalah milik SATU balita (nama, tanggal lahir, nama ortu ada di bagian atas/header dokumen), ekstrak nama balita dan tanggal lahir tersebut. Isi ke field "nama_balita" dan "tanggal_lahir" di SETIAP baris/objek kunjungan dalam array.
PENTING 2: Jika dokumen berupa tabel rekapan BANYAK balita (tiap baris beda anak), pastikan membaca baris demi baris secara lurus. Jika ada nama anak tapi datanya kosong (mungkin tidak hadir), tetap buat objek untuk anak tersebut dengan field pengukuran bernilai null. JANGAN LEWATI BARIS KOSONG karena dapat membuat data bergeser dan tertukar dengan anak di bawahnya.
Abaikan coretan yang tidak relevan. Jika data kosong atau strip (-), gunakan null.
Tanggal kunjungan dan tanggal lahir usahakan dikonversi ke YYYY-MM-DD (dari format umum seperti dd-mm-yyyy). Jika hanya ada bulan/umur, perkirakan atau gunakan format lain jika tidak bisa dikonversi penuh. Pastikan angka desimal menggunakan titik (misal 13.5).

Format output wajib berupa JSON array dengan struktur objek berikut:
[
  {
    "nama_balita": "String",
    "tanggal_lahir": "YYYY-MM-DD",
    "tanggal_kunjungan": "YYYY-MM-DD",
    "bb": Number,
    "tb": Number,
    "posisi_ukur": "berbaring" | "berdiri",
    "lingkar_kepala": Number,
    "lila": Number,
    "umur_bulan": Number
  }
]
Hanya kembalikan JSON array murni tanpa format markdown \`\`\`json.`;

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [
              { text: prompt },
              { inlineData: { mimeType: "image/jpeg", data: base64Part } }
            ]
          }],
          generationConfig: { temperature: 0.1 }
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error?.message || 'Gagal menghubungi Gemini API.');
      }

      const jsonRes = await res.json();
      let text = jsonRes.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
      
      // Clean up markdown
      text = text.trim();
      if (text.startsWith('```json')) text = text.substring(7);
      if (text.startsWith('```')) text = text.substring(3);
      if (text.endsWith('```')) text = text.substring(0, text.length - 3);
      
      const data = JSON.parse(text.trim());

      sessionStorage.setItem('ocr_preview_data', JSON.stringify(data));
      sessionStorage.setItem('ocr_preview_image', dataUrl);
      navigate('/import/preview');

    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && e.target.files[0]) {
      processImage(e.target.files[0]);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto pt-10 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-primary">Import Foto KMS</h1>
        <button onClick={() => navigate('/')} className="text-ink-soft font-bold">Tutup</button>
      </div>
      
      <p className="text-ink-soft">Foto tabel KMS balita atau buku catatan posyandu. AI akan mencoba mengekstrak isinya secara otomatis.</p>

      {error && (
        <div className="p-4 bg-danger-soft text-danger-ink rounded-xl border border-danger font-bold">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="bg-surface p-10 rounded-xl border-2 border-line text-center space-y-4">
          <div className="animate-spin text-4xl">⏳</div>
          <p className="text-xl font-bold">Membaca tulisan tangan...</p>
          <p className="text-ink-soft text-sm">Proses ini membutuhkan waktu beberapa detik.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <input 
            type="file" 
            accept="image/*" 
            capture="environment" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
          />
          <BigButton onClick={() => fileInputRef.current?.click()} variant="primary" fullWidth>
            📸 Ambil / Pilih Foto
          </BigButton>
        </div>
      )}
    </div>
  );
}
