import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const service = createServiceClient()
  const { data: proposal } = await service
    .from('proposal_requests')
    .select('generated_url')
    .eq('id', id)
    .single()

  if (!proposal?.generated_url) {
    return NextResponse.json({ error: 'Esta solicitud no tiene propuesta publicada' }, { status: 404 })
  }

  // Extract slug from URL: https://bralto.io/propuestas/[slug]
  const slug = proposal.generated_url.split('/').at(-1)

  const braltoApiUrl = process.env.BRALTO_API_URL
  const proposalsApiKey = process.env.PROPOSALS_API_KEY

  if (braltoApiUrl && proposalsApiKey && slug) {
    await fetch(`${braltoApiUrl}/api/proposals/${slug}`, {
      method: 'DELETE',
      headers: { 'x-api-key': proposalsApiKey },
    }).catch(() => { /* ignore if already deleted */ })
  }

  await service
    .from('proposal_requests')
    .update({
      generated_url: null,
      generated_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  return NextResponse.json({ ok: true })
}
