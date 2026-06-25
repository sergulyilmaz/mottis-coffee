/**
 * Destek & İletişim Routes
 *
 * GET   /support/faq            — Sıkça Sorulan Sorular
 * POST  /support/bug-report     — Sorun bildir (müşteri)
 *
 * Admin (Manager):
 * GET   /support/bug-reports            — Tüm sorun bildirimleri
 * PUT   /support/bug-reports/:id        — Sorun durumu güncelle
 * POST  /support/faq                    — SSS ekle
 * PUT   /support/faq/:id               — SSS güncelle
 * DELETE /support/faq/:id              — SSS sil
 */

const router = require('express').Router();
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');
const { staffAuthMiddleware, managerOnly } = require('../middleware/staffAuth');

// ─── GET /support/faq — Sıkça Sorulan Sorular ──────────────────────────────

router.get('/faq', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, question, answer FROM faqs WHERE is_active = TRUE ORDER BY sort_order, id'
    );
    res.json({ faqs: rows });
  } catch (err) {
    console.error('FAQ error:', err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// ─── POST /support/bug-report — Sorun bildir ────────────────────────────────

router.post('/bug-report', authMiddleware, async (req, res) => {
  const { type, description, screenshot } = req.body;

  if (!type || !description) {
    return res.status(400).json({ error: 'Sorun türü ve açıklama gerekli' });
  }

  const validTypes = ['technical', 'feature_request', 'review'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: 'Geçersiz sorun türü. Geçerli: technical, feature_request, review' });
  }

  try {
    const { rows: [report] } = await db.query(
      `INSERT INTO bug_reports (customer_id, type, description, screenshot)
       VALUES ($1, $2, $3, $4)
       RETURNING id, type, description, status, created_at`,
      [req.customer.id, type, description, screenshot || null]
    );

    res.status(201).json({
      report,
      message: 'Sorun bildiriminiz alındı. En kısa sürede incelenecektir.',
    });
  } catch (err) {
    console.error('Bug report error:', err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN: SSS ve Sorun Yönetimi
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/bug-reports', staffAuthMiddleware, managerOnly, async (req, res) => {
  try {
    const { status } = req.query;
    let where = '';
    let params = [];

    if (status) {
      where = 'AND b.status = $1';
      params.push(status);
    }

    const { rows } = await db.query(
      `SELECT b.id, b.type, b.description, b.screenshot, b.status,
              b.admin_note, b.created_at, b.updated_at,
              c.name AS customer_name, c.email AS customer_email
       FROM bug_reports b
       JOIN customers c ON c.id = b.customer_id
       WHERE 1=1 ${where}
       ORDER BY b.created_at DESC`,
      params
    );
    res.json({ bugReports: rows });
  } catch (err) {
    console.error('List bug reports error:', err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.put('/bug-reports/:id', staffAuthMiddleware, managerOnly, async (req, res) => {
  const { status, adminNote } = req.body;
  try {
    const { rows: [report] } = await db.query(
      `UPDATE bug_reports SET
         status     = COALESCE($1, status),
         admin_note = COALESCE($2, admin_note),
         updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [status, adminNote, req.params.id]
    );
    if (!report) return res.status(404).json({ error: 'Sorun bildirimi bulunamadı' });
    res.json({ report });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.post('/faq', staffAuthMiddleware, managerOnly, async (req, res) => {
  const { question, answer, sortOrder } = req.body;
  if (!question || !answer) return res.status(400).json({ error: 'Soru ve cevap gerekli' });

  try {
    const { rows: [faq] } = await db.query(
      'INSERT INTO faqs (question, answer, sort_order) VALUES ($1, $2, $3) RETURNING *',
      [question, answer, sortOrder || 0]
    );
    res.status(201).json({ faq });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.put('/faq/:id', staffAuthMiddleware, managerOnly, async (req, res) => {
  const { question, answer, sortOrder, isActive } = req.body;
  try {
    const { rows: [faq] } = await db.query(
      `UPDATE faqs SET
         question   = COALESCE($1, question),
         answer     = COALESCE($2, answer),
         sort_order = COALESCE($3, sort_order),
         is_active  = COALESCE($4, is_active)
       WHERE id = $5 RETURNING *`,
      [question, answer, sortOrder, isActive, req.params.id]
    );
    if (!faq) return res.status(404).json({ error: 'SSS bulunamadı' });
    res.json({ faq });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.delete('/faq/:id', staffAuthMiddleware, managerOnly, async (req, res) => {
  await db.query('UPDATE faqs SET is_active = FALSE WHERE id = $1', [req.params.id]);
  res.json({ message: 'SSS kaldırıldı' });
});

module.exports = router;
