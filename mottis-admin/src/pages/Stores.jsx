import { useEffect, useState } from 'react';
import Modal from '../components/Modal';
import api from '../api';

export default function Stores() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({ all: 'true' });
    if (statusFilter) params.set('status', statusFilter);
    if (search) params.set('search', search);
    api.get(`/stores?${params}`).then(d => setStores(d.stores || [])).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter, search]);

  const openCreate = () => {
    setForm({ name: '', address: '', district: '', city: '', lat: '', lng: '', phone: '', email: '', openingHours: '', imageUrl: '', status: 'active' });
    setModal('create');
  };

  const openEdit = async (id) => {
    try {
      const data = await api.get(`/stores/${id}`);
      const s = data.store;
      setForm({
        id: s.id,
        name: s.name,
        address: s.address || '',
        district: s.district || '',
        city: s.city || '',
        lat: s.lat || '',
        lng: s.lng || '',
        phone: s.phone || '',
        email: s.email || '',
        openingHours: s.working_hours || '',
        imageUrl: s.image_url || '',
        status: s.status || 'active',
      });
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
        address: form.address,
        district: form.district,
        city: form.city,
        lat: form.lat ? Number(form.lat) : null,
        lng: form.lng ? Number(form.lng) : null,
        phone: form.phone,
        email: form.email,
        openingHours: form.openingHours,
        imageUrl: form.imageUrl,
        status: form.status,
      };
      if (modal === 'edit') {
        await api.put(`/stores/${form.id}`, body);
      } else {
        await api.post('/stores', body);
      }
      setModal(null);
      load();
    } catch (err) {
      alert(err.error || 'Hata olustu');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bu subeyi silmek istediginize emin misiniz?')) return;
    try {
      await api.delete(`/stores/${id}`);
      load();
    } catch (err) {
      alert(err.error || 'Silinemedi');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Subeler</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ Yeni Sube</button>
      </div>

      <div className="toolbar">
        <input className="search-input" placeholder="Sube ara..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Tum Durumlar</option>
          <option value="active">Aktif</option>
          <option value="inactive">Pasif</option>
        </select>
      </div>

      <div className="card">
        {loading ? <div className="loading">Yukleniyor...</div> : stores.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📍</div><p>Sube bulunamadi.</p></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Sube Adi</th>
                  <th>Ilce</th>
                  <th>Sehir</th>
                  <th>Telefon</th>
                  <th>Durum</th>
                  <th>Islemler</th>
                </tr>
              </thead>
              <tbody>
                {stores.map(s => (
                  <tr key={s.id}>
                    <td><strong>{s.name}</strong></td>
                    <td className="text-sm">{s.district || '-'}</td>
                    <td className="text-sm">{s.city || '-'}</td>
                    <td className="text-sm text-muted">{s.phone || '-'}</td>
                    <td>
                      <span className={`badge ${s.status === 'active' ? 'badge-active' : 'badge-inactive'}`}>
                        {s.status === 'active' ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s.id)}>Duzenle</button>
                      <button className="btn btn-ghost btn-sm" style={{ color: '#ef4444' }} onClick={() => handleDelete(s.id)}>Sil</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <Modal title={modal === 'edit' ? 'Sube Duzenle' : 'Yeni Sube'} onClose={() => setModal(null)} width={600}>
          <div className="form-row">
            <div className="form-group">
              <label>Sube Adi</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Durum</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="active">Aktif</option>
                <option value="inactive">Pasif</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Adres</label>
            <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Ilce</label>
              <input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Sehir</label>
              <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Enlem (Lat)</label>
              <input type="number" step="any" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Boylam (Lng)</label>
              <input type="number" step="any" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Telefon</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="form-group">
              <label>E-posta</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label>Calisma Saatleri</label>
            <input value={form.openingHours} onChange={(e) => setForm({ ...form, openingHours: e.target.value })} placeholder="Orn: 08:00 - 22:00" />
          </div>
          <div className="form-group">
            <label>Gorsel URL</label>
            <input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
          </div>
          <div className="form-actions">
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Iptal</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.name}>
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
