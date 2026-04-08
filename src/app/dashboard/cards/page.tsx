import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { MoyasarCardForm } from '@/components/payment/MoyasarCardForm'
import { SavedCardsList } from '@/components/payment/SavedCardsList'

export default async function DashboardCardsPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const pk = process.env.NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY ?? ''

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-[#1B7F7A]">بطاقاتي</h1>
      {!pk && (
        <p className="text-sm text-red-600">NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY غير مضبوط.</p>
      )}
      {pk && <MoyasarCardForm userId={user.id} publishableKey={pk} />}
      <SavedCardsList userId={user.id} />
    </div>
  )
}
