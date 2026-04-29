const BASE_URL = `https://${process.env.UNIPILE_DSN}/api/v1`

function getHeaders() {
  return {
    'X-API-KEY': process.env.UNIPILE_API_KEY!,
    'accept': 'application/json',
    'content-type': 'application/json',
  }
}

// Extrae el username de una URL de LinkedIn
function extractUsername(linkedinUrl: string): string | null {
  const match = linkedinUrl.match(/linkedin\.com\/in\/([^/?#]+)/)
  return match ? match[1].toLowerCase() : null
}

// Pagina por los chats del account buscando el que corresponde al username
async function findChatId(linkedinUrl: string): Promise<string | null> {
  const username = extractUsername(linkedinUrl)
  if (!username) return null

  let cursor: string | undefined

  for (let page = 0; page < 5; page++) {
    const url = new URL(`${BASE_URL}/chats`)
    url.searchParams.set('account_id', process.env.UNIPILE_ACCOUNT_ID!)
    url.searchParams.set('limit', '50')
    if (cursor) url.searchParams.set('cursor', cursor)

    const res = await fetch(url.toString(), { headers: getHeaders() })
    if (!res.ok) {
      console.error(`[unipile] Error al obtener chats: ${res.status}`)
      break
    }

    const data = await res.json() as {
      items?: Array<{
        id: string
        attendees?: Array<{ identifier?: string; provider_id?: string }>
      }>
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

export async function sendLinkedinMessage(linkedinUrl: string, text: string): Promise<boolean> {
  try {
    const chatId = await findChatId(linkedinUrl)
    if (!chatId) {
      console.error(`[unipile] Chat no encontrado para: ${linkedinUrl}`)
      return false
    }

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
    console.error('[unipile] Error inesperado:', err)
    return false
  }
}
