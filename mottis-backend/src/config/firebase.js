const admin = require('firebase-admin');

let firebaseApp;

function getFirebaseApp() {
  if (!firebaseApp) {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // .env içindeki \n karakterlerini gerçek newline'a çevir
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
  return firebaseApp;
}

module.exports = { getFirebaseApp };
