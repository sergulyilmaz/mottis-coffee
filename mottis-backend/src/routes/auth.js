/**
 * Müşteri Auth Routes
 *
 * POST /auth/register   — Kayıt
 * POST /auth/login      — Giriş → access + refresh token
 * POST /auth/refresh    — Refresh token ile yeni access token
 * POST /auth/logout     — FCM token temizle (opsiyonel)
 */

const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db      = require('../config/db');
const authMiddleware = require('../middleware/auth');

// ─── Yardımcı: token üret ───────────────────────────────────────────────────

function signAccess(customer) {
  return jwt.sign(
    { sub: customer.id, email: customer.email, type: 'customer' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
}

function signRefresh(customer) {
  return jwt.sign(
    { sub: customer.id, type: 'customer' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );
}

// ─── POST /auth/register ────────────────────────────────────────────────────

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('İsim zorunlu'),
    body('email').isEmail().normalizeEmail().withMessage('Geçerli bir e-posta girin'),
    body('password').isLength({ min: 6 }).withMessage('Şifre en az 6 karakter olmalı'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { name, email, password, phone, birthDate, gender } = req.body;

    try {
      const exists = await db.query('SELECT id FROM customers WHERE email = $1', [email]);
      if (exists.rows.length) return res.status(409).json({ error: 'Bu e-posta zaten kayıtlı' });

      if (phone) {
        const phoneExists = await db.query('SELECT id FROM customers WHERE phone = $1', [phone]);
        if (phoneExists.rows.length) return res.status(409).json({ error: 'Bu telefon numarası zaten kayıtlı' });
      }

      const hash = await bcrypt.hash(password, 12);
      const { rows } = await db.query(
        `INSERT INTO customers (name, email, phone, password_hash, birth_date, gender)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, name, email, phone`,
        [name, email, phone || null, hash, birthDate || null, gender || null]
      );
      const customer = rows[0];

      await db.query(
        'INSERT INTO notification_preferences (customer_id) VALUES ($1) ON CONFLICT DO NOTHING',
        [customer.id]
      );

      res.status(201).json({
        customer,
        accessToken:  signAccess(customer),
        refreshToken: signRefresh(customer),
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }
);

// ─── POST /auth/login ───────────────────────────────────────────────────────

router.post(
  '/login',
  [
    body('password').notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { email, phone, identifier, password, fcmToken } = req.body;
    const loginId = identifier || email || phone;
    if (!loginId) return res.status(400).json({ error: 'E-posta veya telefon gerekli' });

    try {
      const { rows } = await db.query(
        'SELECT id, name, email, phone, password_hash FROM customers WHERE email = $1 OR phone = $1',
        [loginId]
      );
      const customer = rows[0];
      if (!customer) return res.status(401).json({ error: 'E-posta/telefon veya şifre hatalı' });

      const match = await bcrypt.compare(password, customer.password_hash);
      if (!match) return res.status(401).json({ error: 'E-posta veya şifre hatalı' });

      // FCM token güncelle (mobil uygulama her girişte gönderir)
      if (fcmToken) {
        await db.query('UPDATE customers SET fcm_token = $1 WHERE id = $2', [fcmToken, customer.id]);
      }

      res.json({
        customer: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone },
        accessToken:  signAccess(customer),
        refreshToken: signRefresh(customer),
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }
);

// ─── POST /auth/refresh ─────────────────────────────────────────────────────

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token gerekli' });

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const { rows } = await db.query('SELECT id, name, email FROM customers WHERE id = $1', [payload.sub]);
    if (!rows.length) return res.status(401).json({ error: 'Müşteri bulunamadı' });

    res.json({ accessToken: signAccess(rows[0]) });
  } catch {
    res.status(401).json({ error: 'Geçersiz veya süresi dolmuş refresh token' });
  }
});

// ─── POST /auth/logout ──────────────────────────────────────────────────────

router.post('/logout', authMiddleware, async (req, res) => {
  await db.query('UPDATE customers SET fcm_token = NULL WHERE id = $1', [req.customer.id]);
  res.json({ message: 'Çıkış yapıldı' });
});

module.exports = router;
