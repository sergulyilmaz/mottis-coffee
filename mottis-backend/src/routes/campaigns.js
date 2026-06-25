/**
 * Kampanya Routes
 *
 * GET  /campaigns        — Aktif kampanyalar (müşteri için)
 *
 * Yönetici:
 * POST   /campaigns      — Yeni kampanya oluştur
 * PUT    /campaigns/:id  — Kampanya güncelle
 * DELETE /campaigns/:id  — Kampanya kaldır
 * POST   /campaigns/:id/notify — Tüm müşterilere push bildirim gönder
 */

const router = require('express').Router();
const db     = require('../config/db');
const { staffAuthMiddleware, managerOnly } = require('../middleware/staffAuth');
const { sendToMultiple } = require('../utils/notifications');

// ─── GET /campaigns ──────────────────────────────────────────────────────────
// ?all=true → admin: tüm kampanyaları getir (draft/past dahil)
// ?status=draft|active|past → filtreleme

router.get('/', async (req, res) => {
  try {
    const { all, status: filterStatus, search } = req.query;

    let where = [];
    let params = [];
    let idx = 1;

    if (all !== 'true') {
      where.push(`c.is_active = TRUE`);
      where.push(`c.start_date <= CURRENT_DATE`);
      where.push(`c.end_date >= CURRENT_DATE`);
    }

    if (filterStatus) {
      where.push(`c.status = $${idx++}`);
      params.push(filterStatus);
    }

    if (search) {
      where.push(`c.title ILIKE $${idx++}`);
      params.push(`%${search}%`);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const { rows } = await db.query(
      `SELECT c.id, c.title, c.description, c.image_url, c.start_date, c.end_date,
              c.type, c.status, c.conditions, c.notes, c.is_active, c.created_at,
              st.name AS store_name
       FROM campaigns c
       LEFT JOIN stores st ON st.id = c.store_id
       ${whereClause}
       ORDER BY c.created_at DESC`,
      params
    );
    res.json({ campaigns: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// ─── GET /campaigns/:id — Kampanya detay ─────────────────────────────────────

router.get('/:id', async (req, res) => {
  try {
    const { rows: [campaign] } = await db.query(
      `SELECT c.*, st.name AS store_name
       FROM campaigns c
       LEFT JOIN stores st ON st.id = c.store_id
       WHERE c.id = $1`,
      [req.params.id]
    );
    if (!campaign) return res.status(404).json({ error: 'Kampanya bulunamadı' });

    const { rows: stores } = await db.query(
      `SELECT s.id, s.name, s.address, s.working_hours
       FROM campaign_stores cs
       JOIN stores s ON s.id = cs.store_id
       WHERE cs.campaign_id = $1 AND s.is_active = TRUE`,
      [req.params.id]
    );

    const { rows: products } = await db.query(
      `SELECT mi.id, mi.name, mi.price, mi.image_url
       FROM campaign_products cp
       JOIN menu_items mi ON mi.id = cp.product_id
       WHERE cp.campaign_id = $1 AND mi.is_active = TRUE`,
      [req.params.id]
    );

    if (!stores.length && campaign.store_id) {
      const { rows: [mainStore] } = await db.query(
        'SELECT id, name, address, working_hours FROM stores WHERE id = $1',
        [campaign.store_id]
      );
      if (mainStore) stores.push(mainStore);
    }

    res.json({
      campaign,
      applicableStores: stores,
      applicableProducts: products,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// ─── POST /campaigns  (Manager) ──────────────────────────────────────────────

router.post('/', staffAuthMiddleware, managerOnly, async (req, res) => {
  const { title, description, imageUrl, startDate, endDate, storeId,
          type, conditions, notes, status, storeIds, productIds } = req.body;
  if (!title || !startDate || !endDate) {
    return res.status(400).json({ error: 'title, startDate ve endDate zorunlu' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const { rows: [campaign] } = await client.query(
      `INSERT INTO campaigns (store_id, title, description, image_url, start_date, end_date, type, conditions, notes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [storeId || null, title, description || null, imageUrl || null, startDate, endDate,
       type || 'other', conditions || null, notes || null, status || 'draft']
    );

    if (storeIds?.length) {
      for (const sid of storeIds) {
        await client.query(
          'INSERT INTO campaign_stores (campaign_id, store_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [campaign.id, sid]
        );
      }
    }

    if (productIds?.length) {
      for (const pid of productIds) {
        await client.query(
          'INSERT INTO campaign_products (campaign_id, product_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [campaign.id, pid]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ campaign });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  } finally {
    client.release();
  }
});

// ─── PUT /campaigns/:id  (Manager) ───────────────────────────────────────────

router.put('/:id', staffAuthMiddleware, managerOnly, async (req, res) => {
  const { title, description, imageUrl, startDate, endDate, isActive,
          type, conditions, notes, status, storeIds, productIds } = req.body;

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const { rows: [campaign] } = await client.query(
      `UPDATE campaigns SET
         title       = COALESCE($1, title),
         description = COALESCE($2, description),
         image_url   = COALESCE($3, image_url),
         start_date  = COALESCE($4, start_date),
         end_date    = COALESCE($5, end_date),
         is_active   = COALESCE($6, is_active),
         type        = COALESCE($7, type),
         conditions  = COALESCE($8, conditions),
         notes       = COALESCE($9, notes),
         status      = COALESCE($10, status)
       WHERE id = $11 RETURNING *`,
      [title, description, imageUrl, startDate, endDate, isActive,
       type, conditions, notes, status, req.params.id]
    );
    if (!campaign) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Kampanya bulunamadı' });
    }

    if (storeIds !== undefined) {
      await client.query('DELETE FROM campaign_stores WHERE campaign_id = $1', [campaign.id]);
      for (const sid of (storeIds || [])) {
        await client.query(
          'INSERT INTO campaign_stores (campaign_id, store_id) VALUES ($1, $2)',
          [campaign.id, sid]
        );
      }
    }

    if (productIds !== undefined) {
      await client.query('DELETE FROM campaign_products WHERE campaign_id = $1', [campaign.id]);
      for (const pid of (productIds || [])) {
        await client.query(
          'INSERT INTO campaign_products (campaign_id, product_id) VALUES ($1, $2)',
          [campaign.id, pid]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ campaign });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  } finally {
    client.release();
  }
});

// ─── DELETE /campaigns/:id  (Manager) ────────────────────────────────────────

router.delete('/:id', staffAuthMiddleware, managerOnly, async (req, res) => {
  await db.query('UPDATE campaigns SET is_active = FALSE WHERE id = $1', [req.params.id]);
  res.json({ message: 'Kampanya kaldırıldı' });
});

// ─── POST /campaigns/:id/notify  (Manager) ───────────────────────────────────
// Yeni kampanya için tüm müşterilere push bildirim gönder

router.post('/:id/notify', staffAuthMiddleware, managerOnly, async (req, res) => {
  try {
    const { rows: [campaign] } = await db.query(
      'SELECT title FROM campaigns WHERE id = $1 AND is_active = TRUE',
      [req.params.id]
    );
    if (!campaign) return res.status(404).json({ error: 'Kampanya bulunamadı' });

    const { rows } = await db.query(
      'SELECT fcm_token FROM customers WHERE fcm_token IS NOT NULL'
    );
    const tokens = rows.map((r) => r.fcm_token);

    await sendToMultiple(tokens, '🎉 Yeni Kampanya!', campaign.title, { type: 'NEW_CAMPAIGN' });

    res.json({ message: `Bildirim gönderildi (${tokens.length} cihaz)` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

module.exports = router;
