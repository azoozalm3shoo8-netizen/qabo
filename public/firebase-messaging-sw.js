importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: "AIzaSyDe2UsCwdgwb-f0Z7n1K-3xhgkmNfLfRKk",
  authDomain: "qabboo-a99d4.firebaseapp.com",
  projectId: "qabboo-a99d4",
  storageBucket: "qabboo-a99d4.firebasestorage.app",
  messagingSenderId: "1022618442262",
  appId: "1:1022618442262:web:42535dff8e820f34e77337"
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const n = payload.notification || {}
  self.registration.showNotification(n.title || 'قبو', {
    body: n.body || 'لديك إشعار جديد',
    icon: '/logo-qabboo.png',
    badge: '/icon-72.png',
    dir: 'rtl',
    lang: 'ar',
    vibrate: [200, 100, 200],
    data: payload.data
  })
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(clients.openWindow(event.notification.data?.url || '/'))
})
