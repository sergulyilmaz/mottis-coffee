import { useEffect, useState } from 'react';
import api from '../api';

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');
  const [replyModal, setReplyModal] = useState(null);
  const [replyText, setReplyText] = useState('');

  const load = () => {
    setLoading(true);
    if (tab === 'pending') {
      api.get('/reviews/pending').then(d => setReviews(d.pendingReviews || [])).catch(console.error).finally(() => setLoading(false));
    } else {
      api.get('/reviews/pending').then(all => {
        setReviews([]);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  };

  useEffect(() => { load(); }, [tab]);

  const handleApprove = async (id) => {
    try {
      await api.put(`/reviews/${id}/approve`);
      load();
    } catch (err) {
      alert(err.error || 'Hata olustu');
    }
  };

  const handleReject = async (id) => {
    try {
      await api.put(`/reviews/${id}/reject`);
      load();
    } catch (err) {
      alert(err.error || 'Hata olustu');
    }
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;
    try {
      await api.put(`/reviews/${replyModal}/reply`, { reply: replyText });
      setReplyModal(null);
      setReplyText('');
      load();
    } catch (err) {
      alert(err.error || 'Hata olustu');
    }
  };

  const renderStars = (rating) => '★'.repeat(rating) + '☆'.repeat(5 - rating);

  return (
    <div>
      <div className="page-header">
        <h1>Yorumlar</h1>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'pending' ? 'active' : ''}`} onClick={() => setTab('pending')}>
          Onay Bekleyenler
        </button>
        <button className={`tab ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>
          Tum Yorumlar
        </button>
      </div>

      {loading ? <div className="loading">Yukleniyor...</div> : reviews.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">⭐</div>
          <p>{tab === 'pending' ? 'Onay bekleyen yorum yok.' : 'Yorum bulunamadi.'}</p>
        </div>
      ) : (
        reviews.map(r => (
          <div key={r.id} className={`review-card ${r.status === 'pending' ? 'pending' : ''}`}>
            <div className="review-header">
              <div>
                <strong>{r.customer_name}</strong>
                <span className="review-meta" style={{ marginLeft: 12 }}>{r.store_name}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="review-stars">{renderStars(r.rating)}</div>
                <div className="review-meta">{new Date(r.created_at).toLocaleDateString('tr-TR')}</div>
              </div>
            </div>
            {r.content && <div className="review-content">{r.content}</div>}
            {r.admin_reply && (
              <div style={{ background: '#f5f0eb', padding: '10px 14px', borderRadius: 8, marginBottom: 12, fontSize: '0.88rem' }}>
                <strong style={{ color: '#6f4e37' }}>Yanitiniz:</strong> {r.admin_reply}
              </div>
            )}
            <div className="review-actions">
              {r.status === 'pending' && (
                <>
                  <button className="btn btn-sm btn-primary" onClick={() => handleApprove(r.id)}>Onayla</button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleReject(r.id)}>Reddet</button>
                </>
              )}
              <button className="btn btn-sm btn-secondary" onClick={() => { setReplyModal(r.id); setReplyText(r.admin_reply || ''); }}>
                {r.admin_reply ? 'Yaniti Duzenle' : 'Yanitla'}
              </button>
            </div>
          </div>
        ))
      )}

      {replyModal && (
        <div className="modal-overlay" onClick={() => setReplyModal(null)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Yorum Yanitla</h3>
              <button className="modal-close" onClick={() => setReplyModal(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Yanitiniz</label>
                <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Musteri yorumuna yanitinizi yazin..." />
              </div>
              <div className="form-actions">
                <button className="btn btn-secondary" onClick={() => setReplyModal(null)}>Iptal</button>
                <button className="btn btn-primary" onClick={handleReply} disabled={!replyText.trim()}>Gonder</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
