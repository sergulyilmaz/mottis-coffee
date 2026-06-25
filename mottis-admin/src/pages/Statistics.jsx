import { useEffect, useState } from 'react';
import api from '../api';

export default function Statistics() {
  const [tab, setTab] = useState('stores');
  const [period, setPeriod] = useState('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({ period });
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    api.get(`/admin/stats/${tab}?${params}`).then(d => {
      const key = tab === 'stores' ? 'storeStats' : tab === 'products' ? 'productStats' : 'baristaStats';
      setData(d[key] || []);
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [tab, period, startDate, endDate]);

  return (
    <div>
      <div className="page-header">
        <h1>Istatistikler</h1>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'stores' ? 'active' : ''}`} onClick={() => setTab('stores')}>Subeler</button>
        <button className={`tab ${tab === 'products' ? 'active' : ''}`} onClick={() => setTab('products')}>Urunler</button>
        <button className={`tab ${tab === 'baristas' ? 'active' : ''}`} onClick={() => setTab('baristas')}>Baristalar</button>
      </div>

      <div className="toolbar">
        <select className="filter-select" value={period} onChange={(e) => setPeriod(e.target.value)}>
          <option value="day">Gunluk</option>
          <option value="week">Haftalik</option>
          <option value="month">Aylik</option>
          <option value="year">Yillik</option>
        </select>
        <input type="date" className="search-input" style={{ width: 160 }} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <span className="text-muted">—</span>
        <input type="date" className="search-input" style={{ width: 160 }} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </div>

      <div className="card">
        {loading ? <div className="loading">Yukleniyor...</div> : !data || (Array.isArray(data) && data.length === 0) ? (
          <div className="empty-state"><div className="empty-icon">📈</div><p>Veri bulunamadi.</p></div>
        ) : (
          <div className="table-wrapper">
            {tab === 'stores' && (
              <table>
                <thead>
                  <tr>
                    <th>Sube</th>
                    <th>Toplam Damga</th>
                    <th>Kullanilan Odul</th>
                    <th>Benzersiz Musteri</th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(data) ? data : []).map((r, i) => (
                    <tr key={i}>
                      <td><strong>{r.name}</strong></td>
                      <td>{r.total_stamps}</td>
                      <td>{r.redeemed_rewards}</td>
                      <td>{r.unique_customers}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {tab === 'products' && (
              <table>
                <thead>
                  <tr>
                    <th>Urun</th>
                    <th>Kategori</th>
                    <th>Fiyat</th>
                    <th>Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(data) ? data : []).map((r, i) => (
                    <tr key={i}>
                      <td><strong>{r.name}</strong></td>
                      <td className="text-sm">{r.category}</td>
                      <td>{Number(r.price || 0).toFixed(2)} TL</td>
                      <td><span className={`badge ${r.is_active ? 'badge-active' : 'badge-inactive'}`}>{r.is_active ? 'Aktif' : 'Pasif'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {tab === 'baristas' && (
              <table>
                <thead>
                  <tr>
                    <th>Barista</th>
                    <th>Sube</th>
                    <th>Islenen Damga</th>
                    <th>Benzersiz Musteri</th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(data) ? data : []).map((r, i) => (
                    <tr key={i}>
                      <td><strong>{r.name}</strong></td>
                      <td className="text-sm">{r.store_name}</td>
                      <td>{r.total_stamps}</td>
                      <td>{r.unique_customers}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
