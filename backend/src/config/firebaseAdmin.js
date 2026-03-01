import admin from "firebase-admin";

let app = null;

function normalizePrivateKey(key = "") {
  return key.replace(/\\n/g, "\n");
}

export function getFirebaseApp() {
  if (app) return app;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY || "");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Firebase Admin env not configured (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)");
  }

  app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });

  return app;
}

export function getMessaging() {
  return admin.messaging(getFirebaseApp());
}

export function getFirebaseAuth() {
  return admin.auth(getFirebaseApp());
}

export function getFirestore() {
  return admin.firestore(getFirebaseApp());
}

export function getStorageBucket() {
  const appInstance = getFirebaseApp();
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID}.appspot.com`;
  return admin.storage(appInstance).bucket(bucketName);
}
