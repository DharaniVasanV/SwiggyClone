const admin = require('firebase-admin');

// For local development, we can use environment variables for service account details
// or use the application default credentials if running in a Google Cloud environment.
// In a real scenario, you should download your serviceAccountKey.json and point to it.

if (!admin.apps.length) {
  try {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './service-account.json';
    const fs = require('fs');
    const path = require('path');
    const projectId = process.env.FIREBASE_PROJECT_ID || 'swiggy-clone-99cf3';
    const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`;
    
    const fullPath = path.resolve(process.cwd(), serviceAccountPath);
    
    if (fs.existsSync(fullPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket
      });
      console.log('Firebase initialized with service account file');
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket
      });
      console.log('Firebase initialized with service account env string');
    } else {
      admin.initializeApp({
        projectId,
        storageBucket
      });
      console.log('Firebase initialized with Project ID');
    }
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
}

const db = admin.firestore();
const auth = admin.auth();
const bucket = admin.storage().bucket();

module.exports = { db, auth, admin, bucket };
