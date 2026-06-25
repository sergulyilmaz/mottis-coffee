import { useEffect, useState } from 'react';
import StatCard from '../components/StatCard';
import api from '../api';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/dashboard').then(d => setData(d.dashboard)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Yukleniyor...</div>;
  if (!data) return <div className="loading">Veri alinamadi.</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>
      <div className="stat-cards">
        <StatCard icon="☕" label="Bugunun Damgalari" value={data.todayStamps} color="#6f4e37" />
        <StatCard icon="🎁" label="Bugunun Odulleri" value={data.todayRewards} color="#16a34a" />
        <StatCard icon="👥" label="Toplam Musteri" value={data.totalCustomers} color="#2563eb" />
        <StatCard icon="📍" label="Aktif Sube" value={data.activeStores} color="#9333ea" />
        <StatCard icon="🎯" label="Aktif Kampanya" value={data.activeCampaigns} color="#ea580c" />
        <StatCard icon="👤" label="Toplam Barista" value={data.totalBaristas} color="#0891b2" />
      </div>

      <div className="card">
        <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 16 }}>Son Islemler</h3>
        {data.recentTransactions?.length > 0 ? (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Musteri</th>
                  <th>Sube</th>
                  <th>Tur</th>
                  <th>Tarih</th>
                </tr>
              </thead>
              <tbody>
                {data.recentTransactions.map((t, i) => (
                  <tr key={i}>
                    <td>{t.customer_name}</td>
                    <td>{t.store_name}</td>
                    <td>
                      <span className={`badge ${t.type === 'stamp' ? 'badge-active' : 'badge-draft'}`}>
                        {t.type === 'stamp' ? 'Damga' : 'Odul'}
                      </span>
                    </td>
                    <td className="text-muted text-sm">{new Date(t.created_at).toLocaleString('tr-TR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <p>Henuz islem yok.</p>
          </div>
        )}
      </div>
    </div>
  );
}
