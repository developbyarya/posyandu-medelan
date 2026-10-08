import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db, newUuid } from '../db/db';
import { RT_OPTIONS, type RT } from '../config/wilayah';
import { BigButton } from '../components/BigButton';

export default function BalitaForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const isEdit = Boolean(id);

  const [nama, setNama] = useState('');
  const [nik, setNik] = useState('');
  const [tglLahir, setTglLahir] = useState('');
  const [jk, setJk] = useState<'L' | 'P'>('L');
  const [rt, setRt] = useState<RT>('1');
  const [namaOrtu, setNamaOrtu] = useState('');
  const [bbLahir, setBbLahir] = useState('');
  const [pbLahir, setPbLahir] = useState('');

  const [isLoading, setIsLoading] = useState(isEdit);

  useEffect(() => {
    if (isEdit && id) {
      db.balita.where('local_uuid').equals(id).first().then(b => {
        if (b) {
          setNama(b.nama_balita);
          setNik(b.nik || '');
          setTglLahir(b.tanggal_lahir);
          setJk(b.jenis_kelamin);
          setRt(b.alamat_rt);
          setNamaOrtu(b.nama_ortu || (b as any).nama_ibu || '');
          setBbLahir(b.bb_lahir ? b.bb_lahir.toString() : '');
          setPbLahir(b.pb_lahir ? b.pb_lahir.toString() : '');
        }
        setIsLoading(false);
      });
    }
  }, [id, isEdit]);

  const handleSave = async () => {
    if (!nama || !tglLahir || !namaOrtu) {
      alert("Nama, Tanggal Lahir, dan Nama Orang Tua wajib diisi!");
      return;
    }

    const payload = {
      nama_balita: nama.trim(),
      nik: nik.trim() || undefined,
      tanggal_lahir: tglLahir,
      jenis_kelamin: jk,
      alamat_rt: rt,
      nama_ortu: namaOrtu.trim(),
      bb_lahir: parseFloat(bbLahir) || 0,
      pb_lahir: parseFloat(pbLahir) || 0,
      dusun: 'Medelan',
      posyandu: 'Posyandu Medelan',
      sync_status: 'pending' as const,
      updated_at: new Date().toISOString()
    };

    if (isEdit && id) {
      await db.balita.where('local_uuid').equals(id).modify(payload);
    } else {
      await db.balita.add({
        local_uuid: newUuid(),
        created_at: new Date().toISOString(),
        ...payload
      });
    }
    
    navigate('/');
  };

  const handlePindah = async () => {
    if (!id) return;
    if (confirm('Tandai balita ini sebagai pindah domisili? Data akan disembunyikan dari daftar aktif.')) {
      await db.balita.where('local_uuid').equals(id).modify({ 
        is_pindah: true,
        sync_status: 'pending',
        updated_at: new Date().toISOString()
      });
      navigate('/');
    }
  };

  const handleHapus = async () => {
    if (!id) return;
    if (confirm('Hapus balita ini? Data akan dihapus secara soft-delete (tidak permanen untuk sinkronisasi).')) {
      await db.balita.where('local_uuid').equals(id).modify({ 
        deleted_at: new Date().toISOString(),
        sync_status: 'pending',
        updated_at: new Date().toISOString()
      });
      navigate('/');
    }
  };

  if (isLoading) return <div className="p-4 text-center">Memuat...</div>;

  return (
    <div className="p-4 max-w-xl mx-auto pb-24 space-y-6">
      <h1 className="text-3xl font-bold text-primary">{isEdit ? 'Edit Data Balita' : 'Tambah Balita Baru'}</h1>
      
      <div className="bg-surface p-4 rounded-xl border-2 border-line space-y-5">
        <div>
          <label className="block text-xl font-bold mb-2">Nama Lengkap Balita <span className="text-danger-ink">*</span></label>
          <input 
            type="text" 
            value={nama} onChange={e => setNama(e.target.value)}
            className="w-full text-2xl p-4 border-2 border-line rounded-xl bg-paper"
            placeholder="Misal: Budi Santoso"
          />
        </div>

        <div>
          <label className="block text-xl font-bold mb-2">NIK Balita <span className="text-ink-soft text-lg font-normal">(Opsional)</span></label>
          <input 
            type="number" 
            value={nik} onChange={e => setNik(e.target.value)}
            className="w-full text-2xl p-4 border-2 border-line rounded-xl bg-paper"
            placeholder="16 Digit NIK"
          />
        </div>

        <div>
          <label className="block text-xl font-bold mb-2">Tanggal Lahir <span className="text-danger-ink">*</span></label>
          <input 
            type="date" 
            value={tglLahir} onChange={e => setTglLahir(e.target.value)}
            className="w-full text-2xl p-4 border-2 border-line rounded-xl bg-paper"
          />
        </div>

        <div>
          <label className="block text-xl font-bold mb-2">Jenis Kelamin <span className="text-danger-ink">*</span></label>
          <div className="flex gap-4">
            <button 
              onClick={() => setJk('L')}
              className={`flex-1 py-4 text-xl font-bold rounded-xl border-2 transition-colors ${jk === 'L' ? 'bg-primary text-on-primary border-primary' : 'bg-paper text-ink border-line'}`}
            >
              Laki-laki
            </button>
            <button 
              onClick={() => setJk('P')}
              className={`flex-1 py-4 text-xl font-bold rounded-xl border-2 transition-colors ${jk === 'P' ? 'bg-primary text-on-primary border-primary' : 'bg-paper text-ink border-line'}`}
            >
              Perempuan
            </button>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-xl font-bold mb-2">BB Lahir (kg)</label>
            <input 
              type="number" step="0.1"
              value={bbLahir} onChange={e => setBbLahir(e.target.value)}
              className="w-full text-xl p-4 border-2 border-line rounded-xl bg-paper"
              placeholder="3.2"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xl font-bold mb-2">PB Lahir (cm)</label>
            <input 
              type="number" step="0.1"
              value={pbLahir} onChange={e => setPbLahir(e.target.value)}
              className="w-full text-xl p-4 border-2 border-line rounded-xl bg-paper"
              placeholder="50.0"
            />
          </div>
        </div>

        <div>
          <label className="block text-xl font-bold mb-2">Alamat (RT) <span className="text-danger-ink">*</span></label>
          <div className="flex flex-wrap gap-2">
            {RT_OPTIONS.map(opt => (
              <button
                key={opt}
                onClick={() => setRt(opt as RT)}
                className={`px-6 py-4 text-xl font-bold rounded-full border-2 transition-colors ${rt === opt ? 'bg-primary text-on-primary border-primary' : 'bg-paper text-ink border-line'}`}
              >
                RT {opt}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t-2 border-line pt-5 mt-5">
          <label className="block text-xl font-bold mb-2">Nama Orang Tua <span className="text-danger-ink">*</span></label>
          <input 
            type="text" 
            value={namaOrtu} onChange={e => setNamaOrtu(e.target.value)}
            className="w-full text-2xl p-4 border-2 border-line rounded-xl bg-paper"
            placeholder="Nama Ibu / Ayah"
          />
        </div>

      </div>

      <div className="flex flex-col gap-3">
        <BigButton onClick={handleSave} variant="primary">
          {isEdit ? 'Simpan Perubahan' : 'Tambah Balita'}
        </BigButton>
        <BigButton onClick={() => navigate('/')} variant="secondary">
          Batal
        </BigButton>
        {isEdit && (
          <>
            <div className="border-t-2 border-line my-2" />
            <button 
              type="button"
              onClick={handlePindah} 
              className="inline-flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl border-2 px-6 text-xl font-bold leading-tight select-none border-warn bg-warn-soft text-warn-ink active:bg-warn/20"
            >
              Tandai Pindah Domisili
            </button>
            <BigButton onClick={handleHapus} variant="danger">
              Hapus Data Balita
            </BigButton>
          </>
        )}
      </div>
    </div>
  );
}
