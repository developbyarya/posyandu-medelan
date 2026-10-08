import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';

export default function Riwayat() {
  const { balitaId } = useParams<{ balitaId: string }>();
  const navigate = useNavigate();

  const balita = useLiveQuery(() => db.balita.where('local_uuid').equals(balitaId!).first(), [balitaId]);
  const visits = useLiveQuery(() => db.kunjungan.where('balita_uuid').equals(balitaId!).sortBy('tanggal_kunjungan'), [balitaId]);

  if (!balita || !visits) {
    return <div className="p-4 text-center">Memuat riwayat...</div>;
  }

  // Reverse to show newest first
  const history = [...visits].reverse();

  return (
    <div className="p-4 max-w-xl mx-auto pb-24 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-primary">Riwayat Kunjungan</h1>
        <button onClick={() => navigate('/')} className="text-primary font-bold text-lg">Tutup</button>
      </div>
      
      <div className="bg-surface p-4 rounded-xl border-2 border-line">
        <div className="flex justify-between items-start mb-2">
          <h2 className="text-2xl font-bold">{balita.nama_balita}</h2>
          <button 
            onClick={() => navigate(`/balita/${balita.local_uuid}/edit`)}
            className="px-3 py-1 bg-primary/10 text-primary font-bold rounded-lg border-2 border-primary"
          >
            Edit Profil
          </button>
        </div>
        <p className="text-lg text-ink-soft">Lahir: {new Date(balita.tanggal_lahir).toLocaleDateString('id-ID')} • {balita.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</p>
      </div>

      <div className="space-y-4">
        {history.length === 0 ? (
          <p className="text-center text-ink-soft py-8">Belum ada riwayat kunjungan.</p>
        ) : (
          history.map(visit => (
            <div key={visit.local_uuid} className="bg-paper p-4 rounded-xl border-2 border-line space-y-2">
              <div className="flex justify-between items-center border-b-2 border-line pb-2 mb-2">
                <h3 className="text-xl font-bold">{new Date(visit.tanggal_kunjungan).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</h3>
                <span className="text-sm bg-surface px-2 py-1 rounded text-ink-soft">Umur: {visit.umur_bulan} bln</span>
              </div>
              
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div>
                  <p className="text-sm text-ink-soft">Berat Badan</p>
                  <p className="text-lg font-bold">{visit.bb} kg</p>
                </div>
                <div>
                  <p className="text-sm text-ink-soft">Tinggi Badan</p>
                  <p className="text-lg font-bold">{visit.tb} cm <span className="text-sm font-normal text-ink-soft">({visit.posisi_ukur})</span></p>
                </div>
                {visit.lingkar_kepala && (
                  <div>
                    <p className="text-sm text-ink-soft">Lingkar Kepala</p>
                    <p className="text-lg font-bold">{visit.lingkar_kepala} cm</p>
                  </div>
                )}
                {visit.lila && (
                  <div>
                    <p className="text-sm text-ink-soft">LiLA</p>
                    <p className="text-lg font-bold">{visit.lila} cm</p>
                  </div>
                )}
              </div>
              
              <div className="pt-3 pb-2 border-t border-b border-line mt-3 space-y-2">
                <p className="text-sm font-bold text-ink-soft mb-1">Status Gizi & Z-Score</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-ink-soft">BB/U:</span>
                    <br />
                    <span className="font-bold">{visit.status_bbu}</span> (Z: {typeof visit.zbbu === 'number' ? visit.zbbu.toFixed(2) : '-'})
                  </div>
                  <div>
                    <span className="text-ink-soft">TB/U:</span>
                    <br />
                    <span className="font-bold">{visit.status_tbu}</span> (Z: {typeof visit.ztbu === 'number' ? visit.ztbu.toFixed(2) : '-'})
                  </div>
                  <div className="col-span-2 mt-1">
                    <span className="text-ink-soft">BB/TB (Gizi):</span>
                    <br />
                    <span className="font-bold text-primary">{visit.status_bbtb}</span> (Z: {typeof visit.zbbtb === 'number' ? visit.zbbtb.toFixed(2) : '-'})
                  </div>
                  <div className="col-span-2 mt-1">
                    <span className="text-ink-soft">Tren BB:</span>
                    <br />
                    <span className="font-bold">
                      {visit.status_kenaikan_bb === 'N' ? 'Naik (N)' :
                       visit.status_kenaikan_bb === 'T' ? 'Tidak Naik (T)' :
                       visit.status_kenaikan_bb === 'O' ? 'Bulan Pertama (O)' : 'Baru (B)'}
                    </span>
                  </div>
                  {visit.status_lk && (
                    <div className="col-span-2 mt-1">
                      <span className="text-ink-soft">Lingkar Kepala:</span>
                      <br />
                      <span className="font-bold">{visit.status_lk}</span>
                    </div>
                  )}
                  {visit.status_lila && (
                    <div className="col-span-2 mt-1">
                      <span className="text-ink-soft">LiLA:</span>
                      <br />
                      <span className="font-bold">{visit.status_lila}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button 
                  onClick={() => navigate(`/kunjungan/${visit.local_uuid}/edit`)}
                  className="px-4 py-2 bg-surface border-2 border-line rounded-lg font-bold text-ink"
                >
                  Edit Data Ini
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
