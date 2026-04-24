import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabase } from '@/lib/clients/supabase'
import { runAgent } from '@/lib/agent'
import { validateWebhookSignature } from '@/lib/utils/webhook-validator'
import { logEvent } from '@/lib/utils/logger'

const rateLimitMap = new Map<string, number[]>()
const RATE_LIMIT_WINDOW_MS = 60 * 1000
const RATE_LIMIT_MAX = 20

const payloadSchema = z.object({
  id: z.string(),
  message: z.string(),
  eventName: z.string().optional().default(''),
  eventType: z.string(),
  repliedAt: z.string().optional().default(''),
  timestamp: z.string().optional().default(''),
  campaignId: z.string().optional().default(''),
  contactName: z.string(),
  botdogUserId: z.string().optional().default(''),
  campaignName: z.string().optional().default(''),
  contactEmails: z.array(z.string()).optional().default([]),
  contactPhones: z.array(z.string()).optional().default([]),
  contactCompany: z.string().optional().default(''),
  contactLinkedinUrl: z.string(),
  botdogUserEmail: z.string().optional().default(''),
  botdogUserLinkedinPublicUrl: z.string().optional().default(''),
})

function checkRateLimit(linkedinUrl: string): boolean {
  const now = Date.now()
  const timestamps = (rateLimitMap.get(linkedinUrl) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  )
  if (timestamps.length >= RATE_LIMIT_MAX) return false
  timestamps.push(now)
  rateLimitMap.set(linkedinUrl, timestamps)
  return true
}

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json()

    const signatureHeader = req.headers.get('x-webhook-signature') ?? undefined
    if (!validateWebhookSignature(signatureHeader, body)) {
      return NextResponse.json({ error: 'Firma de webhook inválida' }, { status: 401 })
    }

    const parsed = payloadSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Payload inválido', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const payload = parsed.data

    if (payload.eventType !== 'LEAD_MESSAGE_REPLIED') {
      return NextResponse.json({ ok: true, skipped: true })
    }

    if (!checkRateLimit(payload.contactLinkedinUrl)) {
      return NextResponse.json(
        { error: 'Rate limit excedido para este prospecto' },
        { status: 429 }
      )
    }

    const { data: existing } = await supabase
      .from('linkedin_agent_prospects')
      .select('*')
      .eq('linkedin_url', payload.contactLinkedinUrl)
      .single()

    let prospectId: string

    if (!existing) {
      const nameParts = payload.contactName.trim().split(' ')
      const firstName = nameParts[0] ?? ''
      const lastName = nameParts.slice(1).join(' ')

      const { data: created, error: createError } = await supabase
        .from('linkedin_agent_prospects')
        .insert({
          linkedin_url: payload.contactLinkedinUrl,
          full_name: payload.contactName,
          first_name: firstName,
          last_name: lastName,
          company_name: payload.contactCompany || null,
          email: payload.contactEmails[0] ?? null,
          phone: payload.contactPhones[0] ?? null,
          botdog_lead_id: payload.id,
          status: 'conversando',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_interaction_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (createError || !created) {
        await logEvent(
          null,
          'prospect_create_error',
          { linkedin_url: payload.contactLinkedinUrl },
          createError?.message
        )
        return NextResponse.json({ error: 'No se pudo crear el prospecto' }, { status: 500 })
      }

      prospectId = created.id as string
    } else {
      prospectId = existing.id as string

      const currentStatus = existing.status as string
      const shouldUpdateStatus = ['conexion_enviada', 'conectado'].includes(currentStatus)

      await supabase
        .from('linkedin_agent_prospects')
        .update({
          last_interaction_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...(shouldUpdateStatus ? { status: 'conversando' } : {}),
        })
        .eq('id', prospectId)
    }

    const agentResponse = await runAgent(prospectId, payload.message)

    return NextResponse.json({ success: true, response: agentResponse })
  } catch (err) {
    const error = err as Error
    await logEvent(null, 'chat_handler_error', {}, error.message).catch(() => null)
    console.error('[api/chat] Error no manejado:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
