import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BigButton } from '../../components/BigButton';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    if (username === 'admin' && password === 'medelan2024') {
      sessionStorage.setItem('ocr_auth', password);
      navigate('/import/upload');
    } else {
      alert('Username atau password salah.');
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto pt-20 space-y-6">
      <h1 className="text-3xl font-bold text-primary text-center">Login Kader Admin</h1>
      <p className="text-center text-ink-soft">Silakan login untuk mengakses fitur Impor Foto KMS.</p>

      <div className="bg-surface p-6 rounded-xl border-2 border-line space-y-4">
        <div>
          <label className="block text-xl font-bold mb-2">Username</label>
          <input 
            type="text" 
            value={username} onChange={e => setUsername(e.target.value)}
            className="w-full text-xl p-4 border-2 border-line rounded-xl bg-paper"
          />
        </div>
        <div>
          <label className="block text-xl font-bold mb-2">Password</label>
          <input 
            type="password" 
            value={password} onChange={e => setPassword(e.target.value)}
            className="w-full text-xl p-4 border-2 border-line rounded-xl bg-paper"
          />
        </div>
      </div>

      <BigButton onClick={handleLogin} variant="primary" fullWidth>Login</BigButton>
      <button onClick={() => navigate('/')} className="w-full text-ink-soft py-4 font-bold">Kembali ke Beranda</button>
    </div>
  );
}
