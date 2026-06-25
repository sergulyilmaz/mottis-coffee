import { useEffect, useState } from 'react';
import api from '../api';

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwMsg, setPwMsg] = useState('');

  useEffect(() => {
    api.get('/admin/settings').then(d => {
      const s = d.settings;
      setSettings(s);
      setForm({
        businessName: s.business_name || '',
        businessPhone: s.phone || '',
        businessEmail: s.email || '',
        businessAddress: s.address || '',
        stampsForReward: s.stamps_per_reward || 8,
        rewardDescription: s.reward_description || '',
      });
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await api.put('/admin/settings', form);
      alert('Ayarlar kaydedildi.');
    } catch (err) {
      alert(err.error || 'Hata olustu');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPwMsg('');
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwMsg('Sifreler eslesmedi.');
      return;
    }
    if (pwForm.newPassword.length < 6) {
      setPwMsg('Sifre en az 6 karakter olmali.');
      return;
    }
    try {
      await api.put('/admin/settings/password', {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      setPwMsg('Sifre basariyla degistirildi.');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPwMsg(err.error || 'Sifre degistirilemedi.');
    }
  };

  if (loading) return <div className="loading">Yukleniyor...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Ayarlar</h1>
      </div>

      <div className="settings-section">
        <h2>Isletme Bilgileri</h2>
        <div className="form-row">
          <div className="form-group">
            <label>Isletme Adi</label>
            <input value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Telefon</label>
            <input value={form.businessPhone} onChange={(e) => setForm({ ...form, businessPhone: e.target.value })} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>E-posta</label>
            <input type="email" value={form.businessEmail} onChange={(e) => setForm({ ...form, businessEmail: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Adres</label>
            <input value={form.businessAddress} onChange={(e) => setForm({ ...form, businessAddress: e.target.value })} />
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleSaveSettings} disabled={saving} style={{ marginTop: 8 }}>
          {saving ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </div>

      <div className="settings-section">
        <h2>Sadakat Programi</h2>
        <div className="form-row">
          <div className="form-group">
            <label>Odul Icin Gereken Damga</label>
            <input type="number" min="1" value={form.stampsForReward} onChange={(e) => setForm({ ...form, stampsForReward: Number(e.target.value) })} />
          </div>
          <div className="form-group">
            <label>Odul Aciklamasi</label>
            <input value={form.rewardDescription} onChange={(e) => setForm({ ...form, rewardDescription: e.target.value })} placeholder="Orn: 1 ucretsiz kahve" />
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleSaveSettings} disabled={saving} style={{ marginTop: 8 }}>
          {saving ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </div>

      <div className="settings-section">
        <h2>Sifre Degistir</h2>
        {pwMsg && (
          <div style={{
            padding: '10px 14px',
            borderRadius: 8,
            marginBottom: 16,
            fontSize: '0.85rem',
            background: pwMsg.includes('basariyla') ? '#dcfce7' : '#fef2f2',
            color: pwMsg.includes('basariyla') ? '#166534' : '#b91c1c',
            border: `1px solid ${pwMsg.includes('basariyla') ? '#bbf7d0' : '#fca5a5'}`,
          }}>
            {pwMsg}
          </div>
        )}
        <div className="form-group">
          <label>Mevcut Sifre</label>
          <input type="password" value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Yeni Sifre</label>
            <input type="password" value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Yeni Sifre (Tekrar)</label>
            <input type="password" value={pwForm.confirmPassword} onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })} />
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleChangePassword} disabled={!pwForm.currentPassword || !pwForm.newPassword} style={{ marginTop: 8 }}>
          Sifreyi Degistir
        </button>
      </div>
    </div>
  );
}
