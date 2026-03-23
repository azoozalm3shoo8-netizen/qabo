export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isPushSupported()) return 'unsupported'
  const result = await Notification.requestPermission()
  if (typeof window !== 'undefined') {
    localStorage.setItem('qabo_push_permission', result)
  }
  return result
}

export function getPermissionStatus(): string {
  if (!isPushSupported()) return 'unsupported'
  return localStorage.getItem('qabo_push_permission') || Notification.permission
}

export function showLocalNotification(title: string, body: string, url?: string): void {
  if (!isPushSupported() || Notification.permission !== 'granted') return
  const n = new Notification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    dir: 'rtl',
    lang: 'ar',
  })
  if (url) {
    n.onclick = () => {
      window.focus()
      window.location.href = url
    }
  }
}
