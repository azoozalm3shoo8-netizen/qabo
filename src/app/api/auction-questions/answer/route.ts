import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { containsBannedWords } from '@/lib/ai-description'
import { isValidUserId, unauthorized } from '@/lib/server/require-user'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { user_id, question_id, answer } = body as {
    user_id?: string
    question_id?: string
    answer?: string
  }

  if (!isValidUserId(user_id)) return unauthorized()
  if (!question_id || typeof answer !== 'string') {
    return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
  }
  const a = answer.trim()
  if (!a) return NextResponse.json({ error: 'الإجابة فارغة' }, { status: 400 })
  if (containsBannedWords(a)) {
    return NextResponse.json({ error: 'الإجابة تحتوي كلمات غير مسموحة' }, { status: 400 })
  }

  const { data: row, error: qErr } = await supabase
    .from('auction_questions')
    .select('id, auction_id')
    .eq('id', question_id)
    .maybeSingle()

  if (qErr || !row) return NextResponse.json({ error: 'السؤال غير موجود' }, { status: 404 })

  const { data: auc } = await supabase
    .from('auctions')
    .select('seller_id')
    .eq('id', row.auction_id)
    .maybeSingle()

  if (!auc || auc.seller_id !== user_id) {
    return NextResponse.json({ error: 'فقط البائع يمكنه الإجابة' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('auction_questions')
    .update({
      answer: a,
      answered_by: user_id,
      answered_at: new Date().toISOString(),
    })
    .eq('id', question_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
