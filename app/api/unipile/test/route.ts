import { NextResponse } from 'next/server'

export async function GET() {
  const BASE_URL = `https://${process.env.UNIPILE_DSN}/api/v1`
  const headers = {
    'X-API-KEY': process.env.UNIPILE_API_KEY!,
    'accept': 'application/json',
  }

  try {
    // 1. Últimos 3 chats
    const chatsRes = await fetch(
      `${BASE_URL}/chats?account_id=${process.env.UNIPILE_ACCOUNT_ID}&limit=3`,
      { headers }
    )
    const chats = await chatsRes.json()
    const firstChatId = chats?.items?.[0]?.id

    // 2. Detalle completo del primer chat (con attendees)
    let chatDetail = null
    if (firstChatId) {
      const detailRes = await fetch(`${BASE_URL}/chats/${firstChatId}`, { headers })
      chatDetail = await detailRes.json()
    }

    // 3. Último mensaje del primer chat
    let latestMessage = null
    if (firstChatId) {
      const msgsRes = await fetch(`${BASE_URL}/chats/${firstChatId}/messages?limit=1`, { headers })
      const msgs = await msgsRes.json()
      latestMessage = msgs?.items?.[0] ?? null
    }

    return NextResponse.json({
      chat_list_raw: chats?.items?.map((c: Record<string, unknown>) => ({ id: c.id, keys: Object.keys(c) })),
      chat_detail_full: chatDetail,
      latest_message_full: latestMessage,
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
