import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { Inter, Noto_Sans_Arabic } from 'next/font/google'
import { AppProviders } from '@/components/AppProviders'
import { NotificationSetup } from '@/components/NotificationSetup'
import { PageFade } from '@/components/PageFade'
import { InstallPrompt } from '@/components/pwa/InstallPrompt'
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister'
import { ToastProvider } from '@/components/Toast'
import './globals.css'

const notoArabic = Noto_Sans_Arabic({
  subsets: ['arabic'],
  variable: '--font-arabic',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'قبو Qabboo — منصة المزادات الذكية',
    template: '%s — قبو Qabboo',
  },
  description:
    'منصة مزادات سعودية في السعودية. زايد، اربح، واستلم بأمان. متاح حالياً في الرياض.',
  keywords: ['مزاد', 'مزادات', 'قبو', 'Qabboo', 'auction', 'السعودية', 'الرياض', 'بيع', 'شراء'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'قبو',
  },
  icons: {
    apple: '/icon-192.png',
  },
  openGraph: {
    title: 'قبو Qabboo — منصة المزادات',
    description: 'زايد على آلاف المنتجات بأسعار تنافسية.',
    type: 'website',
    locale: 'ar_SA',
    siteName: 'قبو Qabboo',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'قبو Qabboo',
    description: 'منصة مزادات عربية ذكية',
  },
  robots: {
    index: true,
    follow: true,
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
      className={`${notoArabic.variable} ${inter.variable} h-full antialiased`}
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
            <InstallPrompt />
            <NotificationSetup />
          </ToastProvider>
        </AppProviders>
      </body>
    </html>
  )
}
