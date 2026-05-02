import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getResend, FROM } from '@/lib/email/resend'
import { BRALTO_SERVICES, BUDGET_LABELS, TIMELINE_LABELS, type ProposalRequest } from '@/types/proposals'
import { renderProposalTemplate } from '@/lib/proposals/render-template'

export const maxDuration = 60

function buildConfirmationEmail(
  proposal: ProposalRequest,
  url: string,
  serviceLabels: string[],
  expiryDate: string,
) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;background:#f5f5f5;padding:32px">
  <div style="max-width:560px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;border:1px solid #e5e5e5">
    <div style="background:#0a0a0a;padding:24px 32px">
      <p style="color:#ff6b2b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;margin:0 0 4px">Bralto · Nueva propuesta lista</p>
      <h1 style="color:white;font-size:22px;margin:0">${proposal.client_name}${proposal.client_company ? ` · ${proposal.client_company}` : ''}</h1>
    </div>
    <div style="padding:32px">
      <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 24px">
        Se ha generado y publicado una nueva propuesta. Revísala antes de enviarla al cliente.
      </p>
      <a href="${url}" style="display:inline-block;background:#ff6b2b;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">
        Ver propuesta →
      </a>
      <hr style="border:none;border-top:1px solid #e5e5e5;margin:28px 0">
      <table style="width:100%;font-size:14px;color:#666;border-collapse:collapse">
        <tr><td style="padding:6px 0;font-weight:600;color:#333;width:140px">Servicios</td><td>${serviceLabels.join(', ')}</td></tr>
        <tr><td style="padding:6px 0;font-weight:600;color:#333">Presupuesto</td><td>${BUDGET_LABELS[proposal.budget_range]}</td></tr>
        <tr><td style="padding:6px 0;font-weight:600;color:#333">Timeline</td><td>${TIMELINE_LABELS[proposal.timeline]}</td></tr>
        <tr><td style="padding:6px 0;font-weight:600;color:#333">Válida hasta</td><td>${expiryDate}</td></tr>
        ${proposal.client_email ? `<tr><td style="padding:6px 0;font-weight:600;color:#333">Email cliente</td><td>${proposal.client_email}</td></tr>` : ''}
        ${proposal.client_phone ? `<tr><td style="padding:6px 0;font-weight:600;color:#333">Teléfono</td><td>${proposal.client_phone}</td></tr>` : ''}
      </table>
      <p style="font-size:12px;color:#aaa;margin:24px 0 0">URL: <a href="${url}" style="color:#ff6b2b">${url}</a></p>
    </div>
  </div>
</body>
</html>`
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { proposal_id } = await request.json()
  if (!proposal_id) return NextResponse.json({ error: 'proposal_id requerido' }, { status: 400 })

  const service = createServiceClient()
  const { data: proposal, error: fetchError } = await service
    .from('proposal_requests')
    .select('*')
    .eq('id', proposal_id)
    .single()

  if (fetchError || !proposal) {
    return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
  }

  const serviceLabels = (proposal.services as string[]).map((id) => {
    const svc = BRALTO_SERVICES.find((s) => s.id === id)
    return svc?.label ?? id
  })

  const proposalDate = new Date().toLocaleDateString('es-CR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
  const expiryDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('es-CR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  // Renderizar el HTML desde el template local (sin llamar a Claude)
  let html: string
  try {
    html = renderProposalTemplate(proposal as ProposalRequest, proposalDate, expiryDate)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Error al leer el template: ${msg}` }, { status: 500 })
  }

  // Enviar a bralto.io
  const braltoApiUrl = process.env.BRALTO_API_URL
  const proposalsApiKey = process.env.PROPOSALS_API_KEY

  if (!braltoApiUrl || !proposalsApiKey) {
    return NextResponse.json(
      { error: 'Faltan variables de entorno: BRALTO_API_URL y PROPOSALS_API_KEY' },
      { status: 500 },
    )
  }

  const braltoRes = await fetch(`${braltoApiUrl}/api/proposals/receive`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': proposalsApiKey,
    },
    body: JSON.stringify({
      html_content: html,
      client_name: proposal.client_name,
      project_name: proposal.client_company ?? proposal.client_name,
      created_by: user.email ?? 'admin',
    }),
  })

  if (!braltoRes.ok) {
    const errText = await braltoRes.text()
    return NextResponse.json({ error: `Error al publicar en bralto.io: ${errText}` }, { status: 502 })
  }

  const { url, slug } = await braltoRes.json() as { url: string; slug: string }

  // Actualizar la solicitud con la URL generada
  await service
    .from('proposal_requests')
    .update({
      generated_url: url,
      generated_at: new Date().toISOString(),
      status: 'propuesta_enviada',
      updated_at: new Date().toISOString(),
    })
    .eq('id', proposal_id)

  // Correo de confirmación — fire and forget
  getResend().emails.send({
    from: FROM,
    to: 'cs@bralto.io',
    subject: `✅ Propuesta lista — ${proposal.client_name}${proposal.client_company ? ` (${proposal.client_company})` : ''}`,
    html: buildConfirmationEmail(proposal as ProposalRequest, url, serviceLabels, expiryDate),
  }).catch(() => {})

  return NextResponse.json({ url, slug })
}
