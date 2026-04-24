import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getResend, FROM } from '@/lib/email/resend'
import { emailContractSent } from '@/lib/email/templates'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: existing } = await supabase
    .from('contracts')
    .select('id, slug, status, data')
    .eq('id', id)
    .single()

  if (!existing) return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
  if (existing.status === 'cancelled') {
    return NextResponse.json({ error: 'Cannot send a cancelled contract' }, { status: 409 })
  }

  const { data: contract, error } = await supabase
    .from('contracts')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('contract_events').insert({
    contract_id: id,
    event_type: 'sent',
    metadata: { sent_by: user.id },
  })

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bralto.io'
  const publicUrl = `${siteUrl}/c/${contract.slug}`

  // Send email to client (non-blocking, never fails the response)
  const correo = existing.data?.cliente?.correo_notificaciones ?? existing.data?.cliente?.correo_facturacion
  if (correo) {
    try {
      const { subject, html } = emailContractSent({
        clienteName: existing.data?.cliente?.representante_nombre ?? 'Cliente',
        empresa: existing.data?.cliente?.empresa_nombre ?? '',
        contractUrl: publicUrl,
      })
      const { data: emailData, error: emailError } = await getResend().emails.send({ from: FROM, to: correo, subject, html })
      if (emailError) {
        await supabase.from('contract_events').insert({
          contract_id: id,
          event_type: 'email_error',
          metadata: { to: correo, error: JSON.stringify(emailError) },
        })
      } else {
        await supabase.from('contract_events').insert({
          contract_id: id,
          event_type: 'email_sent',
          metadata: { to: correo, resend_id: emailData?.id ?? null },
        })
      }
    } catch (err) {
      await supabase.from('contract_events').insert({
        contract_id: id,
        event_type: 'email_error',
        metadata: { to: correo, error: String(err) },
      })
    }
  }

  return NextResponse.json({ contract, publicUrl })
}
