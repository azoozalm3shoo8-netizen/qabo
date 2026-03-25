import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ADMIN_USER_IDS } from '@/lib/admin-ids'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  let body: { escrow_id?: string; reason?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'جسم الطلب غير صالح' }, { status: 400 })
  }

  const escrow_id = typeof body.escrow_id === 'string' ? body.escrow_id.trim() : ''
  const reason = typeof body.reason === 'string' ? body.reason.trim() : ''

  if (!escrow_id) {
    return NextResponse.json({ error: 'escrow_id مطلوب' }, { status: 400 })
  }

  const { data: esc, error: fErr } = await supabase.from('escrows').select('*').eq('id', escrow_id).maybeSingle()

  if (fErr) return NextResponse.json({ error: fErr.message }, { status: 500 })
  if (!esc) return NextResponse.json({ error: 'الضمان غير موجود' }, { status: 404 })

  if (esc.status !== 'held') {
    return NextResponse.json({ error: 'لا يمكن فتح نزاع لهذه الحالة' }, { status: 400 })
  }

  const { error: uErr } = await supabase
    .from('escrows')
    .update({
      status: 'disputed',
      disputed_at: new Date().toISOString(),
    })
    .eq('id', escrow_id)

  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 })

  const { data: auc } = await supabase
    .from('auctions')
    .select('title')
    .eq('id', esc.auction_id as string)
    .maybeSingle()
  const title = (auc?.title && String(auc.title).trim()) || 'مزاد'
  const msg = `نزاع على درع الصفقة — ${title}${reason ? ` — ${reason}` : ''}`

  for (const adminId of ADMIN_USER_IDS) {
    await supabase.from('notifications').insert({
      user_id: adminId,
      type: 'escrow_dispute',
      title: 'نزاع درع الصفقة',
      message: msg,
      auction_id: esc.auction_id as string,
    })
  }

  return NextResponse.json({ status: 'disputed' })
}
