import { NextResponse } from 'next/server'

// GET /api/unipile/test — muestra los últimos chats de Unipile para diagnóstico
export async function GET() {
  const BASE_URL = `https://${process.env.UNIPILE_DSN}/api/v1`
  const headers = {
    'X-API-KEY': process.env.UNIPILE_API_KEY!,
    'accept': 'application/json',
  }

  try {
    // 1. Verificar que la cuenta está activa
    const accountRes = await fetch(
      `${BASE_URL}/accounts/${process.env.UNIPILE_ACCOUNT_ID}`,
      { headers }
    )
    const account = await accountRes.json()

    // 2. Obtener los últimos 5 chats
    const chatsRes = await fetch(
      `${BASE_URL}/chats?account_id=${process.env.UNIPILE_ACCOUNT_ID}&limit=5`,
      { headers }
    )
    const chats = await chatsRes.json()

    // 3. Obtener el último mensaje del primer chat (si existe)
    let latestMessage = null
    const firstChat = chats?.items?.[0]
    if (firstChat?.id) {
      const msgsRes = await fetch(
        `${BASE_URL}/chats/${firstChat.id}/messages?limit=1`,
        { headers }
      )
      const msgs = await msgsRes.json()
      latestMessage = msgs?.items?.[0] ?? null
    }

    return NextResponse.json({
      account_status: account?.sources?.[0]?.status ?? 'unknown',
      account_name: account?.name,
      account_type: account?.type,
      total_chats_fetched: chats?.items?.length ?? 0,
      first_chat: firstChat ? {
        id: firstChat.id,
        attendees: firstChat.attendees,
      } : null,
      latest_message_in_first_chat: latestMessage,
    })
  } catch (err) {
    const error = err as Error
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
