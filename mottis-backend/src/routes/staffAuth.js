/**
 * Barista / Yönetici Auth Routes
 *
 * POST /staff/login   — Personel girişi
 * POST /staff/refresh — Token yenile
 */

const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('../config/db');

function signStaffAccess(staff) {
  return jwt.sign(
    {
      sub:     staff.id,
      email:   staff.email,
      role:    staff.role,
      storeId: staff.store_id,
      type:    'staff',
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
}

function signStaffRefresh(staff) {
  return jwt.sign(
    { sub: staff.id, type: 'staff' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );
}

// ─── POST /staff/login ───────────────────────────────────────────────────────
// E-posta veya kullanıcı adı ile giriş

router.post('/login', async (req, res) => {
  const { email, username, identifier, password } = req.body;
  const loginId = identifier || email || username;
  if (!loginId || !password) return res.status(400).json({ error: 'Kullanıcı adı/e-posta ve şifre gerekli' });

  try {
    const { rows } = await db.query(
      `SELECT s.*, st.name AS store_name
       FROM staff s
       LEFT JOIN stores st ON st.id = s.store_id
       WHERE (s.email = $1 OR s.username = $1) AND s.is_active = TRUE`,
      [loginId]
    );
    const staff = rows[0];
    if (!staff) return res.status(401).json({ error: 'Hatalı giriş bilgileri' });

    // is_active zaten WHERE'de kontrol ediliyor, buraya geldiyse aktif demektir

    const match = await bcrypt.compare(password, staff.password_hash);
    if (!match) return res.status(401).json({ error: 'Hatalı giriş bilgileri' });

    res.json({
      staff: {
        id:        staff.id,
        name:      staff.name,
        username:  staff.username,
        email:     staff.email,
        role:      staff.role,
        isActive:  staff.is_active,
        storeId:   staff.store_id,
        storeName: staff.store_name,
      },
      accessToken:  signStaffAccess(staff),
      refreshToken: signStaffRefresh(staff),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// ─── POST /staff/refresh ─────────────────────────────────────────────────────

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token gerekli' });

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    if (payload.type !== 'staff') return res.status(401).json({ error: 'Geçersiz token' });

    const { rows } = await db.query(
      'SELECT * FROM staff WHERE id = $1 AND is_active = TRUE',
      [payload.sub]
    );
    if (!rows.length) return res.status(401).json({ error: 'Personel bulunamadı' });

    res.json({ accessToken: signStaffAccess(rows[0]) });
  } catch {
    res.status(401).json({ error: 'Geçersiz veya süresi dolmuş refresh token' });
  }
});

module.exports = router;
