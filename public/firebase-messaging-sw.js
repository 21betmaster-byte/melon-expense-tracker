// Firebase Messaging Service Worker
// Handles background push notifications when the app is not in focus.

importScripts("https://www.gstatic.com/firebasejs/11.8.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.8.1/firebase-messaging-compat.js");

// Public Firebase config values — safe to hardcode in the service worker.
// SW files in /public cannot access process.env or Next.js build-time
// substitution.  These values are already exposed in the client JS bundle
// via NEXT_PUBLIC_* env vars.  This is the standard Firebase-documented
// approach for FCM service workers.
firebase.initializeApp({
  apiKey: "AIzaSyADu8qTYHjKlDres9dcMfL5qYwtnHfFTYY",
  authDomain: "couples-expense-tracker-82977.firebaseapp.com",
  projectId: "couples-expense-tracker-82977",
  storageBucket: "couples-expense-tracker-82977.firebasestorage.app",
  messagingSenderId: "982223982412",
  appId: "1:982223982412:web:c6d4b70839caee277109e9",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? "Melon";
  const options = {
    body: payload.notification?.body ?? "You have a new notification.",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    data: {
      url: payload.data?.url ?? "/dashboard",
    },
  };

  self.registration.showNotification(title, options);
});

// Navigate to app when notification is clicked
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/dashboard";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // Focus existing window if available
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Otherwise open a new window
      return clients.openWindow(url);
    })
  );
});
