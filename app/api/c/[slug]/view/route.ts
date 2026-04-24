import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const supabase = createServiceClient()

  const { data: contract } = await supabase
    .from('contracts')
    .select('id, status, viewed_at')
    .eq('slug', slug)
    .single()

  if (!contract) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  const userAgent = req.headers.get('user-agent') ?? ''

  // Only transition sent → viewed (ignore if already beyond that)
  if (contract.status === 'sent') {
    await supabase
      .from('contracts')
      .update({ status: 'viewed', viewed_at: new Date().toISOString() })
      .eq('id', contract.id)
  }

  // Always log the view event (deduplication can be added later)
  await supabase.from('contract_events').insert({
    contract_id: contract.id,
    event_type: 'viewed',
    ip,
    user_agent: userAgent,
  })

  return NextResponse.json({ ok: true })
}
