import { NextResponse } from 'next/server'

export async function GET() {
  const BASE_URL = `https://${process.env.UNIPILE_DSN}/api/v1`
  const ACCOUNT_ID = process.env.UNIPILE_ACCOUNT_ID!
  const headers = {
    'X-API-KEY': process.env.UNIPILE_API_KEY!,
    'accept': 'application/json',
  }

  try {
    // 1. Primer chat
    const chatsRes = await fetch(`${BASE_URL}/chats?account_id=${ACCOUNT_ID}&limit=1`, { headers })
    const chats = await chatsRes.json()
    const firstChat = chats?.items?.[0]

    // 2. Detalle del chat
    let chatDetail = null
    if (firstChat?.id) {
      const r = await fetch(`${BASE_URL}/chats/${firstChat.id}`, { headers })
      chatDetail = await r.json()
    }

    // 3. Perfil del prospecto via attendee_provider_id
    const prospectUrn = chatDetail?.attendee_provider_id
    let prospectProfile = null
    if (prospectUrn) {
      const r = await fetch(`${BASE_URL}/users/${prospectUrn}?account_id=${ACCOUNT_ID}`, { headers })
      prospectProfile = await r.json()
    }

    // 4. Último mensaje
    let latestMessage = null
    if (firstChat?.id) {
      const r = await fetch(`${BASE_URL}/chats/${firstChat.id}/messages?limit=1`, { headers })
      const msgs = await r.json()
      latestMessage = msgs?.items?.[0] ?? null
    }

    return NextResponse.json({
      chat_id: firstChat?.id,
      chat_name: chatDetail?.name,
      attendee_provider_id: prospectUrn,
      prospect_profile: prospectProfile,
      latest_message: {
        text: latestMessage?.text,
        is_sender: latestMessage?.is_sender,
        sender_id: latestMessage?.sender_id,
        chat_id: latestMessage?.chat_id,
      },
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
