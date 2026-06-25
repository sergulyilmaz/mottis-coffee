import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.login(identifier, password);
      if (data.staff.role !== 'manager') {
        setError('Bu panel sadece yoneticiler icindir.');
        api.logout();
        setLoading(false);
        return;
      }
      login(data.staff);
      navigate('/');
    } catch (err) {
      setError(err.error || 'Giris basarisiz. Bilgilerinizi kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>Mottis Coffee</h1>
        <p>Admin paneline giris yapin</p>
        {error && <div className="login-error">{error}</div>}
        <div className="form-group">
          <label>E-posta veya Kullanıcı Adı</label>
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="admin@mottiscoffee.com"
            required
          />
        </div>
        <div className="form-group">
          <label>Sifre</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>
        <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }} disabled={loading}>
          {loading ? 'Giris yapiliyor...' : 'Giris Yap'}
        </button>
      </form>
    </div>
  );
}
