/**
 * Admin Panel Routes
 *
 * Tüm endpoint'ler staffAuth + managerOnly middleware gerektirir.
 *
 * GET    /admin/dashboard              — Genel özet (bugünkü işlemler, aktif müşteriler vb.)
 *
 * GET    /admin/baristas               — Barista listesi (filtreleme: storeId, search, isActive)
 * POST   /admin/baristas               — Yeni barista oluştur
 * GET    /admin/baristas/:id           — Barista detay
 * PUT    /admin/baristas/:id           — Barista güncelle
 * DELETE /admin/baristas/:id           — Barista devre dışı bırak
 *
 * GET    /admin/customers              — Müşteri listesi (search, sayfalama)
 * GET    /admin/customers/:id          — Müşteri detay + sadakat durumu
 *
 * GET    /admin/stats                  — Genel istatistikler (tarih aralığı)
 * GET    /admin/stats/stores           — Şubelere göre işlem dağılımı
 * GET    /admin/stats/products         — Ürünlere göre işlem dağılımı
 * GET    /admin/stats/baristas         — Barista performans listesi
 *
 * GET    /admin/settings               — İşletme ayarları
 * PUT    /admin/settings               — Ayarları güncelle
 * PUT    /admin/settings/password      — Admin şifre değiştir
 */

const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db     = require('../config/db');
const { staffAuthMiddleware, managerOnly } = require('../middleware/staffAuth');

router.use(staffAuthMiddleware, managerOnly);

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const [
      todayStamps,
      todayRewards,
      activeCustomers,
      openStores,
      recentTransactions,
    ] = await Promise.all([
      db.query(
        `SELECT COUNT(*)::int AS count FROM stamps WHERE created_at::date = $1`,
        [today]
      ),
      db.query(
        `SELECT COUNT(*)::int AS count FROM rewards WHERE created_at::date = $1`,
        [today]
      ),
      db.query(
        `SELECT COUNT(*)::int AS count FROM customers`
      ),
      db.query(
        `SELECT COUNT(*)::int AS count FROM stores WHERE is_active = TRUE AND status = 'open'`
      ),
      db.query(
        `SELECT s.id, s.created_at, c.name AS customer_name, st.name AS store_name,
                stf.name AS staff_name
         FROM stamps s
         LEFT JOIN customers c  ON c.id  = s.customer_id
         LEFT JOIN stores    st ON st.id = s.store_id
         LEFT JOIN staff     stf ON stf.id = s.staff_id
         ORDER BY s.created_at DESC
         LIMIT 20`
      ),
    ]);

    res.json({
      dashboard: {
        todayStamps:      todayStamps.rows[0].count,
        todayRewards:     todayRewards.rows[0].count,
        activeCustomers:  activeCustomers.rows[0].count,
        openStores:       openStores.rows[0].count,
        recentTransactions: recentTransactions.rows,
      },
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// BARISTA CRUD
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/baristas', async (req, res) => {
  try {
    const { storeId, search, isActive } = req.query;
    let where = ['1=1'];
    let params = [];
    let idx = 1;

    if (storeId) {
      where.push(`s.store_id = $${idx++}`);
      params.push(parseInt(storeId));
    }
    if (search) {
      where.push(`(s.name ILIKE $${idx} OR s.username ILIKE $${idx} OR s.email ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }
    if (isActive !== undefined) {
      where.push(`s.is_active = $${idx++}`);
      params.push(isActive === 'true');
    }

    const { rows } = await db.query(
      `SELECT s.id, s.name, s.username, s.email, s.phone, s.role,
              s.is_active, s.start_date, s.notes, s.created_at,
              st.id AS store_id, st.name AS store_name
       FROM staff s
       LEFT JOIN stores st ON st.id = s.store_id
       WHERE s.role = 'barista' AND ${where.join(' AND ')}
       ORDER BY s.created_at DESC`,
      params
    );

    res.json({ baristas: rows });
  } catch (err) {
    console.error('List baristas error:', err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.post('/baristas', async (req, res) => {
  const { name, username, email, phone, password, storeId, startDate, notes } = req.body;

  if (!name || !username || !password) {
    return res.status(400).json({ error: 'name, username ve password zorunlu' });
  }

  try {
    const existing = await db.query(
      'SELECT id FROM staff WHERE username = $1 OR email = $2',
      [username, email || null]
    );
    if (existing.rows.length) {
      return res.status(409).json({ error: 'Bu kullanıcı adı veya e-posta zaten kayıtlı' });
    }

    const hash = await bcrypt.hash(password, 12);

    const { rows: [barista] } = await db.query(
      `INSERT INTO staff (name, username, email, phone, password_hash, role, store_id, start_date, notes)
       VALUES ($1, $2, $3, $4, $5, 'barista', $6, $7, $8)
       RETURNING id, name, username, email, phone, role, store_id, is_active, start_date, notes, created_at`,
      [name, username, email || null, phone || null, hash, storeId || null, startDate || null, notes || null]
    );

    res.status(201).json({
      barista,
      credentials: { username, password },
    });
  } catch (err) {
    console.error('Create barista error:', err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.get('/baristas/:id', async (req, res) => {
  try {
    const { rows: [barista] } = await db.query(
      `SELECT s.id, s.name, s.username, s.email, s.phone, s.role,
              s.is_active, s.start_date, s.notes, s.created_at,
              st.id AS store_id, st.name AS store_name
       FROM staff s
       LEFT JOIN stores st ON st.id = s.store_id
       WHERE s.id = $1 AND s.role = 'barista'`,
      [req.params.id]
    );
    if (!barista) return res.status(404).json({ error: 'Barista bulunamadı' });

    const { rows: [perf] } = await db.query(
      `SELECT COUNT(*)::int AS total_stamps FROM stamps WHERE staff_id = $1`,
      [req.params.id]
    );

    res.json({ barista, performance: { totalStamps: perf.total_stamps } });
  } catch (err) {
    console.error('Get barista error:', err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.put('/baristas/:id', async (req, res) => {
  const { name, username, email, phone, password, storeId, isActive, startDate, notes } = req.body;
  try {
    let hash = null;
    if (password) {
      hash = await bcrypt.hash(password, 12);
    }

    const { rows: [barista] } = await db.query(
      `UPDATE staff SET
         name       = COALESCE($1, name),
         username   = COALESCE($2, username),
         email      = COALESCE($3, email),
         phone      = COALESCE($4, phone),
         password_hash = COALESCE($5, password_hash),
         store_id   = COALESCE($6, store_id),
         is_active  = COALESCE($7, is_active),
         start_date = COALESCE($8, start_date),
         notes      = COALESCE($9, notes)
       WHERE id = $10 AND role = 'barista'
       RETURNING id, name, username, email, phone, role, store_id, is_active, start_date, notes`,
      [name, username, email, phone, hash, storeId, isActive, startDate, notes, req.params.id]
    );
    if (!barista) return res.status(404).json({ error: 'Barista bulunamadı' });
    res.json({ barista });
  } catch (err) {
    console.error('Update barista error:', err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.delete('/baristas/:id', async (req, res) => {
  try {
    const { rows: [barista] } = await db.query(
      `UPDATE staff SET is_active = FALSE WHERE id = $1 AND role = 'barista' RETURNING id, name`,
      [req.params.id]
    );
    if (!barista) return res.status(404).json({ error: 'Barista bulunamadı' });
    res.json({ message: `${barista.name} devre dışı bırakıldı` });
  } catch (err) {
    console.error('Delete barista error:', err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// MÜŞTERI LİSTESİ
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/customers', async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = '1=1';
    let params = [parseInt(limit), offset];
    let idx = 3;

    if (search) {
      where = `(c.name ILIKE $${idx} OR c.email ILIKE $${idx} OR c.phone ILIKE $${idx})`;
      params.push(`%${search}%`);
    }

    const [countResult, dataResult] = await Promise.all([
      db.query(`SELECT COUNT(*)::int AS total FROM customers c WHERE ${where}`, params.slice(2)),
      db.query(
        `SELECT c.id, c.name, c.email, c.phone, c.created_at,
                COUNT(s.id)::int AS total_stamps,
                COUNT(DISTINCT r.id) FILTER (WHERE r.redeemed_at IS NULL)::int AS available_rewards
         FROM customers c
         LEFT JOIN stamps  s ON s.customer_id = c.id
         LEFT JOIN rewards r ON r.customer_id = c.id
         WHERE ${where}
         GROUP BY c.id
         ORDER BY c.created_at DESC
         LIMIT $1 OFFSET $2`,
        params
      ),
    ]);

    res.json({
      customers: dataResult.rows,
      pagination: {
        total: countResult.rows[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countResult.rows[0].total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('List customers error:', err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.get('/customers/:id', async (req, res) => {
  try {
    const { rows: [customer] } = await db.query(
      'SELECT id, name, email, phone, created_at FROM customers WHERE id = $1',
      [req.params.id]
    );
    if (!customer) return res.status(404).json({ error: 'Müşteri bulunamadı' });

    const stampsPerReward = parseInt(process.env.STAMPS_PER_REWARD || '8', 10);

    const [stampsResult, rewardsResult, historyResult] = await Promise.all([
      db.query('SELECT COUNT(*)::int AS total FROM stamps WHERE customer_id = $1', [req.params.id]),
      db.query(
        `SELECT id, created_at, redeemed_at FROM rewards
         WHERE customer_id = $1 ORDER BY created_at DESC`,
        [req.params.id]
      ),
      db.query(
        `SELECT s.created_at, st.name AS store_name, stf.name AS staff_name
         FROM stamps s
         LEFT JOIN stores st ON st.id = s.store_id
         LEFT JOIN staff stf ON stf.id = s.staff_id
         WHERE s.customer_id = $1
         ORDER BY s.created_at DESC
         LIMIT 30`,
        [req.params.id]
      ),
    ]);

    const totalStamps = stampsResult.rows[0].total;
    const totalRewards = rewardsResult.rows.length;
    const stampsOnCard = totalStamps - (Math.floor(totalStamps / stampsPerReward) * stampsPerReward);

    res.json({
      customer,
      loyalty: {
        stampsOnCurrentCard: stampsOnCard,
        stampsNeeded: stampsPerReward,
        totalStampsAllTime: totalStamps,
        availableRewards: rewardsResult.rows.filter(r => !r.redeemed_at).length,
        rewards: rewardsResult.rows,
      },
      recentHistory: historyResult.rows,
    });
  } catch (err) {
    console.error('Get customer error:', err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// İSTATİSTİKLER
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/stats', async (req, res) => {
  try {
    const { startDate, endDate, period = 'daily' } = req.query;

    const start = startDate || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const end   = endDate   || new Date().toISOString().slice(0, 10);

    let dateTrunc;
    switch (period) {
      case 'weekly':  dateTrunc = 'week';  break;
      case 'monthly': dateTrunc = 'month'; break;
      default:        dateTrunc = 'day';
    }

    const [totals, timeline, topCustomers] = await Promise.all([
      db.query(
        `SELECT
           (SELECT COUNT(*)::int FROM stamps  WHERE created_at::date BETWEEN $1 AND $2)  AS total_stamps,
           (SELECT COUNT(*)::int FROM rewards WHERE created_at::date BETWEEN $1 AND $2)  AS total_rewards,
           (SELECT COUNT(*)::int FROM customers)                                          AS total_customers,
           (SELECT COUNT(*)::int FROM customers WHERE created_at::date BETWEEN $1 AND $2) AS new_customers`,
        [start, end]
      ),
      db.query(
        `SELECT
           DATE_TRUNC($3, created_at)::date AS period,
           COUNT(*)::int AS stamps
         FROM stamps
         WHERE created_at::date BETWEEN $1 AND $2
         GROUP BY DATE_TRUNC($3, created_at)
         ORDER BY period`,
        [start, end, dateTrunc]
      ),
      db.query(
        `SELECT c.id, c.name, COUNT(s.id)::int AS stamp_count
         FROM customers c
         JOIN stamps s ON s.customer_id = c.id
         WHERE s.created_at::date BETWEEN $1 AND $2
         GROUP BY c.id, c.name
         ORDER BY stamp_count DESC
         LIMIT 10`,
        [start, end]
      ),
    ]);

    res.json({
      stats: {
        period: { start, end, groupBy: period },
        totals: totals.rows[0],
        timeline: timeline.rows,
        topCustomers: topCustomers.rows,
      },
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.get('/stats/stores', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const end   = endDate   || new Date().toISOString().slice(0, 10);

    const { rows } = await db.query(
      `SELECT
         st.id, st.name,
         COUNT(s.id)::int AS total_stamps,
         COUNT(DISTINCT s.customer_id)::int AS unique_customers,
         COUNT(DISTINCT r.id) FILTER (WHERE r.redeemed_store_id = st.id)::int AS redeemed_rewards
       FROM stores st
       LEFT JOIN stamps  s ON s.store_id = st.id AND s.created_at::date BETWEEN $1 AND $2
       LEFT JOIN rewards r ON r.redeemed_store_id = st.id AND r.redeemed_at::date BETWEEN $1 AND $2
       WHERE st.is_active = TRUE
       GROUP BY st.id, st.name
       ORDER BY total_stamps DESC`,
      [start, end]
    );

    res.json({ storeStats: rows });
  } catch (err) {
    console.error('Store stats error:', err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.get('/stats/products', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT
         mi.id, mi.name, mc.name AS category,
         mi.price, mi.is_featured, mi.is_active
       FROM menu_items mi
       LEFT JOIN menu_categories mc ON mc.id = mi.category_id
       ORDER BY mc.display_order, mi.display_order, mi.name`
    );
    res.json({ productStats: rows });
  } catch (err) {
    console.error('Product stats error:', err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.get('/stats/baristas', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const end   = endDate   || new Date().toISOString().slice(0, 10);

    const { rows } = await db.query(
      `SELECT
         stf.id, stf.name, stf.username, st.name AS store_name,
         COUNT(s.id)::int AS total_stamps,
         COUNT(DISTINCT s.customer_id)::int AS unique_customers
       FROM staff stf
       LEFT JOIN stamps s  ON s.staff_id = stf.id AND s.created_at::date BETWEEN $1 AND $2
       LEFT JOIN stores st ON st.id = stf.store_id
       WHERE stf.role = 'barista' AND stf.is_active = TRUE
       GROUP BY stf.id, stf.name, stf.username, st.name
       ORDER BY total_stamps DESC`,
      [start, end]
    );

    res.json({ baristaStats: rows });
  } catch (err) {
    console.error('Barista stats error:', err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// AYARLAR
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/settings', async (req, res) => {
  try {
    const { rows: [settings] } = await db.query('SELECT * FROM settings WHERE id = 1');
    if (!settings) {
      await db.query(
        `INSERT INTO settings (business_name, stamps_per_reward) VALUES ('Mottis Coffee', 8)`
      );
      return res.json({ settings: { business_name: "Mottis Coffee", stamps_per_reward: 8 } });
    }
    res.json({ settings });
  } catch (err) {
    console.error('Get settings error:', err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.put('/settings', async (req, res) => {
  const { businessName, logoUrl, phone, email, address, website, stampsPerReward } = req.body;
  try {
    const { rows: [settings] } = await db.query(
      `UPDATE settings SET
         business_name   = COALESCE($1, business_name),
         logo_url        = COALESCE($2, logo_url),
         phone           = COALESCE($3, phone),
         email           = COALESCE($4, email),
         address         = COALESCE($5, address),
         website         = COALESCE($6, website),
         stamps_per_reward = COALESCE($7, stamps_per_reward),
         updated_at      = NOW()
       WHERE id = 1
       RETURNING *`,
      [businessName, logoUrl, phone, email, address, website, stampsPerReward]
    );
    res.json({ settings });
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.put('/settings/password', async (req, res) => {
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
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

module.exports = router;
