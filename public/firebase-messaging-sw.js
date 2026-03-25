// خلفية إشعارات ويب — يعمل مع FCM عند إرسال حمولة JSON قياسية
self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = {}
  }
  const n = payload.notification || {}
  const title = n.title || 'قبو'
  const body = n.body || 'لديك إشعار جديد'
  const url = (payload.data && payload.data.url) || '/'
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/logo-qabboo.png',
      badge: '/logo-qabboo.png',
      data: { url },
      lang: 'ar',
      dir: 'rtl',
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(self.clients.openWindow(url))
})
