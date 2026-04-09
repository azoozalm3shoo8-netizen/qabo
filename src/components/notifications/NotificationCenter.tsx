'use client'

import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { arSA } from 'date-fns/locale'
import { useCallback, useEffect, useState } from 'react'
import { EmptyState } from '@/components/ui/EmptyState'
import { Sheet } from '@/components/ui/sheet'

export type NotificationRow = {
  id: string
  type: string
  title: string
  message: string
  auction_id?: string | null
  deal_id?: string | null
  data?: unknown
  is_read: boolean
  created_at: string
}

function iconForType(t: string) {
  const x = t.toLowerCase()
  if (x.includes('bid') || x.includes('مزايد') || x === 'outbid') return '🔨'
  if (x.includes('pay') || x.includes('دفع')) return '💰'
  if (x.includes('ship') || x.includes('شحن')) return '📦'
  return '🔔'
}

function linkFor(n: NotificationRow): string {
  const d = n.data as { link?: string } | null
  if (d && typeof d.link === 'string' && d.link.startsWith('/')) return d.link
  if (n.auction_id) return '/auction/' + n.auction_id
  if (n.deal_id) return '/orders/' + n.deal_id
  return '/notifications'
}

function rowClass(n: NotificationRow) {
  if (n.is_read) return 'border border-border bg-background'
  return 'border border-primary/20 bg-primary/5 dark:bg-primary/10'
}

export function NotificationCenter({
  open,
  onClose,
  userId,
  onUnreadChange,
}: {
  open: boolean
  onClose: () => void
  userId: string | null
  onUnreadChange?: (n: number) => void
}) {
  const router = useRouter()
  const [items, setItems] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const res = await fetch('/api/notifications?user_id=' + encodeURIComponent(userId))
      const data = (await res.json()) as { notifications?: NotificationRow[]; unread_count?: number }
      setItems(Array.isArray(data.notifications) ? data.notifications : [])
      if (typeof data.unread_count === 'number') onUnreadChange?.(data.unread_count)
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [userId, onUnreadChange])

  useEffect(() => {
    if (open && userId) void load()
  }, [open, userId, load])

  const markAll = async () => {
    if (!userId) return
    await fetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, mark_all_read: true }),
    })
    void load()
  }

  const onRowClick = async (n: NotificationRow) => {
    if (!userId) return
    if (!n.is_read) {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, notification_ids: [n.id] }),
      })
    }
    onClose()
    router.push(linkFor(n))
  }

  return (
    <Sheet open={open} onClose={onClose} title="الإشعارات" side="end" className="max-h-[92vh]">
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={() => void markAll()}
          className="min-h-[44px] rounded-xl px-3 text-sm font-bold text-[#1B7F7A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B7F7A] focus-visible:ring-offset-2"
        >
          تحديد الكل كمقروء
        </button>
      </div>
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<span className="text-4xl">🎉</span>}
          title="لا إشعارات جديدة"
          description="ستظهر هنا المزايدات والدفعات والشحن."
        />
      ) : (
        <ul className="space-y-2">
          {items.slice(0, 50).map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => void onRowClick(n)}
                className={
                  'w-full rounded-xl p-3 text-right transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ' +
                  rowClass(n)
                }
              >
                <div className="flex items-start gap-2">
                  <span className="text-xl shrink-0" aria-hidden>
                    {iconForType(n.type)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900 dark:text-slate-100">{n.title}</p>
                    {n.message ? (
                      <p className="mt-0.5 line-clamp-2 text-xs text-gray-600 dark:text-slate-400">{n.message}</p>
                    ) : null}
                    <p className="mt-1 text-[11px] text-gray-500 dark:text-slate-500">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: arSA })}
                    </p>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  )
}
