/**
 * Yorum Routes
 *
 * GET    /reviews/stores/:storeId       — Şubeye ait yorumlar (sıralama: newest, highest, lowest)
 * POST   /reviews/stores/:storeId       — Yorum ekle (müşteri)
 * POST   /reviews/:id/vote              — Faydalı/Faydasız oy ver
 *
 * Admin (Manager):
 * GET    /reviews/pending               — Onay bekleyen yorumlar
 * PUT    /reviews/:id/approve           — Yorumu onayla
 * PUT    /reviews/:id/reject            — Yorumu reddet
 * PUT    /reviews/:id/reply             — Admin yanıtı ekle
 */

const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');
const { staffAuthMiddleware, managerOnly } = require('../middleware/staffAuth');

// ─── GET /reviews/stores/:storeId — Şube yorumları ──────────────────────────

router.get('/stores/:storeId', async (req, res) => {
  try {
    const { sort = 'newest' } = req.query;

    let orderBy;
    switch (sort) {
      case 'highest': orderBy = 'r.rating DESC, r.created_at DESC'; break;
      case 'lowest':  orderBy = 'r.rating ASC, r.created_at DESC';  break;
      default:        orderBy = 'r.created_at DESC';
    }

    const { rows: reviews } = await db.query(
      `SELECT r.id, r.rating, r.title, r.content, r.photos, r.created_at,
              r.admin_reply, r.admin_replied_at,
              c.name AS customer_name, c.profile_photo AS customer_photo,
              (SELECT COUNT(*) FILTER (WHERE is_helpful = TRUE)::int  FROM review_votes WHERE review_id = r.id) AS helpful_count,
              (SELECT COUNT(*) FILTER (WHERE is_helpful = FALSE)::int FROM review_votes WHERE review_id = r.id) AS unhelpful_count
       FROM reviews r
       JOIN customers c ON c.id = r.customer_id
       WHERE r.store_id = $1 AND r.is_approved = TRUE
       ORDER BY ${orderBy}`,
      [req.params.storeId]
    );

    const { rows: [stats] } = await db.query(
      `SELECT
         COUNT(*)::int AS total_reviews,
         ROUND(AVG(rating)::numeric, 1) AS average_rating
       FROM reviews
       WHERE store_id = $1 AND is_approved = TRUE`,
      [req.params.storeId]
    );

    res.json({
      reviews,
      stats: {
        totalReviews:  stats.total_reviews,
        averageRating: parseFloat(stats.average_rating) || 0,
      },
    });
  } catch (err) {
    console.error('Get reviews error:', err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// ─── POST /reviews/stores/:storeId — Yorum ekle ─────────────────────────────

router.post(
  '/stores/:storeId',
  authMiddleware,
  [
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating 1-5 arasında olmalı'),
    body('content').trim().isLength({ min: 10, max: 500 }).withMessage('Yorum 10-500 karakter arasında olmalı'),
    body('title').optional().trim().isLength({ max: 100 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { rating, title, content, photos } = req.body;

    try {
      const { rows: [review] } = await db.query(
        `INSERT INTO reviews (customer_id, store_id, rating, title, content, photos)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, rating, title, content, photos, is_approved, created_at`,
        [req.customer.id, req.params.storeId, rating, title || null, content, photos || []]
      );

      res.status(201).json({
        review,
        message: 'Yorumunuz eklendi! Yönetici onayından sonra yayınlanacaktır.',
      });
    } catch (err) {
      console.error('Create review error:', err);
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }
);

// ─── POST /reviews/:id/vote — Faydalı/Faydasız oy ──────────────────────────

router.post('/:id/vote', authMiddleware, async (req, res) => {
  const { isHelpful } = req.body;
  if (isHelpful === undefined) return res.status(400).json({ error: 'isHelpful gerekli' });

  try {
    await db.query(
      `INSERT INTO review_votes (review_id, customer_id, is_helpful)
       VALUES ($1, $2, $3)
       ON CONFLICT (review_id, customer_id) DO UPDATE SET is_helpful = $3`,
      [req.params.id, req.customer.id, isHelpful]
    );
    res.json({ message: 'Oyunuz kaydedildi' });
  } catch (err) {
    console.error('Vote error:', err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN: Yorum Moderasyonu
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/pending', staffAuthMiddleware, managerOnly, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT r.id, r.rating, r.title, r.content, r.photos, r.created_at,
              c.name AS customer_name, st.name AS store_name
       FROM reviews r
       JOIN customers c ON c.id = r.customer_id
       JOIN stores st   ON st.id = r.store_id
       WHERE r.is_approved = FALSE
       ORDER BY r.created_at ASC`
    );
    res.json({ pendingReviews: rows });
  } catch (err) {
    console.error('Pending reviews error:', err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.put('/:id/approve', staffAuthMiddleware, managerOnly, async (req, res) => {
  try {
    const { rows: [review] } = await db.query(
      'UPDATE reviews SET is_approved = TRUE, updated_at = NOW() WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (!review) return res.status(404).json({ error: 'Yorum bulunamadı' });
    res.json({ message: 'Yorum onaylandı' });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.put('/:id/reject', staffAuthMiddleware, managerOnly, async (req, res) => {
  try {
    await db.query('DELETE FROM reviews WHERE id = $1', [req.params.id]);
    res.json({ message: 'Yorum silindi' });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.put('/:id/reply', staffAuthMiddleware, managerOnly, async (req, res) => {
  const { reply } = req.body;
  if (!reply) return res.status(400).json({ error: 'Yanıt metni gerekli' });

  try {
    const { rows: [review] } = await db.query(
      `UPDATE reviews SET admin_reply = $1, admin_replied_at = NOW(), updated_at = NOW()
       WHERE id = $2 RETURNING id, admin_reply, admin_replied_at`,
      [reply, req.params.id]
    );
    if (!review) return res.status(404).json({ error: 'Yorum bulunamadı' });
    res.json({ review });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

module.exports = router;
