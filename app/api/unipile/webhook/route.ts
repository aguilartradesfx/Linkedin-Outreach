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

// GET — para verificar que el endpoint existe y está activo
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

  // Log COMPLETO del payload para diagnóstico — no filtrar nada aún
  console.log('[unipile/webhook] RAW PAYLOAD:', JSON.stringify(body, null, 2))

  try {
    const eventType = ((body.event ?? body.type ?? body.name ?? '') as string).toLowerCase()
    console.log('[unipile/webhook] eventType:', eventType)

    // Ignorar eventos que no son mensajes nuevos
    // Acepta cualquier cosa que contenga "message" y no sea read/reaction/edit/delete/deliver
    const isSkippable = ['read', 'reaction', 'edit', 'delet', 'deliver', 'sent'].some((k) => eventType.includes(k))
    const hasMessage = eventType.includes('message') || eventType.includes('msg')

    if (hasMessage && isSkippable) {
      console.log('[unipile/webhook] skipping non-new-message event:', eventType)
      return NextResponse.json({ ok: true, skipped: 'not_new_message' })
    }

    // Buscar el chat_id y texto en múltiples estructuras posibles del payload
    const data = (body.data ?? body.message ?? body.object ?? body) as Record<string, unknown>
    const chatId = (data.chat_id ?? data.chatId ?? data.thread_id ?? body.chat_id) as string | undefined
    const messageText = ((data.text ?? data.content ?? data.body ?? data.message ?? '') as string).trim()
    // Unipile usa is_sender:1 para mensajes propios, is_sender:0 para del prospecto
    const isSenderVal = data.is_sender ?? data.is_self ?? data.from_me ?? data.sender_is_self
    const isSelf = isSenderVal === 1 || isSenderVal === true

    console.log('[unipile/webhook] parsed — chatId:', chatId, '| text:', messageText?.slice(0, 50), '| isSelf:', isSelf, '| is_sender raw:', isSenderVal)

    if (!chatId || !messageText) {
      console.log('[unipile/webhook] skipping: sin chat_id o texto')
      return NextResponse.json({ ok: true, skipped: 'missing_data' })
    }

    if (isSelf) {
      return NextResponse.json({ ok: true, skipped: 'self_message' })
    }

    if (!checkRateLimit(chatId)) {
      return NextResponse.json({ error: 'Rate limit' }, { status: 429 })
    }

    // Obtener detalles del chat
    const chat = await getChatDetails(chatId)
    console.log('[unipile/webhook] chat attendees:', JSON.stringify(chat?.attendees ?? []))

    if (!chat) {
      console.error('[unipile/webhook] Chat no encontrado:', chatId)
      return NextResponse.json({ ok: true, skipped: 'chat_not_found' })
    }

    // Encontrar al prospecto: attendee que NO somos nosotros
    // Primero intentamos is_self, luego filtramos por nuestro account identifier
    const myIdentifier = 'aleaguilarcr' // LinkedIn public identifier de la cuenta
    const prospect_attendee = chat.attendees?.find(
      (a) => a.is_self !== true && a.identifier !== myIdentifier && a.identifier
    ) ?? chat.attendees?.find((a) => a.identifier && a.identifier !== myIdentifier)

    console.log('[unipile/webhook] prospect_attendee:', JSON.stringify(prospect_attendee))

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
    console.log('[unipile/webhook] Corriendo agente para prospect:', prospectId)
    const agentResponse = await runAgent(prospectId, messageText)
    console.log('[unipile/webhook] Respuesta del agente:', agentResponse.message?.slice(0, 100))

    // Enviar respuesta directamente con chat_id
    if (agentResponse.message) {
      const sent = await sendMessageToChatId(chatId, agentResponse.message)
      await logEvent(prospectId, sent ? 'unipile_message_sent' : 'unipile_send_failed', { chat_id: chatId })
      console.log('[unipile/webhook] Mensaje enviado:', sent)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const error = err as Error
    console.error('[unipile/webhook] Error no manejado:', error.message, error.stack)
    await logEvent(null, 'unipile_webhook_error', { payload: body }, error.message).catch(() => null)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
