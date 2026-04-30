import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabase } from '@/lib/clients/supabase'
import { validateWebhookSignature } from '@/lib/utils/webhook-validator'
import { logEvent } from '@/lib/utils/logger'

// Pipeline status each BotDog event advances the prospect to.
// Unipile webhook handles incoming replies and runs the agent — this route
// is purely for pipeline stage management and saving outbound messages.
const EVENT_STATUS: Record<string, string> = {
  LEAD_PROFILE_VISITED:     'perfil_visitado',
  LEAD_INVITATION_SENT:     'conexion_enviada',
  LEAD_INVITATION_ACCEPTED: 'conectado',
  LEAD_MESSAGE_SENT:        'mensaje_inicial_enviado',
  LEAD_MESSAGE_REPLIED:     'conversando',
}

// Status order — we only advance, never go backwards.
const STATUS_ORDER = [
  'nuevo', 'perfil_visitado', 'conexion_enviada', 'conectado',
  'mensaje_inicial_enviado', 'conversando', 'calificado', 'agendado', 'cerrado_ganado',
]

// Events that create a prospect record if one doesn't exist yet.
// Earlier events (profile visit, invite, message) are all valid first-touch points.
const CAN_CREATE: Record<string, string> = {
  LEAD_PROFILE_VISITED:  'perfil_visitado',
  LEAD_INVITATION_SENT:  'conexion_enviada',
  LEAD_MESSAGE_SENT:     'mensaje_inicial_enviado',
}

const payloadSchema = z.object({
  id:                          z.string(),
  message:                     z.string().optional().default(''),
  eventName:                   z.string().optional().default(''),
  eventType:                   z.string(),
  repliedAt:                   z.string().optional().default(''),
  timestamp:                   z.string().optional().default(''),
  campaignId:                  z.string().optional().default(''),
  contactName:                 z.string(),
  botdogUserId:                z.string().optional().default(''),
  campaignName:                z.string().optional().default(''),
  contactEmails:               z.array(z.string()).optional().default([]),
  contactPhones:               z.array(z.string()).optional().default([]),
  contactCompany:              z.string().optional().default(''),
  contactLinkedinUrl:          z.string(),
  botdogUserEmail:             z.string().optional().default(''),
  botdogUserLinkedinPublicUrl: z.string().optional().default(''),
})

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json()

    const signatureHeader = req.headers.get('x-webhook-signature') ?? undefined
    if (!validateWebhookSignature(signatureHeader, body)) {
      return NextResponse.json({ error: 'Firma de webhook inválida' }, { status: 401 })
    }

    const parsed = payloadSchema.safeParse(body)
    if (!parsed.success) {
      console.log('[api/chat] Payload inválido:', JSON.stringify(parsed.error.flatten()))
      return NextResponse.json({ error: 'Payload inválido', details: parsed.error.flatten() }, { status: 400 })
    }

    const payload = parsed.data
    const { eventType, contactLinkedinUrl, contactName } = payload

    console.log('[api/chat] event:', eventType, '| campaign:', payload.campaignName, '| linkedin:', contactLinkedinUrl)

    // Find existing prospect
    const { data: existing } = await supabase
      .from('linkedin_agent_prospects')
      .select('id, status')
      .eq('linkedin_url', contactLinkedinUrl)
      .maybeSingle()

    if (!existing && !(eventType in CAN_CREATE)) {
      console.log('[api/chat] Prospecto no encontrado, skipping para:', eventType)
      return NextResponse.json({ ok: true, skipped: 'prospect_not_found' })
    }

    let prospectId: string

    if (!existing) {
      const nameParts = contactName.trim().split(' ')
      const initialStatus = CAN_CREATE[eventType]
      const { data: created, error } = await supabase
        .from('linkedin_agent_prospects')
        .insert({
          linkedin_url: contactLinkedinUrl,
          full_name: contactName,
          first_name: nameParts[0] ?? '',
          last_name: nameParts.slice(1).join(' '),
          company_name: payload.contactCompany || null,
          email: payload.contactEmails[0] ?? null,
          phone: payload.contactPhones[0] ?? null,
          status: initialStatus,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_interaction_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error || !created) {
        await logEvent(null, 'prospect_create_error', { linkedin_url: contactLinkedinUrl }, error?.message)
        return NextResponse.json({ error: 'No se pudo crear el prospecto' }, { status: 500 })
      }

      prospectId = created.id as string
      console.log('[api/chat] Prospecto creado:', prospectId, '| status:', initialStatus)
    } else {
      prospectId = existing.id as string

      const targetStatus = EVENT_STATUS[eventType]
      const currentIdx = STATUS_ORDER.indexOf(existing.status as string)
      const targetIdx  = targetStatus ? STATUS_ORDER.indexOf(targetStatus) : -1
      const shouldAdvance = targetStatus && targetIdx > currentIdx

      await supabase
        .from('linkedin_agent_prospects')
        .update({
          ...(shouldAdvance ? { status: targetStatus } : {}),
          last_interaction_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', prospectId)

      if (shouldAdvance) {
        console.log('[api/chat] Status:', existing.status, '→', targetStatus)
      }
    }

    await logEvent(prospectId, `botdog_${eventType.toLowerCase()}`, {
      eventType,
      campaign: payload.campaignName,
      campaignId: payload.campaignId,
    })

    // Save outbound message so it appears in the conversations inbox
    if (eventType === 'LEAD_MESSAGE_SENT' && payload.message) {
      const { data: lastMsg } = await supabase
        .from('linkedin_agent_messages')
        .select('turn_number')
        .eq('prospect_id', prospectId)
        .order('turn_number', { ascending: false })
        .limit(1)
        .maybeSingle()

      const nextTurn = ((lastMsg?.turn_number as number | null) ?? 0) + 1

      await supabase.from('linkedin_agent_messages').insert({
        prospect_id: prospectId,
        role: 'agent',
        content: payload.message,
        turn_number: nextTurn,
        tool_calls: null,
        created_at: new Date().toISOString(),
      })

      console.log('[api/chat] Mensaje outbound guardado, turn:', nextTurn)
    }

    return NextResponse.json({ ok: true, event: eventType, prospectId })
  } catch (err) {
    const error = err as Error
    await logEvent(null, 'chat_handler_error', {}, error.message).catch(() => null)
    console.error('[api/chat] Error:', error.message)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
