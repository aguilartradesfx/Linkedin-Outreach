import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/clients/supabase'
import { runAgent } from '@/lib/agent'
import { logEvent } from '@/lib/utils/logger'
import { getChatDetails, getLinkedinIdentifier, sendMessageToChatId } from '@/lib/clients/unipile'

const rateLimitMap = new Map<string, number[]>()

function checkRateLimit(chatId: string): boolean {
  const now = Date.now()
  const timestamps = (rateLimitMap.get(chatId) ?? []).filter((t) => now - t < 60_000)
  if (timestamps.length >= 20) return false
  timestamps.push(now)
  rateLimitMap.set(chatId, timestamps)
  return true
}

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: 'unipile-webhook', status: 'active' })
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {}

  try {
    body = await req.json() as Record<string, unknown>
  } catch {
    return NextResponse.json({ ok: true, skipped: 'invalid_json' })
  }

  // Log completo para diagnóstico
  console.log('[unipile/webhook] RAW:', JSON.stringify(body))

  try {
    // Unipile envía el mensaje en body.data o directamente en body
    const msg = (body.data ?? body) as Record<string, unknown>

    const chatId = (msg.chat_id ?? msg.chatId) as string | undefined
    const messageText = ((msg.text ?? msg.content ?? '') as string).trim()
    // is_sender:1 = mensaje nuestro, is_sender:0 = del prospecto
    const isSelf = msg.is_sender === 1 || msg.is_sender === true || msg.from_me === true

    console.log('[unipile/webhook] chatId:', chatId, '| text:', messageText?.slice(0, 60), '| isSelf:', isSelf)

    if (!chatId || !messageText) {
      return NextResponse.json({ ok: true, skipped: 'missing_data' })
    }

    if (isSelf) {
      return NextResponse.json({ ok: true, skipped: 'self_message' })
    }

    if (!checkRateLimit(chatId)) {
      return NextResponse.json({ error: 'Rate limit' }, { status: 429 })
    }

    // Obtener el URN del prospecto desde el chat
    const chat = await getChatDetails(chatId)
    const prospectUrn = chat?.attendee_provider_id ?? (msg.sender_id as string | undefined)

    console.log('[unipile/webhook] prospectUrn:', prospectUrn)

    if (!prospectUrn) {
      console.error('[unipile/webhook] No se encontró el URN del prospecto')
      return NextResponse.json({ ok: true, skipped: 'no_prospect_urn' })
    }

    // Resolver el username de LinkedIn desde el URN
    const profile = await getLinkedinIdentifier(prospectUrn)
    console.log('[unipile/webhook] profile:', JSON.stringify(profile))

    let linkedinUrl: string
    let contactName: string

    if (profile?.identifier) {
      linkedinUrl = `https://www.linkedin.com/in/${profile.identifier}`
      contactName = profile.name || profile.identifier
    } else {
      // Fallback: usar el URN como identificador único
      linkedinUrl = `https://www.linkedin.com/in/${prospectUrn}`
      contactName = (msg.sender_name as string) ?? prospectUrn
    }

    // Buscar o crear el prospecto
    const { data: existing } = await supabase
      .from('linkedin_agent_prospects')
      .select('*')
      .eq('linkedin_url', linkedinUrl)
      .single()

    let prospectId: string

    if (!existing) {
      const nameParts = contactName.trim().split(' ')
      const { data: created, error } = await supabase
        .from('linkedin_agent_prospects')
        .insert({
          linkedin_url: linkedinUrl,
          full_name: contactName,
          first_name: nameParts[0] ?? '',
          last_name: nameParts.slice(1).join(' '),
          unipile_chat_id: chatId,
          status: 'conversando',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_interaction_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error || !created) {
        await logEvent(null, 'prospect_create_error', { linkedin_url: linkedinUrl }, error?.message)
        return NextResponse.json({ error: 'No se pudo crear el prospecto' }, { status: 500 })
      }

      prospectId = created.id as string
      console.log('[unipile/webhook] Prospecto creado:', prospectId)
    } else {
      prospectId = existing.id as string
      console.log('[unipile/webhook] Prospecto existente:', prospectId)

      await supabase
        .from('linkedin_agent_prospects')
        .update({
          unipile_chat_id: (existing.unipile_chat_id as string | null) ?? chatId,
          last_interaction_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...(['conexion_enviada', 'conectado'].includes(existing.status as string)
            ? { status: 'conversando' } : {}),
        })
        .eq('id', prospectId)
    }

    // Verificar si el agente está habilitado
    const { data: prospectCheck } = await supabase
      .from('linkedin_agent_prospects')
      .select('agent_enabled')
      .eq('id', prospectId)
      .single()

    if (prospectCheck?.agent_enabled === false) {
      await logEvent(prospectId, 'agent_skipped', { reason: 'agent_disabled' })
      return NextResponse.json({ ok: true, skipped: 'agent_disabled' })
    }

    // Correr el agente
    console.log('[unipile/webhook] Corriendo agente...')
    const agentResponse = await runAgent(prospectId, messageText)
    console.log('[unipile/webhook] Respuesta:', agentResponse.message?.slice(0, 100))

    // Enviar respuesta directamente con chat_id
    if (agentResponse.message) {
      const sent = await sendMessageToChatId(chatId, agentResponse.message)
      await logEvent(prospectId, sent ? 'unipile_message_sent' : 'unipile_send_failed', { chat_id: chatId })
      console.log('[unipile/webhook] Enviado:', sent)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const error = err as Error
    console.error('[unipile/webhook] Error:', error.message)
    await logEvent(null, 'unipile_webhook_error', { payload: body }, error.message).catch(() => null)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
