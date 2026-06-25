/**
 * Şube Routes
 *
 * GET /stores           — Tüm şubeler (opsiyonel: lat/lng ile yakına göre sırala)
 * GET /stores/:id       — Tek şube detayı
 *
 * Yönetici:
 * POST /stores          — Yeni şube ekle
 * PUT  /stores/:id      — Şube güncelle
 */

const router = require('express').Router();
const db     = require('../config/db');
const { staffAuthMiddleware, managerOnly } = require('../middleware/staffAuth');

// ─── GET /stores ──────────────────────────────────────────────────────────────
// ?lat=41.0054&lng=28.9768  → yakından uzağa sırala (Haversine formülü)
// ?all=true → admin: tüm şubeleri getir (kapalılar dahil)
// ?status=open|closed|temporarily_closed → filtreleme
// ?search=keyword → arama

router.get('/', async (req, res) => {
  try {
    const { lat, lng, all, status: filterStatus, search } = req.query;

    let where = [];
    let params = [];
    let idx = 1;

    if (all !== 'true') {
      where.push('is_active = TRUE');
    }

    if (filterStatus) {
      where.push(`status = $${idx++}`);
      params.push(filterStatus);
    }

    if (search) {
      where.push(`(name ILIKE $${idx} OR address ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    let query;
    if (lat && lng) {
      query = `
        SELECT
          id, name, address, district, lat, lng, phone, email, working_hours, image_url, status, is_active,
          ROUND(
            (6371 * acos(
              cos(radians($${idx})) * cos(radians(lat))
              * cos(radians(lng) - radians($${idx + 1}))
              + sin(radians($${idx})) * sin(radians(lat))
            ))::numeric, 2
          ) AS distance_km
        FROM stores
        ${whereClause}
        ORDER BY distance_km ASC`;
      params.push(parseFloat(lat), parseFloat(lng));
    } else {
      query = `SELECT id, name, address, district, lat, lng, phone, email, working_hours, image_url, status, is_active
               FROM stores ${whereClause} ORDER BY name`;
    }

    const { rows } = await db.query(query, params);
    res.json({ stores: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// ─── GET /stores/:id ──────────────────────────────────────────────────────────

router.get('/:id', async (req, res) => {
  try {
    const { rows: [store] } = await db.query(
      'SELECT * FROM stores WHERE id = $1',
      [req.params.id]
    );
    if (!store) return res.status(404).json({ error: 'Şube bulunamadı' });

    const { rows: [stats] } = await db.query(
      `SELECT COUNT(*)::int AS today_stamps
       FROM stamps WHERE store_id = $1 AND created_at::date = CURRENT_DATE`,
      [req.params.id]
    );

    res.json({ store, todayStamps: stats.today_stamps });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// ─── POST /stores  (Manager) ──────────────────────────────────────────────────

router.post('/', staffAuthMiddleware, managerOnly, async (req, res) => {
  const { name, address, district, lat, lng, phone, email, workingHours, imageUrl, status } = req.body;
  if (!name || !address || lat == null || lng == null) {
    return res.status(400).json({ error: 'name, address, lat ve lng zorunlu' });
  }
  try {
    const { rows: [store] } = await db.query(
      `INSERT INTO stores (name, address, district, lat, lng, phone, email, working_hours, image_url, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [name, address, district || null, lat, lng, phone || null, email || null,
       workingHours || null, imageUrl || null, status || 'open']
    );
    res.status(201).json({ store });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// ─── PUT /stores/:id  (Manager) ───────────────────────────────────────────────

router.put('/:id', staffAuthMiddleware, managerOnly, async (req, res) => {
  const { name, address, district, lat, lng, phone, email, workingHours, imageUrl, status, isActive } = req.body;
  try {
    const { rows: [store] } = await db.query(
      `UPDATE stores SET
         name          = COALESCE($1, name),
         address       = COALESCE($2, address),
         district      = COALESCE($3, district),
         lat           = COALESCE($4, lat),
         lng           = COALESCE($5, lng),
         phone         = COALESCE($6, phone),
         email         = COALESCE($7, email),
         working_hours = COALESCE($8, working_hours),
         image_url     = COALESCE($9, image_url),
         status        = COALESCE($10, status),
         is_active     = COALESCE($11, is_active)
       WHERE id = $12 RETURNING *`,
      [name, address, district, lat, lng, phone, email, workingHours, imageUrl, status, isActive, req.params.id]
    );
    if (!store) return res.status(404).json({ error: 'Şube bulunamadı' });
    res.json({ store });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

module.exports = router;
