import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { containsBannedWords } from '@/lib/ai-description'
import { isValidUserId, unauthorized } from '@/lib/server/require-user'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const auctionId = req.nextUrl.searchParams.get('auction_id')
  if (!auctionId) return NextResponse.json({ error: 'missing auction_id' }, { status: 400 })

  const { data, error } = await supabase
    .from('auction_questions')
    .select('*')
    .eq('auction_id', auctionId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { user_id, auction_id, question } = body as {
    user_id?: string
    auction_id?: string
    question?: string
  }

  if (!isValidUserId(user_id)) return unauthorized()
  if (!auction_id || typeof question !== 'string') {
    return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
  }
  const q = question.trim()
  if (q.length < 2) return NextResponse.json({ error: 'السؤال قصير' }, { status: 400 })
  if (containsBannedWords(q)) {
    return NextResponse.json({ error: 'السؤال يحتوي كلمات غير مسموحة' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('auction_questions')
    .insert({
      auction_id,
      asker_id: user_id,
      question: q,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
