/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/12.9.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.9.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyB7DnitVe0AfRrkct8865uMETBrILmbTbM",
  authDomain: "nitumedoorbellservice-9e02b.firebaseapp.com",
  projectId: "nitumedoorbellservice-9e02b",
  storageBucket: "nitumedoorbellservice-9e02b.firebasestorage.app",
  messagingSenderId: "785959342374",
  appId: "1:785959342374:web:76e125382e9b31e29231e7",
  measurementId: "G-LWW4GWEEQ2",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload?.notification?.title || "Neighborhood Rider";
  const notificationOptions = {
    body: payload?.notification?.body || "New update available",
    icon: "/logo.jpeg",
    data: payload?.data || {},
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || "/";
  event.waitUntil(clients.openWindow(targetUrl));
});

