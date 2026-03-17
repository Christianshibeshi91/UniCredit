'use strict';

const { env } = require('./env');

let admin = null;
let db = null;
let firebaseEnabled = false;

/**
 * Initialize Firebase Admin SDK.
 * In development, runs without Firebase if no service account is provided.
 * In production, Firebase is mandatory (validated by env.js).
 */
function initializeFirebase() {
  if (env.isTest) {
    // In test environment, Firebase is mocked
    return { admin: null, db: null, firebaseEnabled: false };
  }

  try {
    admin = require('firebase-admin');

    if (env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      let serviceAccount;
      try {
        serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
      } catch (parseErr) {
        console.error('FATAL: FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON');
        if (env.isProduction) {
          process.exit(1);
        }
        return { admin: null, db: null, firebaseEnabled: false };
      }

      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      }

      db = admin.firestore();
      firebaseEnabled = true;
      console.log('Firebase Admin initialized');
    } else {
      console.log('Firebase: No service account found, running without Firestore');
    }
  } catch (err) {
    console.error('Firebase initialization error:', err.message);
    if (env.isProduction) {
      process.exit(1);
    }
  }

  return { admin, db, firebaseEnabled };
}

// Initialize on import
const firebase = initializeFirebase();

module.exports = {
  admin: firebase.admin,
  db: firebase.db,
  firebaseEnabled: firebase.firebaseEnabled,
  FieldValue: firebase.admin ? firebase.admin.firestore.FieldValue : null,
};
