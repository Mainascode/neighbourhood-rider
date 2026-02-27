import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyB7DnitVe0AfRrkct8865uMETBrILmbTbM",
  authDomain:
    process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "nitumedoorbellservice-9e02b.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "nitumedoorbellservice-9e02b",
  storageBucket:
    process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "nitumedoorbellservice-9e02b.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "785959342374",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:785959342374:web:76e125382e9b31e29231e7",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-LWW4GWEEQ2",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export let analytics = null;

if (typeof window !== "undefined") {
  isSupported()
    .then((supported) => {
      if (supported) analytics = getAnalytics(app);
    })
    .catch(() => {});
}
