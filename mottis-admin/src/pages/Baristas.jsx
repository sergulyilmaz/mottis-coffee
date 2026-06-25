import { useEffect, useState } from 'react';
import Modal from '../components/Modal';
import api from '../api';

export default function Baristas() {
  const [baristas, setBaristas] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [storeFilter, setStoreFilter] = useState('');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [credentials, setCredentials] = useState(null);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (storeFilter) params.set('storeId', storeFilter);
    if (search) params.set('search', search);
    api.get(`/admin/baristas?${params}`).then(d => setBaristas(d.baristas || [])).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [storeFilter, search]);
  useEffect(() => { api.get('/stores?all=true').then(d => setStores(d.stores || [])).catch(() => {}); }, []);

  const openCreate = () => {
    setForm({ name: '', email: '', phone: '', username: '', password: '', storeId: stores[0]?.id || '', role: 'barista', notes: '' });
    setCredentials(null);
    setModal('create');
  };

  const openEdit = async (id) => {
    try {
      const data = await api.get(`/admin/baristas/${id}`);
      const b = data.barista;
      setForm({
        id: b.id,
        name: b.name,
        email: b.email || '',
        phone: b.phone || '',
        username: b.username || '',
        password: '',
        storeId: b.store_id || '',
        role: b.role || 'barista',
        notes: b.notes || '',
      });
      setCredentials(null);
      setModal('edit');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        username: form.username,
        storeId: Number(form.storeId),
        role: form.role,
        notes: form.notes,
      };
      if (form.password) body.password = form.password;

      if (modal === 'edit') {
        await api.put(`/admin/baristas/${form.id}`, body);
        setModal(null);
      } else {
        body.password = form.password;
        await api.post('/admin/baristas', body);
        setCredentials({ username: form.username, password: form.password, name: form.name });
      }
      load();
    } catch (err) {
      alert(err.error || 'Hata olustu');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bu baristayi silmek istediginize emin misiniz?')) return;
    try {
      await api.delete(`/admin/baristas/${id}`);
      load();
    } catch (err) {
      alert(err.error || 'Silinemedi');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Baristalar</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ Yeni Barista</button>
      </div>

      <div className="toolbar">
        <input className="search-input" placeholder="Barista ara..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="filter-select" value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)}>
          <option value="">Tum Subeler</option>
          {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className="card">
        {loading ? <div className="loading">Yukleniyor...</div> : baristas.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">👤</div><p>Barista bulunamadi.</p></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Ad Soyad</th>
                  <th>Kullanici Adi</th>
                  <th>Sube</th>
                  <th>Telefon</th>
                  <th>Rol</th>
                  <th>Islemler</th>
                </tr>
              </thead>
              <tbody>
                {baristas.map(b => (
                  <tr key={b.id}>
                    <td><strong>{b.name}</strong></td>
                    <td className="text-sm">{b.username || '-'}</td>
                    <td className="text-sm">{b.store_name || '-'}</td>
                    <td className="text-sm text-muted">{b.phone || '-'}</td>
                    <td>
                      <span className={`badge ${b.role === 'manager' ? 'badge-active' : 'badge-draft'}`}>
                        {b.role === 'manager' ? 'Yonetici' : 'Barista'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(b.id)}>Duzenle</button>
                      <button className="btn btn-ghost btn-sm" style={{ color: '#ef4444' }} onClick={() => handleDelete(b.id)}>Sil</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <Modal title={modal === 'edit' ? 'Barista Duzenle' : 'Yeni Barista'} onClose={() => { setModal(null); setCredentials(null); }} width={560}>
          {credentials ? (
            <div>
              <div className="credentials-box">
                <h4>Barista olusturuldu! Giris bilgileri:</h4>
                <div className="cred-row">
                  <span className="cred-label">Ad:</span>
                  <span className="cred-value">{credentials.name}</span>
                </div>
                <div className="cred-row">
                  <span className="cred-label">Kullanici Adi:</span>
                  <span className="cred-value">{credentials.username}</span>
                </div>
                <div className="cred-row">
                  <span className="cred-label">Sifre:</span>
                  <span className="cred-value">{credentials.password}</span>
                </div>
              </div>
              <div className="form-actions">
                <button className="btn btn-primary" onClick={() => { setModal(null); setCredentials(null); }}>Tamam</button>
              </div>
            </div>
          ) : (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>Ad Soyad</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Kullanici Adi</label>
                  <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>E-posta</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Telefon</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{modal === 'edit' ? 'Yeni Sifre (bos birakilabilir)' : 'Sifre'}</label>
                  <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Sube</label>
                  <select value={form.storeId} onChange={(e) => setForm({ ...form, storeId: e.target.value })}>
                    <option value="">Sube Sec</option>
                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Rol</label>
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                    <option value="barista">Barista</option>
                    <option value="manager">Yonetici</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Notlar</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="form-actions">
                <button className="btn btn-secondary" onClick={() => setModal(null)}>Iptal</button>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.name || !form.username || (modal === 'create' && !form.password)}>
                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
