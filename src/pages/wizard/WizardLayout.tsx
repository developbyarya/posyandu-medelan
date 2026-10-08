import { Outlet, useNavigate, useParams, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';

export default function WizardLayout() {
  const { balitaId } = useParams<{ balitaId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const balita = useLiveQuery(() => 
    db.balita.where('local_uuid').equals(balitaId!).first()
  , [balitaId]);

  if (!balita) return <div className="p-4 text-center">Memuat...</div>;

  const currentPath = location.pathname.split('/').pop();
  
  // Back logic based on steps
  const handleBack = () => {
    switch (currentPath) {
      case 'bb': navigate('/'); break;
      case 'tb': navigate(`/timbang/${balitaId}/bb`); break;
      case 'lingkar': navigate(`/timbang/${balitaId}/tb`); break;
      case 'skrining': navigate(`/timbang/${balitaId}/lingkar`); break;
      case 'catatan': navigate(`/timbang/${balitaId}/skrining`); break;
      case 'hasil': navigate(`/timbang/${balitaId}/catatan`); break;
      default: navigate('/');
    }
  };

  return (
    <div className="p-4 max-w-xl mx-auto pb-24 flex flex-col gap-4">
      <div className="bg-surface p-4 rounded-xl shadow-sm border border-line flex justify-between items-center">
        <div>
          <p className="text-sm font-bold text-ink-soft uppercase tracking-wider">Pengukuran Balita</p>
          <h2 className="text-2xl font-bold text-ink">{balita.nama_balita}</h2>
        </div>
        <button 
          onClick={handleBack}
          className="px-4 py-2 border-2 border-line rounded-lg font-bold text-lg text-ink bg-paper active:bg-line transition-colors"
        >
          Kembali
        </button>
      </div>

      <div className="flex-1 bg-paper p-4 rounded-xl shadow-sm border-2 border-line">
        <Outlet />
      </div>
    </div>
  );
}
