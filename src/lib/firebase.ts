import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
}

function getApp(): FirebaseApp | null {
  if (typeof window === 'undefined') return null
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) return null
  return getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]!
}

export async function requestFirebaseNotificationToken(): Promise<string | null> {
  try {
    const supported = await isSupported()
    if (!supported) return null
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return null
    const app = getApp()
    if (!app) return null
    const messaging = getMessaging(app)
    return await getToken(messaging, { vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || '' })
  } catch {
    return null
  }
}

export function onForegroundMessage(cb: (payload: unknown) => void) {
  if (typeof window === 'undefined') return
  void isSupported().then((ok) => {
    if (!ok) return
    const app = getApp()
    if (!app) return
    onMessage(getMessaging(app), cb)
  })
}
