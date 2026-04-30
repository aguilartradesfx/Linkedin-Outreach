import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { anthropic } from '@/lib/clients/anthropic'
import { getResend, FROM } from '@/lib/email/resend'
import {
  BRALTO_SERVICES, BUDGET_LABELS, TIMELINE_LABELS,
  type ProposalRequest,
} from '@/types/proposals'

export const maxDuration = 300

const SYSTEM_PROMPT = `You are Bralto's AI proposal generator. Your task is to create a stunning, professional, and complete HTML proposal page for a potential client.

Bralto is a premium Costa Rican digital agency offering: social media management, process automation, web development, branding/visual identity, email marketing, SEO, content creation, paid advertising, strategic consulting, AI agents (LinkedIn/WhatsApp), CRM, and photography/production.

═══════════════════════════════════════
DESIGN SYSTEM
═══════════════════════════════════════

CSS Variables:
  --bg: #f5f5f0       (warm off-white, body background)
  --orange: #ff6b2b   (primary accent)
  --black: #0a0a0a    (dark sections)
  --border: rgba(0,0,0,0.08)

Typography (Google Fonts):
  Sora: 300,400,500,600,700,800  →  body text, headings
  JetBrains Mono: 400,500,600    →  numbers, stats, prices

Layout:
  .container { max-width: 960px; margin: 0 auto; padding: 0 24px; }

═══════════════════════════════════════
COMPONENTS
═══════════════════════════════════════

1. HERO (dark, #0a0a0a background, min-height: 100vh)
   • Navbar bar at top: Bralto logo left, "Propuesta Confidencial" text right (small, white/30)
     Logo: <img src="https://bralto.io/logo-white.svg" alt="Bralto" height="26" style="opacity:.9">
   • Orange pill chip: <div class="chip">● PROPUESTA EXCLUSIVA</div>
   • H1 (font-size: clamp(40px,7vw,72px), font-weight:800, color:white):
       "Propuesta para <span style='color:var(--orange)'>[Client Name]</span>"
   • Subtitle 18px, white/50, max-width 560px
   • Meta grid (4 items): Fecha | Válida hasta | Servicios | Industria
   • Floating animated particles (JS canvas or CSS dots)

2. SECTION LABEL PATTERN
   <p class="s-label">Servicios incluidos</p>
   h2 heading + description paragraph

   .s-label {
     display: flex; align-items: center; gap: 12px;
     font-size: 11px; font-weight: 600; text-transform: uppercase;
     letter-spacing: 0.12em; color: var(--orange); margin-bottom: 16px;
   }
   .s-label::before { content:''; width:32px; height:2px; background:var(--orange); }

3. SERVICE CARDS (white bg, 1px solid var(--border), border-radius:16px, padding:28px)
   • Card icon: 44px square, bg rgba(255,107,43,0.1), border-radius:10px, emoji inside
   • h3 18px 700, p 14px rgba(0,0,0,0.55) line-height 1.6
   • Grid: repeat(auto-fit, minmax(240px,1fr)), gap:20px

4. STRATEGY/TIMELINE (alternating bg sections)
   • Phase rows: week/month label in orange JetBrains Mono + content
   • Create a realistic 4-phase onboarding plan based on the services

5. NUMBERS SECTION (dark bg)
   • 3-4 impactful projected metrics
   • Number in JetBrains Mono, font-size:48px, color:var(--orange)
   • Label below in white/50, font-size:13px

6. INVESTMENT SECTION (white bg)
   • Clean table or card listing services + monthly price
   • Total investment in JetBrains Mono, large, orange
   • Use the budget_range to calibrate realistic prices

7. CTA SECTION (dark bg, text-align:center)
   • Big heading: "¿Listo para <span style='color:var(--orange)'>transformar</span> tu negocio?"
   • Orange pill button: padding 16px 48px, background var(--orange), border-radius:100px

8. FOOTER (dark bg, border-top 1px solid rgba(255,255,255,0.06))
   • Bralto logo + expiry notice + © 2025 Bralto. Todos los derechos reservados.

═══════════════════════════════════════
ANIMATIONS
═══════════════════════════════════════
@keyframes fadeUp { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } }
.anim { opacity:0 }
.anim.vis { animation: fadeUp .6s ease forwards; animation-delay: var(--delay,0s) }

Add IntersectionObserver JS at end of body:
<script>
const io = new IntersectionObserver(entries => {
  entries.forEach(e => { if(e.isIntersecting) { e.target.classList.add('vis'); io.unobserve(e.target) } })
}, { threshold: 0.1 })
document.querySelectorAll('.anim').forEach(el => io.observe(el))
</script>

Also add floating particles in hero via JS (small white/orange dots, slow random movement).

═══════════════════════════════════════
OUTPUT RULES
═══════════════════════════════════════
• Output ONLY the complete <!DOCTYPE html>...</html> document.
• Zero markdown, zero explanations, zero code fences.
• All CSS inside <style> in <head>. All JS at end of <body>.
• The page must be fully self-contained and work offline (except Google Fonts and the logo image).
• Write in Spanish. Use professional, warm, persuasive language.
• Make each section genuinely useful — tailored to the client's specific services and industry.
• Be creative with section content but stay true to the design system above.`

function buildUserPrompt(
  proposal: ProposalRequest,
  serviceLabels: string[],
  proposalDate: string,
  expiryDate: string,
) {
  return `Generate a complete HTML proposal for the following client:

CLIENT:
  Name: ${proposal.client_name}
  Company: ${proposal.client_company ?? 'No especificado'}
  Industry: ${proposal.client_industry ?? 'No especificado'}
  Email: ${proposal.client_email ?? 'No especificado'}
  Phone: ${proposal.client_phone ?? 'No especificado'}

REQUESTED SERVICES (${serviceLabels.length}):
${serviceLabels.map((s, i) => `  ${i + 1}. ${s}`).join('\n')}

INVESTMENT RANGE: ${BUDGET_LABELS[proposal.budget_range]}
DESIRED TIMELINE: ${TIMELINE_LABELS[proposal.timeline]}

ADDITIONAL NOTES FROM SALES TEAM:
${proposal.notes ? `  "${proposal.notes}"` : '  (none)'}

PROPOSAL METADATA:
  Prepared date: ${proposalDate}
  Valid until: ${expiryDate} (14 days)

Generate the full HTML proposal now. Remember: only the HTML document, nothing else.`
}

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
      <p style="color:#ff6b2b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;margin:0 0 4px">Bralto · Propuesta generada</p>
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

  const body = await request.json()
  const { proposal_id } = body
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

  // Call Claude to generate the HTML proposal
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: buildUserPrompt(proposal as ProposalRequest, serviceLabels, proposalDate, expiryDate),
    }],
  })

  const rawContent = message.content[0].type === 'text' ? message.content[0].text : ''
  // Strip markdown code fences if Claude wraps the output
  const html = rawContent
    .replace(/^```html?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()

  if (!html.startsWith('<!DOCTYPE') && !html.startsWith('<html')) {
    return NextResponse.json({ error: 'Claude no generó HTML válido' }, { status: 500 })
  }

  // Send to bralto.io
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

  // Update proposal record
  await service
    .from('proposal_requests')
    .update({
      generated_url: url,
      generated_at: new Date().toISOString(),
      status: 'propuesta_enviada',
      updated_at: new Date().toISOString(),
    })
    .eq('id', proposal_id)

  // Send confirmation email to Bralto team — fire and forget
  getResend().emails.send({
    from: FROM,
    to: 'cs@bralto.io',
    subject: `✅ Propuesta lista — ${proposal.client_name}${proposal.client_company ? ` (${proposal.client_company})` : ''}`,
    html: buildConfirmationEmail(proposal as ProposalRequest, url, serviceLabels, expiryDate),
  }).catch(() => { /* email failure doesn't fail the request */ })

  return NextResponse.json({ url, slug })
}
