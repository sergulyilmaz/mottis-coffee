/**
 * Barista / Yönetici JWT doğrulama middleware'i
 * Header: Authorization: Bearer <staff_access_token>
 */

const jwt = require('jsonwebtoken');

function staffAuthMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Yetkilendirme token\'ı gerekli' });
  }

  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.type !== 'staff') {
      return res.status(403).json({ error: 'Bu işlem için personel hesabı gerekli' });
    }
    req.staff = { id: payload.sub, email: payload.email, role: payload.role, storeId: payload.storeId };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token süresi doldu', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Geçersiz token' });
  }
}

/**
 * Sadece manager rolüne izin ver
 */
function managerOnly(req, res, next) {
  if (req.staff?.role !== 'manager') {
    return res.status(403).json({ error: 'Bu işlem için yönetici yetkisi gerekli' });
  }
  next();
}

module.exports = { staffAuthMiddleware, managerOnly };
