import admin from 'firebase-admin';
import { FCM_SERVICE_ACCOUNT_JSON } from './env.js';

let serviceAccount = {};
try {
  serviceAccount = JSON.parse(FCM_SERVICE_ACCOUNT_JSON);
} catch (error) {
  console.warn('Failed to parse FCM_SERVICE_ACCOUNT_JSON:', error.message);
}

if (serviceAccount && serviceAccount.project_id) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} else {
  console.warn('Firebase Admin not initialized: FCM_SERVICE_ACCOUNT_JSON is missing or invalid.');
}

export const messaging = (serviceAccount && serviceAccount.project_id) ? admin.messaging() : null;
export default admin;
