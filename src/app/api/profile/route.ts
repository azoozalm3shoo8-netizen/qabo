import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  baseProfileRowForUpsert,
  defaultProfileForApi,
  omitUndefined,
} from '@/lib/server/profile-defaults'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const uid = req.nextUrl.searchParams.get('user_id')
  if (!uid) return NextResponse.json({ error: 'missing user_id' }, { status: 400 })

  const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json(defaultProfileForApi(uid))

  return NextResponse.json(data)
}

export async function PUT(req: NextRequest) {
  const body = await req.json()
  const { user_id, full_name, city, bio, avatar_url, phone } = body

  if (!user_id) return NextResponse.json({ error: 'missing user_id' }, { status: 400 })

  const { data: existing, error: fetchErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user_id)
    .maybeSingle()

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })

  const base = baseProfileRowForUpsert(user_id, existing as Record<string, unknown> | null)

  const row = omitUndefined({
    ...base,
    full_name: full_name !== undefined ? full_name : base.full_name,
    city: city !== undefined ? city : base.city,
    bio: bio !== undefined ? bio : base.bio,
    avatar_url: avatar_url !== undefined ? avatar_url : base.avatar_url,
    phone: phone !== undefined ? phone : base.phone,
    updated_at: new Date().toISOString(),
  })

  const { data, error } = await supabase
    .from('profiles')
    .upsert(row, { onConflict: 'id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
