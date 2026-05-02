import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getResend, FROM } from '@/lib/email/resend'

const N8N_WEBHOOK = 'https://bralto-io-n8n.z49dor.easypanel.host/webhook/cliente-GHL'

const CORS = {
  'Access-Control-Allow-Origin': 'https://bralto.io',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const { name, email, phone, company } = await request.json()

  if (!name || !email) {
    return NextResponse.json({ error: 'Nombre y email son requeridos' }, { status: 400, headers: CORS })
  }

  const service = createServiceClient()
  const { data: proposal } = await service
    .from('proposal_requests')
    .select('*')
    .eq('id', id)
    .single()

  if (!proposal) {
    return NextResponse.json({ error: 'Propuesta no encontrada' }, { status: 404, headers: CORS })
  }

  // 1. Actualizar status a 'aceptada'
  await service
    .from('proposal_requests')
    .update({ status: 'aceptada', updated_at: new Date().toISOString() })
    .eq('id', id)

  const acceptedAt = new Date().toISOString()

  // 2. Enviar a n8n para crear contacto en GHL — fire and forget
  fetch(N8N_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      email,
      phone:   phone   || null,
      company: company || null,
      proposal_id:      id,
      client_name:      proposal.client_name,
      client_company:   proposal.client_company,
      proposal_url:     proposal.generated_url,
      services:         proposal.services,
      budget_range:     proposal.budget_range,
      accepted_at:      acceptedAt,
    }),
  }).catch(() => {})

  // 3. Correo de confirmación al cliente
  if (email) {
    getResend().emails.send({
      from: FROM,
      to: email,
      subject: '¡Tu propuesta fue aceptada! Bienvenido a Bralto 🎉',
      html: buildClientEmail(name),
    }).catch(() => {})
  }

  // 4. Notificación al equipo Bralto
  getResend().emails.send({
    from: FROM,
    to: 'cs@bralto.io',
    subject: `🎉 ¡Propuesta aceptada! — ${name}${company ? ` (${company})` : ''}`,
    html: buildTeamEmail({ name, email, phone, company, proposal, acceptedAt }),
  }).catch(() => {})

  return NextResponse.json({ ok: true }, { headers: CORS })
}

function buildClientEmail(name: string) {
  const firstName = name.split(' ')[0]
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:'Helvetica Neue',Arial,sans-serif">
  <div style="max-width:560px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;border:1px solid rgba(0,0,0,0.06);box-shadow:0 4px 24px rgba(0,0,0,0.06)">
    <div style="background:#0a0a0a;padding:32px 36px">
      <img src="https://bralto.io/logo-white.svg" alt="Bralto" height="28" style="opacity:.9">
    </div>
    <div style="padding:36px">
      <p style="color:#ff6b2b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;margin:0 0 12px">Confirmación de propuesta</p>
      <h1 style="font-size:24px;font-weight:800;color:#0a0a0a;margin:0 0 16px;line-height:1.2">
        ¡Hola, ${firstName}! Estamos emocionados de trabajar contigo.
      </h1>
      <p style="color:#555;font-size:15px;line-height:1.7;margin:0 0 20px">
        Recibimos tu aceptación de la propuesta y tu información de contacto. A partir de ahora, nuestro equipo estará contigo en cada paso del camino.
      </p>
      <div style="background:#f5f5f0;border-radius:12px;padding:20px 24px;margin:0 0 24px">
        <p style="color:#0a0a0a;font-size:14px;font-weight:600;margin:0 0 8px">¿Qué sigue?</p>
        <ol style="color:#555;font-size:14px;line-height:1.8;margin:0;padding-left:18px">
          <li>Nuestro equipo revisará tu información en las próximas horas</li>
          <li>Te contactaremos para agendar una reunión de kick-off</li>
          <li>Comenzamos a construir juntos</li>
        </ol>
      </div>
      <p style="color:#555;font-size:15px;line-height:1.7;margin:0 0 28px">
        Si tienes alguna pregunta antes de eso, no dudes en escribirnos a <a href="mailto:cs@bralto.io" style="color:#ff6b2b;text-decoration:none;font-weight:600">cs@bralto.io</a>. Estamos aquí.
      </p>
      <p style="color:#aaa;font-size:13px;margin:0">Con entusiasmo,<br><strong style="color:#0a0a0a">El equipo de Bralto</strong></p>
    </div>
    <div style="background:#0a0a0a;padding:20px 36px;text-align:center">
      <p style="color:rgba(255,255,255,0.3);font-size:11px;margin:0">© 2025 Bralto. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>`
}

function buildTeamEmail({
  name, email, phone, company, proposal, acceptedAt,
}: {
  name: string
  email: string
  phone: string
  company: string
  proposal: Record<string, unknown>
  acceptedAt: string
}) {
  const acceptedDate = new Date(acceptedAt).toLocaleString('es-CR', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:'Helvetica Neue',Arial,sans-serif">
  <div style="max-width:560px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;border:1px solid rgba(0,0,0,0.06)">
    <div style="background:#0a0a0a;padding:24px 32px">
      <p style="color:#ff6b2b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;margin:0 0 6px">¡Propuesta aceptada!</p>
      <h1 style="color:white;font-size:22px;font-weight:800;margin:0">${name}${company ? ` · ${company}` : ''}</h1>
      <p style="color:rgba(255,255,255,0.4);font-size:12px;margin:6px 0 0">${acceptedDate}</p>
    </div>
    <div style="padding:32px">
      <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 24px">
        Un cliente acaba de aceptar su propuesta. Aquí están sus datos de contacto:
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr style="border-bottom:1px solid #f0f0f0">
          <td style="padding:10px 0;font-weight:600;color:#0a0a0a;width:120px">Nombre</td>
          <td style="padding:10px 0;color:#555">${name}</td>
        </tr>
        <tr style="border-bottom:1px solid #f0f0f0">
          <td style="padding:10px 0;font-weight:600;color:#0a0a0a">Email</td>
          <td style="padding:10px 0"><a href="mailto:${email}" style="color:#ff6b2b;text-decoration:none">${email}</a></td>
        </tr>
        ${phone ? `<tr style="border-bottom:1px solid #f0f0f0"><td style="padding:10px 0;font-weight:600;color:#0a0a0a">Teléfono</td><td style="padding:10px 0;color:#555">${phone}</td></tr>` : ''}
        ${company ? `<tr style="border-bottom:1px solid #f0f0f0"><td style="padding:10px 0;font-weight:600;color:#0a0a0a">Empresa</td><td style="padding:10px 0;color:#555">${company}</td></tr>` : ''}
        <tr style="border-bottom:1px solid #f0f0f0">
          <td style="padding:10px 0;font-weight:600;color:#0a0a0a">Solicitud</td>
          <td style="padding:10px 0;color:#555">${proposal.client_name as string}</td>
        </tr>
        ${proposal.generated_url ? `<tr><td style="padding:10px 0;font-weight:600;color:#0a0a0a">Propuesta</td><td style="padding:10px 0"><a href="${proposal.generated_url as string}" style="color:#ff6b2b;text-decoration:none">Ver propuesta →</a></td></tr>` : ''}
      </table>
      <div style="margin-top:28px;padding:16px 20px;background:#f5f5f0;border-radius:10px">
        <p style="font-size:13px;color:#888;margin:0">El contacto ya fue enviado a GHL vía n8n para su creación automática.</p>
      </div>
    </div>
  </div>
</body>
</html>`
}
