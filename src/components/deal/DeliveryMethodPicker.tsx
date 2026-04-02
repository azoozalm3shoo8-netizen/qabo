'use client'

import { MapPin, Package, Shield } from '@phosphor-icons/react'
import type { ReactNode } from 'react'

export function DeliveryMethodPicker({
  methods,
}: {
  methods: ('pickup' | 'shipping' | 'safe_zone')[]
}) {
  const items: { id: (typeof methods)[number]; label: string; icon: ReactNode; desc: string }[] = []
  if (methods.includes('pickup'))
    items.push({
      id: 'pickup',
      label: 'استلام شخصي',
      icon: <MapPin className="h-6 w-6 text-[#1B7F7A]" />,
      desc: 'المشتري يأتي لموقعك.',
    })
  if (methods.includes('shipping'))
    items.push({
      id: 'shipping',
      label: 'شحن',
      icon: <Package className="h-6 w-6 text-[#1B7F7A]" />,
      desc: 'التكلفة على المشتري.',
    })
  if (methods.includes('safe_zone'))
    items.push({
      id: 'safe_zone',
      label: 'نقطة آمنة',
      icon: <Shield className="h-6 w-6 text-[#1B7F7A]" />,
      desc: 'تسليم في موقع محايد بالرياض.',
    })

  return (
    <div dir="rtl" className="space-y-3">
      {items.map((m) => (
        <div
          key={m.id}
          className="flex gap-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
        >
          {m.icon}
          <div>
            <p className="font-semibold">{m.label}</p>
            <p className="text-xs text-gray-600 dark:text-slate-400">{m.desc}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
