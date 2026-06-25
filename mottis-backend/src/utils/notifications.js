/**
 * FCM Push Bildirimleri
 *
 * Kullanım senaryoları:
 *  - 8. pul tamamlandı → ikram kazandı
 *  - Yeni kampanya eklendi
 *  - İkram kahve kullanıldı (opsiyonel)
 */

const admin = require('firebase-admin');
const { getFirebaseApp } = require('../config/firebase');

/**
 * Tek bir cihaza bildirim gönderir.
 * @param {string} fcmToken  - Müşterinin FCM token'ı
 * @param {string} title
 * @param {string} body
 * @param {object} data      - Ek payload (opsiyonel)
 */
async function sendToDevice(fcmToken, title, body, data = {}) {
  if (!fcmToken) return; // Token yoksa sessizce geç

  try {
    getFirebaseApp(); // init once
    await admin.messaging().send({
      token: fcmToken,
      notification: { title, body },
      data,
      apns: {
        payload: { aps: { sound: 'default', badge: 1 } },
      },
      android: {
        notification: { sound: 'default', channelId: 'mottis_loyalty' },
      },
    });
  } catch (err) {
    // Bildirim hatası uygulamayı durdurmamalı — sadece logla
    console.warn('FCM bildirim hatası:', err.message);
  }
}

/**
 * Müşteri 8 pul tamamladı → ikram kazandı
 */
async function notifyRewardEarned(fcmToken) {
  await sendToDevice(
    fcmToken,
    '☕ İkram Kahveniz Hazır!',
    '8 kahvenizi tamamladınız. Mottis Coffee\'da bir ücretsiz kahve sizi bekliyor!',
    { type: 'REWARD_EARNED' }
  );
}

/**
 * Yeni kampanya yayınlandı (tüm müşterilere toplu bildirim için kullanılır)
 */
async function notifyNewCampaign(fcmToken, campaignTitle) {
  await sendToDevice(
    fcmToken,
    '🎉 Yeni Kampanya!',
    campaignTitle,
    { type: 'NEW_CAMPAIGN' }
  );
}

/**
 * Toplu bildirim — birden fazla FCM token listesine gönder
 * Firebase'in sendEachForMulticast ile 500'lük batch'ler desteklenir.
 */
async function sendToMultiple(fcmTokens, title, body, data = {}) {
  if (!fcmTokens?.length) return;
  getFirebaseApp();

  // 500'lük batch'lere böl (Firebase limiti)
  const chunks = [];
  for (let i = 0; i < fcmTokens.length; i += 500) {
    chunks.push(fcmTokens.slice(i, i + 500));
  }

  for (const chunk of chunks) {
    try {
      await admin.messaging().sendEachForMulticast({
        tokens: chunk,
        notification: { title, body },
        data,
      });
    } catch (err) {
      console.warn('Toplu FCM hatası:', err.message);
    }
  }
}

module.exports = { sendToDevice, notifyRewardEarned, notifyNewCampaign, sendToMultiple };
