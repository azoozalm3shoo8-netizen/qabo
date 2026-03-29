import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { createClient } from '@/lib/supabase-server'
import { getChecklistForCategory, validateChecklistResponses } from '@/lib/category-checklists'
import { isValidUserId } from '@/lib/server/require-user'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const userIdRaw = req.nextUrl.searchParams.get('user_id')
  if (!isValidUserId(userIdRaw)) {
    return NextResponse.json({ success: false, error: 'معرّف المستخدم غير صالح' }, { status: 401 })
  }
  const sellerId = userIdRaw!.trim()

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ success: false, error: 'تعذر قراءة البيانات' }, { status: 400 })
  }

  const auctionId = String(form.get('auction_id') || '').trim()
  const categoryId = String(form.get('category_id') || '').trim()
  const responsesRaw = String(form.get('responses') || '{}')

  if (!isValidUserId(auctionId)) {
    return NextResponse.json({ success: false, error: 'auction_id غير صالح' }, { status: 400 })
  }
  if (!categoryId) {
    return NextResponse.json({ success: false, error: 'category_id مطلوب' }, { status: 400 })
  }

  let responses: Record<string, unknown> = {}
  try {
    responses = JSON.parse(responsesRaw) as Record<string, unknown>
  } catch {
    return NextResponse.json({ success: false, error: 'responses يجب أن يكون JSON' }, { status: 400 })
  }

  const checklist = getChecklistForCategory(categoryId)
  const fileMap: Record<string, File> = {}
  for (const [key, val] of form.entries()) {
    if (key.startsWith('file_') && val && typeof val !== 'string' && 'arrayBuffer' in val) {
      const id = key.replace(/^file_/, '')
      fileMap[id] = val as File
    }
  }

  const validation = validateChecklistResponses(checklist, responses, fileMap)
  if (!validation.valid) {
    return NextResponse.json({
      success: false,
      validation_passed: false,
      errors: validation.errors,
    })
  }

  const supabase = createClient()
  const file_urls: Record<string, string> = {}

  try {
    for (const id of Object.keys(fileMap)) {
      const f = fileMap[id]
      if (!f?.size) continue
      const ext = path.extname(f.name || '') || '.jpg'
      const safeExt = ext.match(/^\.\w{1,8}$/) ? ext : '.jpg'
      const storagePath = `checklists/${auctionId}/${id}${safeExt}`
      const buf = Buffer.from(await f.arrayBuffer())
      const { error: upErr } = await supabase.storage
        .from('auction-images')
        .upload(storagePath, buf, { contentType: f.type || 'application/octet-stream', upsert: true })
      if (upErr) {
        return NextResponse.json({ success: false, error: upErr.message }, { status: 500 })
      }
      const { data } = supabase.storage.from('auction-images').getPublicUrl(storagePath)
      file_urls[id] = data.publicUrl
    }

    const { error: dbErr } = await supabase.from('auction_checklists').upsert(
      {
        auction_id: auctionId,
        category_id: categoryId,
        seller_id: sellerId,
        responses,
        file_urls,
        validation_passed: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'auction_id' }
    )

    if (dbErr) {
      return NextResponse.json({ success: false, error: dbErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, validation_passed: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'خطأ'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const auctionId = req.nextUrl.searchParams.get('auction_id')?.trim()
  if (!auctionId || !isValidUserId(auctionId)) {
    return NextResponse.json({ error: 'auction_id غير صالح' }, { status: 400 })
  }

  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('auction_checklists')
      .select('*')
      .eq('auction_id', auctionId)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ found: false })
    }

    return NextResponse.json({
      found: true,
      category_id: data.category_id,
      responses: data.responses,
      file_urls: data.file_urls,
      validation_passed: data.validation_passed,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'خطأ'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
