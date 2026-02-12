import admin from "firebase-admin";

let app = null;

export function getFirebaseApp() {
  if (app) return app;

  const base64 = process.env.FCM_SERVICE_ACCOUNT_BASE64;
  const json = process.env.FCM_SERVICE_ACCOUNT_JSON;

  let serviceAccount = null;
  if (base64) {
    const raw = Buffer.from(base64, "base64").toString("utf-8");
    serviceAccount = JSON.parse(raw);
  } else if (json) {
    serviceAccount = JSON.parse(json);
  } else {
    throw new Error("FCM service account not configured in env");
  }

  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  return app;
}

export function getMessaging() {
  const firebaseApp = getFirebaseApp();
  return admin.getMessaging(firebaseApp);
}
