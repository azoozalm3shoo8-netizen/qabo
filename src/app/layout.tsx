import type { Metadata } from "next";
import { Tajawal, Inter } from "next/font/google";
import { PageFade } from "@/components/PageFade";
import { ToastProvider } from "@/components/Toast";
import "./globals.css";

const tajawal = Tajawal({
  weight: ['400', '500', '700'],
  subsets: ['arabic'],
  variable: '--font-tajawal',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: "Qabo - Arabic Auction Platform",
  description: "Arabic auction platform for Saudi Arabia",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${tajawal.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-50">
        <ToastProvider>
          <PageFade>{children}</PageFade>
        </ToastProvider>
      </body>
    </html>
  );
}
