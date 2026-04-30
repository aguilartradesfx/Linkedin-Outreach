const BASE_URL = `https://${process.env.UNIPILE_DSN}/api/v1`

function getHeaders() {
  return {
    'X-API-KEY': process.env.UNIPILE_API_KEY!,
    'accept': 'application/json',
    'content-type': 'application/json',
  }
}

export interface UnipileAttendee {
  id: string
  name?: string
  identifier?: string
  provider_id?: string
  is_self?: boolean
}

export interface UnipileChat {
  id: string
  account_id: string
  attendees?: UnipileAttendee[]
}

// Enviar mensaje a un chat conocido (directo, sin búsqueda)
export async function sendMessageToChatId(chatId: string, text: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/chats/${chatId}/messages`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ text }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error(`[unipile] Error al enviar mensaje: ${errText}`)
      return false
    }

    return true
  } catch (err) {
    console.error('[unipile] Error inesperado al enviar:', err)
    return false
  }
}

// Obtener detalles de un chat
export async function getChatDetails(chatId: string): Promise<UnipileChat | null> {
  try {
    const res = await fetch(`${BASE_URL}/chats/${chatId}`, { headers: getHeaders() })
    if (!res.ok) return null
    return await res.json() as UnipileChat
  } catch {
    return null
  }
}

// Resolver el LinkedIn public identifier a partir del URN (ACoAAC...)
export async function getLinkedinIdentifier(providerUrn: string): Promise<{ identifier: string; name: string } | null> {
  try {
    const res = await fetch(
      `${BASE_URL}/users/${providerUrn}?account_id=${process.env.UNIPILE_ACCOUNT_ID}`,
      { headers: getHeaders() }
    )
    if (!res.ok) return null
    const data = await res.json() as Record<string, unknown>
    const identifier = (data.identifier ?? data.public_identifier ?? data.username) as string | undefined
    const name = (data.name ?? data.full_name ?? data.display_name ?? '') as string
    if (!identifier) return null
    return { identifier, name }
  } catch {
    return null
  }
}

// Busca el chat_id paginando por el inbox (fallback si no tenemos chat_id guardado)
async function findChatId(linkedinUrl: string): Promise<string | null> {
  const match = linkedinUrl.match(/linkedin\.com\/in\/([^/?#]+)/)
  if (!match) return null
  const username = match[1].toLowerCase()

  let cursor: string | undefined

  for (let page = 0; page < 5; page++) {
    const url = new URL(`${BASE_URL}/chats`)
    url.searchParams.set('account_id', process.env.UNIPILE_ACCOUNT_ID!)
    url.searchParams.set('limit', '50')
    if (cursor) url.searchParams.set('cursor', cursor)

    const res = await fetch(url.toString(), { headers: getHeaders() })
    if (!res.ok) break

    const data = await res.json() as {
      items?: Array<{ id: string; attendees?: UnipileAttendee[] }>
      cursor?: string
    }

    for (const chat of data.items ?? []) {
      for (const attendee of chat.attendees ?? []) {
        if (
          attendee.identifier?.toLowerCase() === username ||
          attendee.provider_id?.toLowerCase() === username
        ) {
          return chat.id
        }
      }
    }

    cursor = data.cursor
    if (!cursor) break
  }

  return null
}

// Enviar mensaje por LinkedIn URL (busca el chat_id si no lo tenemos)
export async function sendLinkedinMessage(linkedinUrl: string, text: string): Promise<boolean> {
  try {
    const chatId = await findChatId(linkedinUrl)
    if (!chatId) {
      console.error(`[unipile] Chat no encontrado para: ${linkedinUrl}`)
      return false
    }
    return sendMessageToChatId(chatId, text)
  } catch (err) {
    console.error('[unipile] Error inesperado:', err)
    return false
  }
}
