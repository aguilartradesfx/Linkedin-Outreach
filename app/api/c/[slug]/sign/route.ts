import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'
import { getResend, FROM } from '@/lib/email/resend'
import { emailContractSigned } from '@/lib/email/templates'

const signBody = z.object({
  signature: z.string().min(10, 'Firma requerida'),
  accepted_terms: z.literal(true),
})

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const supabase = createServiceClient()

  // Validate input
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = signBody.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { signature, accepted_terms } = parsed.data

  // Fetch contract
  const { data: contract } = await supabase
    .from('contracts')
    .select('id, status, data, signature_bralto_data, slug')
    .eq('slug', slug)
    .single()

  if (!contract) return NextResponse.json({ error: 'Contrato no encontrado' }, { status: 404 })

  if (!['sent', 'viewed'].includes(contract.status)) {
    return NextResponse.json(
      { error: 'Este contrato no puede ser firmado en su estado actual' },
      { status: 409 },
    )
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  const userAgent = req.headers.get('user-agent') ?? ''
  const now = new Date()

  // Also embed firma in data so it renders in the document
  const updatedData = {
    ...contract.data,
    firma: {
      ...(contract.data?.firma ?? {}),
      cliente_canvas: signature,
      cliente_timestamp: now.toISOString(),
      cliente_ip: ip,
      cliente_user_agent: userAgent,
      cliente_aceptacion_terminos: accepted_terms,
    },
  }

  // If Bralto already pre-signed, go straight to signed_fully
  const newStatus = contract.signature_bralto_data ? 'signed_fully' : 'signed_by_client'

  const { error } = await supabase
    .from('contracts')
    .update({
      status: newStatus,
      signature_client_data: signature,
      signature_client_timestamp: now.toISOString(),
      signature_client_ip: ip,
      signature_client_user_agent: userAgent,
      signature_client_accepted_terms: accepted_terms,
      signed_at: now.toISOString(),
      data: updatedData,
    })
    .eq('id', contract.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('contract_events').insert({
    contract_id: contract.id,
    event_type: 'signed',
    ip,
    user_agent: userAgent,
    metadata: {
      accepted_terms,
      timestamp: now.toISOString(),
    },
  })

  // Send confirmation email to client
  const correo = contract.data?.cliente?.correo_notificaciones ?? contract.data?.cliente?.correo_facturacion
  if (correo) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bralto.io'
    const contractUrl = `${siteUrl}/c/${contract.slug}`
    const signedAt = now.toLocaleString('es-CR', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZone: 'America/Costa_Rica',
    })
    const { subject, html } = emailContractSigned({
      clienteName: contract.data?.cliente?.representante_nombre ?? 'Cliente',
      empresa: contract.data?.cliente?.empresa_nombre ?? '',
      contractUrl,
      signedAt,
    })
    try {
      const { data: emailData, error: emailError } = await getResend().emails.send({ from: FROM, to: correo, subject, html })
      if (emailError) {
        await supabase.from('contract_events').insert({
          contract_id: contract.id,
          event_type: 'email_error',
          metadata: { to: correo, error: JSON.stringify(emailError) },
        })
      } else {
        await supabase.from('contract_events').insert({
          contract_id: contract.id,
          event_type: 'email_sent',
          metadata: { to: correo, resend_id: emailData?.id ?? null },
        })
      }
    } catch (err) {
      await supabase.from('contract_events').insert({
        contract_id: contract.id,
        event_type: 'email_error',
        metadata: { to: correo, error: String(err) },
      })
    }
  }

  const paymentLink = contract.data?.payment_link
  return NextResponse.json({ ok: true, payment_link: paymentLink ?? null })
}
