import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('safe_zones')
    .select('id,name,name_en,address,district,lat,lng,operating_hours,is_active')
    .eq('is_active', true)
    .order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
