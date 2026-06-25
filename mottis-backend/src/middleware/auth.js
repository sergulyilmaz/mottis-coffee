/**
 * Müşteri JWT doğrulama middleware'i
 * Header: Authorization: Bearer <access_token>
 */

const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Yetkilendirme token\'ı gerekli' });
  }

  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.customer = { id: payload.sub, email: payload.email };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token süresi doldu', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Geçersiz token' });
  }
}

module.exports = authMiddleware;
