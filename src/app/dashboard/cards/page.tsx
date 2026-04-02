import { MoyasarCardForm } from '@/components/payment/MoyasarCardForm'
import { SavedCardsList } from '@/components/payment/SavedCardsList'

export default async function DashboardCardsPage({
  searchParams,
}: {
  searchParams?: Promise<{ user_id?: string }>
}) {
  const sp = (await searchParams) ?? {}
  const uid = sp.user_id?.trim() ?? ''
  const pk = process.env.NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY ?? ''

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-[#1B7F7A]">بطاقاتي</h1>
      {!uid ? (
        <p className="text-sm text-amber-800 dark:text-amber-200">أضف user_id صالحاً في عنوان الصفحة (?user_id=...)</p>
      ) : null}
      {!pk ? <p className="text-sm text-red-600">NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY غير مضبوط.</p> : null}
      {uid && pk ? <MoyasarCardForm userId={uid} publishableKey={pk} /> : null}
      {uid ? <SavedCardsList userId={uid} /> : null}
    </div>
  )
}
