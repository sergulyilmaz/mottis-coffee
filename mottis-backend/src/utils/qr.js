/**
 * Dinamik QR Token Sistemi
 *
 * Müşteri /me/qr endpoint'ini her çağırdığında yeni bir token üretilir.
 * Token: HMAC-SHA256(customerId + ":" + issuedAt, QR_SECRET)
 * Barista QR'ı okutunca token doğrulanır + TTL kontrol edilir.
 *
 * Güvenlik: 60 saniye sonra geçersiz → ekran görüntüsü işe yaramaz.
 */

const crypto = require('crypto');

const QR_SECRET = process.env.QR_SECRET || 'degistir_beni';
const QR_TTL    = parseInt(process.env.QR_TTL_SECONDS || '60', 10);

/**
 * Müşteri için imzalı QR payload üretir.
 * @param {number} customerId
 * @returns {{ token: string, issuedAt: number, expiresAt: number }}
 */
function generateQRToken(customerId) {
  const issuedAt = Math.floor(Date.now() / 1000); // Unix timestamp (saniye)
  const payload  = `${customerId}:${issuedAt}`;
  const signature = crypto
    .createHmac('sha256', QR_SECRET)
    .update(payload)
    .digest('hex');

  // QR'da encode edilecek string → mobil app bunu QR olarak render eder
  const token = Buffer.from(JSON.stringify({ cid: customerId, iat: issuedAt, sig: signature })).toString('base64url');

  return {
    token,
    issuedAt,
    expiresAt: issuedAt + QR_TTL,
    ttl: QR_TTL,
  };
}

/**
 * Barista tarafından okutulan QR token'ını doğrular.
 * @param {string} token - base64url encoded token
 * @returns {{ valid: boolean, customerId?: number, error?: string }}
 */
function verifyQRToken(token) {
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
    const { cid, iat, sig } = decoded;

    if (!cid || !iat || !sig) return { valid: false, error: 'Geçersiz token formatı' };

    // TTL kontrolü
    const now = Math.floor(Date.now() / 1000);
    if (now - iat > QR_TTL) {
      return { valid: false, error: 'QR kodunun süresi doldu. Müşteriden yeni kod isteyin.' };
    }

    // İmza doğrulama
    const expectedSig = crypto
      .createHmac('sha256', QR_SECRET)
      .update(`${cid}:${iat}`)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(sig, 'hex'),
      Buffer.from(expectedSig, 'hex')
    );

    if (!isValid) return { valid: false, error: 'Geçersiz imza' };

    return { valid: true, customerId: cid };
  } catch {
    return { valid: false, error: 'Token çözümlenemedi' };
  }
}

module.exports = { generateQRToken, verifyQRToken };
