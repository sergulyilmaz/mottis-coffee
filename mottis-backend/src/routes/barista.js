/**
 * Barista App Routes
 *
 * Tüm endpoint'ler staffAuthMiddleware gerektirir.
 *
 * GET  /barista/me                — Profil bilgileri (ad, şube, günlük işlem)
 * GET  /barista/dashboard         — Ana sayfa verileri (günlük istatistik, son işlemler, kampanyalar)
 * PUT  /barista/me/password       — Şifre değiştir
 */

const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db     = require('../config/db');
const { staffAuthMiddleware } = require('../middleware/staffAuth');

router.use(staffAuthMiddleware);

// ─── GET /barista/me — Profil ────────────────────────────────────────────────

router.get('/me', async (req, res) => {
  try {
    const { rows: [staff] } = await db.query(
      `SELECT s.id, s.name, s.username, s.email, s.phone, s.role,
              s.start_date, s.created_at,
              st.id AS store_id, st.name AS store_name, st.address AS store_address
       FROM staff s
       LEFT JOIN stores st ON st.id = s.store_id
       WHERE s.id = $1`,
      [req.staff.id]
    );
    if (!staff) return res.status(404).json({ error: 'Personel bulunamadı' });

    const { rows: [todayStats] } = await db.query(
      `SELECT COUNT(*)::int AS today_stamps FROM stamps
       WHERE staff_id = $1 AND created_at::date = CURRENT_DATE`,
      [req.staff.id]
    );

    res.json({
      staff,
      todayStamps: todayStats.today_stamps,
    });
  } catch (err) {
    console.error('Barista profile error:', err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// ─── GET /barista/dashboard — Ana sayfa verileri ─────────────────────────────

router.get('/dashboard', async (req, res) => {
  try {
    const staffId = req.staff.id;
    const storeId = req.staff.storeId;

    const [todayStats, recentTransactions, activeCampaigns] = await Promise.all([
      db.query(
        `SELECT
           COUNT(*)::int AS today_stamps,
           COUNT(DISTINCT customer_id)::int AS today_customers
         FROM stamps
         WHERE staff_id = $1 AND created_at::date = CURRENT_DATE`,
        [staffId]
      ),

      db.query(
        `SELECT s.id, s.created_at, c.name AS customer_name,
                (SELECT COUNT(*)::int FROM stamps WHERE customer_id = s.customer_id) AS customer_total_stamps
         FROM stamps s
         LEFT JOIN customers c ON c.id = s.customer_id
         WHERE s.staff_id = $1
         ORDER BY s.created_at DESC
         LIMIT 10`,
        [staffId]
      ),

      db.query(
        `SELECT c.id, c.title, c.description, c.image_url, c.start_date, c.end_date
         FROM campaigns c
         LEFT JOIN campaign_stores cs ON cs.campaign_id = c.id
         WHERE c.is_active = TRUE
           AND c.status = 'active'
           AND c.start_date <= CURRENT_DATE
           AND c.end_date >= CURRENT_DATE
           AND (c.store_id IS NULL OR c.store_id = $1 OR cs.store_id = $1)
         ORDER BY c.created_at DESC
         LIMIT 5`,
        [storeId]
      ),
    ]);

    res.json({
      dashboard: {
        todayStamps:    todayStats.rows[0].today_stamps,
        todayCustomers: todayStats.rows[0].today_customers,
        recentTransactions: recentTransactions.rows,
        activeCampaigns:    activeCampaigns.rows,
      },
    });
  } catch (err) {
    console.error('Barista dashboard error:', err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// ─── PUT /barista/me/password — Şifre değiştir ──────────────────────────────

router.put('/me/password', async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Mevcut şifre ve yeni şifre gerekli' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Yeni şifre en az 6 karakter olmalı' });
  }

  try {
    const { rows: [staff] } = await db.query(
      'SELECT password_hash FROM staff WHERE id = $1',
      [req.staff.id]
    );

    const match = await bcrypt.compare(currentPassword, staff.password_hash);
    if (!match) return res.status(401).json({ error: 'Mevcut şifre hatalı' });

    const hash = await bcrypt.hash(newPassword, 12);
    await db.query('UPDATE staff SET password_hash = $1 WHERE id = $2', [hash, req.staff.id]);

    res.json({ message: 'Şifre güncellendi' });
  } catch (err) {
    console.error('Barista password change error:', err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

module.exports = router;
