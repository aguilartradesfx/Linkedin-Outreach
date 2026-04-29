import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/clients/supabase'
import { runAgent } from '@/lib/agent'
import { logEvent } from '@/lib/utils/logger'
import { getChatDetails, sendMessageToChatId } from '@/lib/clients/unipile'

const rateLimitMap = new Map<string, number[]>()

function checkRateLimit(chatId: string): boolean {
  const now = Date.now()
  const timestamps = (rateLimitMap.get(chatId) ?? []).filter((t) => now - t < 60_000)
  if (timestamps.length >= 20) return false
  timestamps.push(now)
  rateLimitMap.set(chatId, timestamps)
  return true
}

// Eventos que indican un mensaje nuevo entrante
const NEW_MESSAGE_EVENTS = ['messaging.message.created', 'new_message', 'message.created', 'message_created']

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, unknown>
    const eventType = ((body.event ?? body.type ?? '') as string).toLowerCase()

    console.log('[unipile/webhook] event:', eventType, '| account:', body.account_id)

    // Validar que sea de nuestra cuenta
    const accountId = process.env.UNIPILE_ACCOUNT_ID
    if (accountId && body.account_id !== accountId) {
      return NextResponse.json({ ok: true, skipped: 'wrong_account' })
    }

    // Solo procesar mensajes nuevos
    const isNewMessage = NEW_MESSAGE_EVENTS.some((e) => eventType.includes(e.replace('.', '')))
      || (eventType.includes('message') && !eventType.includes('read') && !eventType.includes('reaction')
          && !eventType.includes('edit') && !eventType.includes('delet') && !eventType.includes('deliver'))

    if (!isNewMessage) {
      return NextResponse.json({ ok: true, skipped: 'not_new_message' })
    }

    // Extraer datos del mensaje
    const msg = (body.data ?? body.message ?? body) as Record<string, unknown>
    const chatId = (msg.chat_id ?? msg.chatId) as string | undefined
    const messageText = ((msg.text ?? msg.content ?? msg.body ?? '') as string).trim()
    const isSelf = (msg.is_self ?? msg.from_me ?? false) as boolean

    if (!chatId || !messageText) {
      console.log('[unipile/webhook] skipping: sin chat_id o texto')
      return NextResponse.json({ ok: true, skipped: 'missing_data' })
    }

    // Ignorar mensajes enviados por nosotros
    if (isSelf) {
      return NextResponse.json({ ok: true, skipped: 'self_message' })
    }

    if (!checkRateLimit(chatId)) {
      return NextResponse.json({ error: 'Rate limit' }, { status: 429 })
    }

    // Obtener detalles del chat para identificar al prospecto
    const chat = await getChatDetails(chatId)
    if (!chat) {
      console.error('[unipile/webhook] Chat no encontrado:', chatId)
      return NextResponse.json({ ok: true, skipped: 'chat_not_found' })
    }

    // Encontrar al attendee que NO somos nosotros
    const prospect_attendee = chat.attendees?.find(
      (a) => a.is_self !== true && a.identifier
    )

    if (!prospect_attendee?.identifier) {
      console.error('[unipile/webhook] No se encontró el prospecto en el chat:', chatId)
      return NextResponse.json({ ok: true, skipped: 'no_prospect_attendee' })
    }

    const linkedinUrl = `https://www.linkedin.com/in/${prospect_attendee.identifier}`
    const contactName = prospect_attendee.name ?? prospect_attendee.identifier

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
    } else {
      prospectId = existing.id as string

      await supabase
        .from('linkedin_agent_prospects')
        .update({
          unipile_chat_id: (existing.unipile_chat_id as string | null) ?? chatId,
          last_interaction_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...(['conexion_enviada', 'conectado'].includes(existing.status as string)
            ? { status: 'conversando' }
            : {}),
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
    const agentResponse = await runAgent(prospectId, messageText)

    // Enviar respuesta directamente al chat (sin búsqueda, ya tenemos el chat_id)
    if (agentResponse.message) {
      const sent = await sendMessageToChatId(chatId, agentResponse.message)
      await logEvent(prospectId, sent ? 'unipile_message_sent' : 'unipile_send_failed', { chat_id: chatId })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const error = err as Error
    console.error('[unipile/webhook] Error no manejado:', error.message)
    await logEvent(null, 'unipile_webhook_error', {}, error.message).catch(() => null)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
