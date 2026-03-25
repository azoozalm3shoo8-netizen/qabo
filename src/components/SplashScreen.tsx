'use client'

import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useLocale } from '@/lib/locale-context'

export function SplashScreen() {
  const { t, dir } = useLocale()
  const [visible, setVisible] = useState(false)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return
      if (sessionStorage.getItem('splash_shown')) return
      setVisible(true)
      const fadeTimer = window.setTimeout(() => setExiting(true), 2000)
      const hideTimer = window.setTimeout(() => {
        sessionStorage.setItem('splash_shown', '1')
        setVisible(false)
      }, 2000 + 400)
      return () => {
        window.clearTimeout(fadeTimer)
        window.clearTimeout(hideTimer)
      }
    } catch {
      setVisible(false)
    }
  }, [])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#1B7F7A]"
          dir={dir}
          initial={{ opacity: 1 }}
          animate={{ opacity: exiting ? 0 : 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
        >
          <motion.div
            className="relative flex flex-col items-center"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            <div
              className="relative mb-6 rounded-2xl p-4"
              style={{
                boxShadow:
                  '0 0 60px 20px rgba(255,255,255,0.35), 0 0 100px 40px rgba(255,255,255,0.15)',
              }}
            >
              <Image
                src="/logo-qabboo.png"
                alt={t('common_appName')}
                width={240}
                height={240}
                className="h-[120px] w-auto object-contain"
                priority
              />
            </div>
            <motion.p
              className="text-[28px] font-bold text-white [font-family:var(--font-inter),Inter,system-ui,sans-serif]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.3 }}
            >
              qabboo
            </motion.p>
            <motion.p
              className="mt-1 text-[36px] font-extrabold text-white"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.3 }}
            >
              {t('common_appName')}
            </motion.p>
            <motion.p
              className="mt-3 text-base font-normal text-white/70"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.3 }}
            >
              {t('home_tagline')}
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
