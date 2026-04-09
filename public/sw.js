/* eslint-disable no-restricted-globals */
/** App shell: الصفحة الرئيسية، صفحة offline التطبيقية، الواجهة الثابتة تُحدَّث عند التصفح (CSS/JS من نفس الأصل). */
const CACHE = 'qabboo-v2'
const OFFLINE = '/offline'

const PRECACHE = ['/', '/offline', '/manifest.json']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE)))
    return
  }

  event.respondWith(
    fetch(request)
      .then((res) => {
        const copy = res.clone()
        if (res.ok && url.origin === self.location.origin) {
          caches.open(CACHE).then((cache) => cache.put(request, copy))
        }
        return res
      })
      .catch(() =>
        caches.match(request).then((cached) => cached || caches.match(OFFLINE))
      )
  )
})
