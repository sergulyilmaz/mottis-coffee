import { useEffect, useState } from 'react';
import Modal from '../components/Modal';
import api from '../api';

export default function Products() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [catModal, setCatModal] = useState(null);
  const [catForm, setCatForm] = useState({ name: '', description: '' });

  const load = () => {
    setLoading(true);
    api.get('/menu?all=true').then(d => setCategories(d.menu || [])).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const allItems = categories.flatMap(c => c.items.map(it => ({ ...it, categoryName: c.name, categoryId: c.id })));
  const filtered = allItems.filter(it => {
    if (categoryFilter && it.categoryId !== Number(categoryFilter)) return false;
    if (search && !it.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openCreateItem = () => {
    setForm({ name: '', description: '', price: '', categoryId: categories[0]?.id || '', imageUrl: '', ingredients: '', calories: '', isNew: false, isFeatured: false });
    setModal('create');
  };

  const openEditItem = (item) => {
    setForm({
      id: item.id,
      name: item.name,
      description: item.description || '',
      price: item.price,
      categoryId: item.categoryId || item.category_id,
      imageUrl: item.image_url || '',
      ingredients: item.ingredients || '',
      calories: item.calories || '',
      isNew: item.is_new || false,
      isFeatured: item.is_featured || false,
    });
    setModal('edit');
  };

  const handleSaveItem = async () => {
    setSaving(true);
    try {
      const body = {
        name: form.name,
        description: form.description,
        price: Number(form.price),
        categoryId: Number(form.categoryId),
        imageUrl: form.imageUrl,
        ingredients: form.ingredients,
        calories: form.calories ? Number(form.calories) : null,
        isNew: form.isNew,
        isFeatured: form.isFeatured,
      };
      if (modal === 'edit') {
        await api.put(`/menu/items/${form.id}`, body);
      } else {
        await api.post('/menu/items', body);
      }
      setModal(null);
      load();
    } catch (err) {
      alert(err.error || 'Hata olustu');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (id) => {
    if (!confirm('Bu urunu silmek istediginize emin misiniz?')) return;
    try {
      await api.delete(`/menu/items/${id}`);
      load();
    } catch (err) {
      alert(err.error || 'Silinemedi');
    }
  };

  const handleSaveCategory = async () => {
    setSaving(true);
    try {
      if (catModal === 'edit') {
        await api.put(`/menu/categories/${catForm.id}`, catForm);
      } else {
        await api.post('/menu/categories', catForm);
      }
      setCatModal(null);
      load();
    } catch (err) {
      alert(err.error || 'Hata olustu');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Menu & Urunler</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => { setCatForm({ name: '', description: '' }); setCatModal('create'); }}>
            + Kategori
          </button>
          <button className="btn btn-primary" onClick={openCreateItem}>+ Yeni Urun</button>
        </div>
      </div>

      <div className="toolbar">
        <input className="search-input" placeholder="Urun ara..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="filter-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">Tum Kategoriler</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="card">
        {loading ? <div className="loading">Yukleniyor...</div> : filtered.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">☕</div><p>Urun bulunamadi.</p></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Urun Adi</th>
                  <th>Kategori</th>
                  <th>Fiyat</th>
                  <th>Kalori</th>
                  <th>Durum</th>
                  <th>Islemler</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.name}</strong>
                      {item.is_new && <span className="badge badge-active" style={{ marginLeft: 8 }}>Yeni</span>}
                    </td>
                    <td className="text-sm">{item.categoryName}</td>
                    <td>{Number(item.price).toFixed(2)} TL</td>
                    <td className="text-sm text-muted">{item.calories ? `${item.calories} kcal` : '-'}</td>
                    <td>
                      <span className={`badge ${item.is_featured ? 'badge-active' : 'badge-draft'}`}>
                        {item.is_featured ? 'One Cikan' : 'Normal'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEditItem(item)}>Duzenle</button>
                      <button className="btn btn-ghost btn-sm" style={{ color: '#ef4444' }} onClick={() => handleDeleteItem(item.id)}>Sil</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <Modal title={modal === 'edit' ? 'Urun Duzenle' : 'Yeni Urun'} onClose={() => setModal(null)} width={560}>
          <div className="form-row">
            <div className="form-group">
              <label>Urun Adi</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Kategori</label>
              <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Aciklama</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Fiyat (TL)</label>
              <input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Kalori (kcal)</label>
              <input type="number" value={form.calories} onChange={(e) => setForm({ ...form, calories: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label>Icerik / Malzemeler</label>
            <input value={form.ingredients} onChange={(e) => setForm({ ...form, ingredients: e.target.value })} placeholder="Orn: Espresso, sut, karamel" />
          </div>
          <div className="form-group">
            <label>Gorsel URL</label>
            <input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
          </div>
          <div style={{ display: 'flex', gap: 24 }}>
            <label className="form-check">
              <input type="checkbox" checked={form.isNew} onChange={(e) => setForm({ ...form, isNew: e.target.checked })} />
              <span>Yeni Urun</span>
            </label>
            <label className="form-check">
              <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} />
              <span>One Cikan</span>
            </label>
          </div>
          <div className="form-actions">
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Iptal</button>
            <button className="btn btn-primary" onClick={handleSaveItem} disabled={saving || !form.name || !form.price}>
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </Modal>
      )}

      {catModal && (
        <Modal title={catModal === 'edit' ? 'Kategori Duzenle' : 'Yeni Kategori'} onClose={() => setCatModal(null)} width={420}>
          <div className="form-group">
            <label>Kategori Adi</label>
            <input value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Aciklama</label>
            <textarea value={catForm.description} onChange={(e) => setCatForm({ ...catForm, description: e.target.value })} />
          </div>
          <div className="form-actions">
            <button className="btn btn-secondary" onClick={() => setCatModal(null)}>Iptal</button>
            <button className="btn btn-primary" onClick={handleSaveCategory} disabled={saving || !catForm.name}>
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
