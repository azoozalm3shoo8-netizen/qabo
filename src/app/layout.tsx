import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { Cairo, Inter } from 'next/font/google'
import { AppProviders } from '@/components/AppProviders'
import { NotificationSetup } from '@/components/NotificationSetup'
import { PageFade } from '@/components/PageFade'
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister'
import { ToastProvider } from '@/components/Toast'
import './globals.css'

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  variable: '--font-cairo',
  weight: ['400', '600', '700', '800'],
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'قبو Qabboo — منصة المزادات',
  description: 'منصة مزادات عربية في السعودية',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'قبو',
  },
  icons: {
    apple: '/icon-192.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#1B7F7A',
}

const themeScript = `(function(){try{var t=localStorage.getItem('qabboo-theme')||localStorage.getItem('qabboo_theme');if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} ${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-[#F3F4F6] font-sans dark:bg-slate-900">
        <Script id="qabboo-theme" strategy="beforeInteractive">
          {themeScript}
        </Script>
        <AppProviders>
          <ServiceWorkerRegister />
          <ToastProvider>
            <PageFade>{children}</PageFade>
            <NotificationSetup />
          </ToastProvider>
        </AppProviders>
      </body>
    </html>
  )
}
