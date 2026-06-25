/**
 * Müşteri Routes
 *
 * GET  /me                    — Profil + pul sayısı + aktif ödüller
 * GET  /me/qr                 — Dinamik QR token üret
 * GET  /me/rewards            — İkram kahve listesi
 * GET  /me/history            — Kahve geçmişi (detaylı)
 * GET  /me/notifications      — Bildirim listesi
 * PUT  /me/notifications/read — Bildirimleri okundu işaretle
 * GET  /me/notification-prefs — Bildirim tercihleri
 * PUT  /me/notification-prefs — Bildirim tercihleri güncelle
 * PUT  /me                    — Profil güncelle
 * PUT  /me/password           — Şifre değiştir
 * PUT  /me/fcm                — FCM token güncelle
 * PUT  /me/preferences        — Tema/dil ayarları
 */

const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const db   = require('../config/db');
const auth = require('../middleware/auth');
const { generateQRToken } = require('../utils/qr');

// ─── GET /me ────────────────────────────────────────────────────────────────

router.get('/', auth, async (req, res) => {
  try {
    const { rows: [customer] } = await db.query(
      `SELECT id, name, email, phone, birth_date, gender, profile_photo,
              dark_mode, language, created_at
       FROM customers WHERE id = $1`,
      [req.customer.id]
    );
    if (!customer) return res.status(404).json({ error: 'Müşteri bulunamadı' });

    // Toplam pul sayısı
    const { rows: [stampRow] } = await db.query(
      'SELECT COUNT(*)::int AS total FROM stamps WHERE customer_id = $1',
      [req.customer.id]
    );

    // Kullanılmamış ödüller
    const { rows: rewards } = await db.query(
      `SELECT id, created_at FROM rewards
       WHERE customer_id = $1 AND redeemed_at IS NULL
       ORDER BY created_at ASC`,
      [req.customer.id]
    );

    const stampsPerReward = parseInt(process.env.STAMPS_PER_REWARD || '8', 10);
    const totalStamps     = stampRow.total;

    // Mevcut karttaki ilerleme (son ödülden sonraki pullar)
    const usedForRewards  = rewards.length * stampsPerReward; // ödüller için kullanılan pullar
    // Tüm zamanlar toplamdan hesapla
    const { rows: [allRewardRow] } = await db.query(
      'SELECT COUNT(*)::int AS total FROM rewards WHERE customer_id = $1',
      [req.customer.id]
    );
    const stampsOnCard = totalStamps - (allRewardRow.total * stampsPerReward);

    res.json({
      customer,
      loyalty: {
        stampsOnCurrentCard: stampsOnCard,
        stampsNeeded: stampsPerReward,
        progress: `${stampsOnCard}/${stampsPerReward}`,
        availableRewards: rewards.length,
        totalStampsAllTime: totalStamps,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// ─── GET /me/qr ─────────────────────────────────────────────────────────────

router.get('/qr', auth, async (req, res) => {
  const qr = generateQRToken(req.customer.id);
  res.json(qr);
  // Mobil uygulama bu token'ı QR kütüphanesiyle render eder
  // TTL süresi dolunca tekrar endpoint'i çağırarak yeniler
});

// ─── PUT /me ─────────────────────────────────────────────────────────────────

router.put(
  '/',
  auth,
  [
    body('name').optional().trim().notEmpty().withMessage('İsim boş olamaz'),
    body('phone').optional().isMobilePhone().withMessage('Geçerli bir telefon numarası girin'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { name, phone, birthDate, gender, profilePhoto } = req.body;
    try {
      const { rows: [updated] } = await db.query(
        `UPDATE customers
         SET name          = COALESCE($1, name),
             phone         = COALESCE($2, phone),
             birth_date    = COALESCE($3, birth_date),
             gender        = COALESCE($4, gender),
             profile_photo = COALESCE($5, profile_photo)
         WHERE id = $6
         RETURNING id, name, email, phone, birth_date, gender, profile_photo`,
        [name || null, phone || null, birthDate || null, gender || null, profilePhoto || null, req.customer.id]
      );
      res.json({ customer: updated });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }
);

// ─── PUT /me/password ────────────────────────────────────────────────────────

router.put(
  '/password',
  auth,
  [
    body('currentPassword').notEmpty().withMessage('Mevcut şifre gerekli'),
    body('newPassword').isLength({ min: 6 }).withMessage('Yeni şifre en az 6 karakter olmalı'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { currentPassword, newPassword } = req.body;
    try {
      const { rows: [customer] } = await db.query(
        'SELECT password_hash FROM customers WHERE id = $1',
        [req.customer.id]
      );

      const match = await bcrypt.compare(currentPassword, customer.password_hash);
      if (!match) return res.status(401).json({ error: 'Mevcut şifre hatalı' });

      const hash = await bcrypt.hash(newPassword, 12);
      await db.query('UPDATE customers SET password_hash = $1 WHERE id = $2', [hash, req.customer.id]);
      res.json({ message: 'Şifre güncellendi' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }
);

// ─── PUT /me/fcm ─────────────────────────────────────────────────────────────

router.put('/fcm', auth, async (req, res) => {
  const { fcmToken } = req.body;
  if (!fcmToken) return res.status(400).json({ error: 'fcmToken gerekli' });
  await db.query('UPDATE customers SET fcm_token = $1 WHERE id = $2', [fcmToken, req.customer.id]);
  res.json({ message: 'FCM token güncellendi' });
});

// ─── PUT /me/preferences — Tema / Dil ayarları ──────────────────────────────

router.put('/preferences', auth, async (req, res) => {
  const { darkMode, language } = req.body;
  try {
    const { rows: [updated] } = await db.query(
      `UPDATE customers SET
         dark_mode = COALESCE($1, dark_mode),
         language  = COALESCE($2, language)
       WHERE id = $3
       RETURNING dark_mode, language`,
      [darkMode, language, req.customer.id]
    );
    res.json({ preferences: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// ─── GET /me/rewards — İkram kahve listesi ──────────────────────────────────

router.get('/rewards', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT r.id, r.created_at AS earned_at, r.redeemed_at,
              rs.name AS redeemed_store_name
       FROM rewards r
       LEFT JOIN stores rs ON rs.id = r.redeemed_store_id
       WHERE r.customer_id = $1
       ORDER BY r.created_at DESC`,
      [req.customer.id]
    );
    res.json({
      rewards: rows,
      available: rows.filter(r => !r.redeemed_at).length,
      total: rows.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// ─── GET /me/history — Kahve geçmişi (detaylı) ─────────────────────────────

router.get('/history', auth, async (req, res) => {
  try {
    const { limit = 30, offset = 0 } = req.query;
    const { rows } = await db.query(
      `SELECT s.id, s.created_at, st.name AS store_name, st.id AS store_id
       FROM stamps s
       LEFT JOIN stores st ON st.id = s.store_id
       WHERE s.customer_id = $1
       ORDER BY s.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.customer.id, parseInt(limit), parseInt(offset)]
    );
    res.json({ history: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// ─── GET /me/notifications — Bildirim listesi ───────────────────────────────

router.get('/notifications', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, type, title, body, data, is_read, created_at
       FROM notifications
       WHERE customer_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.customer.id]
    );

    const { rows: [countRow] } = await db.query(
      'SELECT COUNT(*)::int AS unread FROM notifications WHERE customer_id = $1 AND is_read = FALSE',
      [req.customer.id]
    );

    res.json({ notifications: rows, unreadCount: countRow.unread });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// ─── PUT /me/notifications/read — Bildirimleri okundu işaretle ──────────────

router.put('/notifications/read', auth, async (req, res) => {
  try {
    const { ids } = req.body;
    if (ids?.length) {
      await db.query(
        'UPDATE notifications SET is_read = TRUE WHERE customer_id = $1 AND id = ANY($2)',
        [req.customer.id, ids]
      );
    } else {
      await db.query(
        'UPDATE notifications SET is_read = TRUE WHERE customer_id = $1',
        [req.customer.id]
      );
    }
    res.json({ message: 'Bildirimler okundu olarak işaretlendi' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// ─── GET /me/notification-prefs — Bildirim tercihleri ────────────────────────

router.get('/notification-prefs', auth, async (req, res) => {
  try {
    let { rows: [prefs] } = await db.query(
      'SELECT coffee_updates, campaign_news, branch_updates, general_updates FROM notification_preferences WHERE customer_id = $1',
      [req.customer.id]
    );
    if (!prefs) {
      await db.query('INSERT INTO notification_preferences (customer_id) VALUES ($1)', [req.customer.id]);
      prefs = { coffee_updates: true, campaign_news: true, branch_updates: true, general_updates: true };
    }
    res.json({ preferences: prefs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// ─── PUT /me/notification-prefs — Bildirim tercihleri güncelle ───────────────

router.put('/notification-prefs', auth, async (req, res) => {
  const { coffeeUpdates, campaignNews, branchUpdates, generalUpdates } = req.body;
  try {
    const { rows: [prefs] } = await db.query(
      `INSERT INTO notification_preferences (customer_id, coffee_updates, campaign_news, branch_updates, general_updates)
       VALUES ($1, COALESCE($2, TRUE), COALESCE($3, TRUE), COALESCE($4, TRUE), COALESCE($5, TRUE))
       ON CONFLICT (customer_id) DO UPDATE SET
         coffee_updates  = COALESCE($2, notification_preferences.coffee_updates),
         campaign_news   = COALESCE($3, notification_preferences.campaign_news),
         branch_updates  = COALESCE($4, notification_preferences.branch_updates),
         general_updates = COALESCE($5, notification_preferences.general_updates)
       RETURNING coffee_updates, campaign_news, branch_updates, general_updates`,
      [req.customer.id, coffeeUpdates, campaignNews, branchUpdates, generalUpdates]
    );
    res.json({ preferences: prefs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

module.exports = router;
