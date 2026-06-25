/**
 * Pul & Ödül Routes (Barista tarafı)
 *
 * POST /stamps/scan    — QR oku → pul ekle → gerekirse ödül oluştur
 * POST /stamps/redeem  — Ödül kahveyi kullan
 * GET  /stamps/history — Müşteri geçmişi (barista görür)
 *
 * Müşteri auth routes:
 * GET  /stamps/me      — Kendi pul geçmişi (müşteri tarafı)
 */

const router = require('express').Router();
const db     = require('../config/db');
const { staffAuthMiddleware } = require('../middleware/staffAuth');
const authMiddleware          = require('../middleware/auth');
const { verifyQRToken }       = require('../utils/qr');
const { notifyRewardEarned }  = require('../utils/notifications');

const STAMPS_PER_REWARD = () => parseInt(process.env.STAMPS_PER_REWARD || '8', 10);

// ─── POST /stamps/scan  (Barista) ────────────────────────────────────────────

router.post('/scan', staffAuthMiddleware, async (req, res) => {
  const { qrToken } = req.body;
  if (!qrToken) return res.status(400).json({ error: 'qrToken gerekli' });

  // 1. QR doğrula
  const result = verifyQRToken(qrToken);
  if (!result.valid) return res.status(400).json({ error: result.error });

  const customerId = result.customerId;
  const storeId    = req.staff.storeId;
  const staffId    = req.staff.id;

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 2. Pul ekle
    await client.query(
      'INSERT INTO stamps (customer_id, store_id, staff_id) VALUES ($1, $2, $3)',
      [customerId, storeId, staffId]
    );

    // 3. Toplam pul sayısı
    const { rows: [row] } = await client.query(
      'SELECT COUNT(*)::int AS total FROM stamps WHERE customer_id = $1',
      [customerId]
    );
    const totalStamps = row.total;

    // 4. Toplam oluşturulan ödül sayısı
    const { rows: [rewardRow] } = await client.query(
      'SELECT COUNT(*)::int AS total FROM rewards WHERE customer_id = $1',
      [customerId]
    );
    const totalRewards = rewardRow.total;

    // 5. Yeni ödül hak edildi mi?
    const stampsPerReward  = STAMPS_PER_REWARD();
    const earnedRewards    = Math.floor(totalStamps / stampsPerReward);
    let newRewardCreated   = false;

    if (earnedRewards > totalRewards) {
      // Yeni ikram kahve hakkı kazandı
      await client.query(
        'INSERT INTO rewards (customer_id) VALUES ($1)',
        [customerId]
      );
      newRewardCreated = true;
    }

    await client.query('COMMIT');

    // 6. Push bildirim (transaction dışında — hata olursa işlemi etkilemez)
    if (newRewardCreated) {
      const { rows: [cust] } = await db.query(
        'SELECT fcm_token FROM customers WHERE id = $1',
        [customerId]
      );
      if (cust?.fcm_token) notifyRewardEarned(cust.fcm_token);
    }

    const stampsOnCard = totalStamps - (Math.floor(totalStamps / stampsPerReward) * stampsPerReward);

    const { rows: [custInfo] } = await db.query(
      'SELECT name FROM customers WHERE id = $1',
      [customerId]
    );

    const { rows: [rewardInfo] } = await db.query(
      `SELECT COUNT(*)::int AS available FROM rewards
       WHERE customer_id = $1 AND redeemed_at IS NULL`,
      [customerId]
    );

    res.json({
      success: true,
      customerId,
      customerName: custInfo?.name || 'Bilinmeyen',
      stampsOnCard: newRewardCreated ? 0 : stampsOnCard,
      stampsNeeded: stampsPerReward,
      availableRewards: rewardInfo.available + (newRewardCreated ? 1 : 0),
      newRewardEarned: newRewardCreated,
      message: newRewardCreated
        ? '🎉 Müşteri ikram kahve kazandı!'
        : `Pul eklendi (${newRewardCreated ? 0 : stampsOnCard}/${stampsPerReward})`,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  } finally {
    client.release();
  }
});

// ─── POST /stamps/redeem  (Barista) ─────────────────────────────────────────

router.post('/redeem', staffAuthMiddleware, async (req, res) => {
  const { customerId } = req.body;
  if (!customerId) return res.status(400).json({ error: 'customerId gerekli' });

  try {
    // Kullanılmamış en eski ödülü al
    const { rows: [reward] } = await db.query(
      `SELECT id FROM rewards
       WHERE customer_id = $1 AND redeemed_at IS NULL
       ORDER BY created_at ASC
       LIMIT 1`,
      [customerId]
    );

    if (!reward) return res.status(404).json({ error: 'Kullanılabilir ikram kahvesi yok' });

    await db.query(
      `UPDATE rewards
       SET redeemed_at = NOW(), redeemed_store_id = $1, redeemed_by = $2
       WHERE id = $3`,
      [req.staff.storeId, req.staff.id, reward.id]
    );

    res.json({ success: true, rewardId: reward.id, message: 'İkram kahve kullanıldı ✓' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// ─── GET /stamps/me  (Müşteri — kendi geçmişi) ───────────────────────────────

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT s.id, s.created_at, st.name AS store_name
       FROM stamps s
       LEFT JOIN stores st ON st.id = s.store_id
       WHERE s.customer_id = $1
       ORDER BY s.created_at DESC
       LIMIT 50`,
      [req.customer.id]
    );
    res.json({ stamps: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

module.exports = router;
