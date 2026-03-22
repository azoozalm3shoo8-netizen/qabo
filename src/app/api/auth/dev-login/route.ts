import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { phone } = await req.json()
  if (!phone) return NextResponse.json({ error: 'missing phone' }, { status: 400 })

  const { data: users } = await supabase.auth.admin.listUsers()
  let user = users?.users?.find((u: any) => u.phone === phone)

  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      phone,
      phone_confirm: true
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    user = data.user
  }

  return NextResponse.json({ user_id: user.id, phone: user.phone })
}
