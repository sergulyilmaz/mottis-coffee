import { useEffect, useState } from 'react';
import Modal from '../components/Modal';
import api from '../api';

const STATUS_LABELS = { active: 'Aktif', draft: 'Taslak', inactive: 'Pasif' };
const TYPE_LABELS = { general: 'Genel', product_specific: 'Urun Bazli', store_specific: 'Sube Bazli', time_based: 'Zaman Bazli' };

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [stores, setStores] = useState([]);
  const [products, setProducts] = useState([]);
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
    api.get(`/campaigns?${params}`).then(d => setCampaigns(d.campaigns || [])).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter, search]);

  useEffect(() => {
    api.get('/stores?all=true').then(d => setStores(d.stores || [])).catch(() => {});
    api.get('/menu?all=true').then(d => {
      const cats = d.menu || [];
      const items = cats.flatMap(c => c.items.map(it => ({ ...it, categoryName: c.name })));
      setProducts(items);
    }).catch(() => {});
  }, []);

  const openCreate = () => {
    setForm({ title: '', description: '', type: 'general', startDate: '', endDate: '', conditions: '', notes: '', status: 'draft', storeIds: [], productIds: [] });
    setModal('create');
  };

  const openEdit = async (id) => {
    try {
      const data = await api.get(`/campaigns/${id}`);
      const c = data.campaign;
      setForm({
        id: c.id,
        title: c.title,
        description: c.description || '',
        type: c.type || 'general',
        startDate: c.start_date?.slice(0, 10) || '',
        endDate: c.end_date?.slice(0, 10) || '',
        conditions: c.conditions || '',
        notes: c.notes || '',
        status: c.status || 'active',
        storeIds: data.applicableStores?.map(s => s.id) || [],
        productIds: data.applicableProducts?.map(p => p.id) || [],
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
        title: form.title,
        description: form.description,
        type: form.type,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        conditions: form.conditions,
        notes: form.notes,
        status: form.status,
        storeIds: form.storeIds,
        productIds: form.productIds,
      };
      if (modal === 'edit') {
        await api.put(`/campaigns/${form.id}`, body);
      } else {
        await api.post('/campaigns', body);
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
    if (!confirm('Bu kampanyayi silmek istediginize emin misiniz?')) return;
    try {
      await api.delete(`/campaigns/${id}`);
      load();
    } catch (err) {
      alert(err.error || 'Silinemedi');
    }
  };

  const toggleArrayItem = (field, id) => {
    setForm(f => ({
      ...f,
      [field]: f[field].includes(id) ? f[field].filter(x => x !== id) : [...f[field], id]
    }));
  };

  return (
    <div>
      <div className="page-header">
        <h1>Kampanyalar</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ Yeni Kampanya</button>
      </div>

      <div className="toolbar">
        <input className="search-input" placeholder="Kampanya ara..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Tum Durumlar</option>
          <option value="active">Aktif</option>
          <option value="draft">Taslak</option>
          <option value="inactive">Pasif</option>
        </select>
      </div>

      <div className="card">
        {loading ? <div className="loading">Yukleniyor...</div> : campaigns.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">🎯</div><p>Kampanya bulunamadi.</p></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Baslik</th>
                  <th>Tur</th>
                  <th>Baslangic</th>
                  <th>Bitis</th>
                  <th>Durum</th>
                  <th>Islemler</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map(c => (
                  <tr key={c.id}>
                    <td><strong>{c.title}</strong></td>
                    <td className="text-sm">{TYPE_LABELS[c.type] || c.type}</td>
                    <td className="text-sm text-muted">{c.start_date ? new Date(c.start_date).toLocaleDateString('tr-TR') : '-'}</td>
                    <td className="text-sm text-muted">{c.end_date ? new Date(c.end_date).toLocaleDateString('tr-TR') : '-'}</td>
                    <td>
                      <span className={`badge badge-${c.status === 'active' ? 'active' : c.status === 'draft' ? 'draft' : 'inactive'}`}>
                        {STATUS_LABELS[c.status] || c.status}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c.id)}>Duzenle</button>
                      <button className="btn btn-ghost btn-sm" style={{ color: '#ef4444' }} onClick={() => handleDelete(c.id)}>Sil</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <Modal title={modal === 'edit' ? 'Kampanya Duzenle' : 'Yeni Kampanya'} onClose={() => setModal(null)} width={640}>
          <div className="form-row">
            <div className="form-group">
              <label>Baslik</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Tur</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Aciklama</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Baslangic Tarihi</label>
              <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Bitis Tarihi</label>
              <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Kosullar</label>
              <input value={form.conditions} onChange={(e) => setForm({ ...form, conditions: e.target.value })} placeholder="Orn: Min. 3 damga" />
            </div>
            <div className="form-group">
              <label>Durum</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="draft">Taslak</option>
                <option value="active">Aktif</option>
                <option value="inactive">Pasif</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Notlar</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>

          {(form.type === 'store_specific' || form.type === 'general') && stores.length > 0 && (
            <div className="form-group">
              <label>Gecerli Subeler</label>
              <div style={{ maxHeight: 140, overflow: 'auto', border: '1px solid #e0d6cc', borderRadius: 8, padding: 8 }}>
                {stores.map(s => (
                  <label key={s.id} className="form-check" style={{ marginBottom: 4 }}>
                    <input type="checkbox" checked={form.storeIds.includes(s.id)} onChange={() => toggleArrayItem('storeIds', s.id)} />
                    <span style={{ fontSize: '0.88rem' }}>{s.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {(form.type === 'product_specific') && products.length > 0 && (
            <div className="form-group">
              <label>Gecerli Urunler</label>
              <div style={{ maxHeight: 140, overflow: 'auto', border: '1px solid #e0d6cc', borderRadius: 8, padding: 8 }}>
                {products.map(p => (
                  <label key={p.id} className="form-check" style={{ marginBottom: 4 }}>
                    <input type="checkbox" checked={form.productIds.includes(p.id)} onChange={() => toggleArrayItem('productIds', p.id)} />
                    <span style={{ fontSize: '0.88rem' }}>{p.name} ({p.categoryName})</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="form-actions">
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Iptal</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.title}>
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
