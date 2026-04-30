import { NextResponse } from 'next/server'
import type Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { supabase } from '@/lib/clients/supabase'
import { anthropic } from '@/lib/clients/anthropic'
import { toolDefinitions, executeTool } from '@/lib/tools/index'

const MAX_TOOL_ITERATIONS = 12

interface TestMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(request: Request) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await request.json()
  const { message, systemPrompt, history = [], prospectId: incomingProspectId }: {
    message: string
    systemPrompt: string
    history: TestMessage[]
    prospectId?: string
  } = body

  if (!message || !systemPrompt) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  // Create a test prospect on the first message of each session
  let prospectId = incomingProspectId
  if (!prospectId) {
    const { data: newProspect } = await supabase
      .from('linkedin_agent_prospects')
      .insert({
        linkedin_url: `test-session-${Date.now()}`,
        full_name: 'Test Usuario',
        first_name: 'Test',
        last_name: 'Usuario',
        status: 'conversando',
      })
      .select('id')
      .single()
    prospectId = newProspect?.id
  }

  const now = new Date()
  const systemWithContext = prospectId
    ? `${systemPrompt}\n\n## CONTEXTO DE SESIÓN\nFecha y hora actual: ${now.toISOString()} (${now.toLocaleString('es-CR', { timeZone: 'America/Costa_Rica', dateStyle: 'full', timeStyle: 'short' })})\nProspect ID activo: ${prospectId}\nUsá este ID en todas las llamadas a tools que requieran prospect_id.\nCuando busques slots de calendario, usá fechas a partir de HOY o en el futuro cercano.`
    : systemPrompt

  const messages: Anthropic.MessageParam[] = [
    ...(history as TestMessage[]).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user' as const, content: message },
  ]

  let response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    system: systemWithContext,
    messages,
    tools: toolDefinitions,
    max_tokens: 1024,
  })

  let finalText = ''
  let iterations = 0

  while (iterations < MAX_TOOL_ITERATIONS) {
    iterations++

    if (response.stop_reason === 'end_turn') {
      const endText = extractText(response.content)
      if (endText) finalText = endText
      break
    }

    if (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
      )

      const partialText = extractText(response.content)
      if (partialText) finalText = partialText

      const toolResults: Anthropic.ToolResultBlockParam[] = []
      for (const toolUse of toolUseBlocks) {
        const result = await executeTool(toolUse.name, toolUse.input as Record<string, unknown>)
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        })
      }

      messages.push({ role: 'assistant', content: response.content })
      messages.push({ role: 'user', content: toolResults })

      const forceText = iterations >= MAX_TOOL_ITERATIONS - 1
      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        system: systemWithContext,
        messages,
        tools: toolDefinitions,
        ...(forceText ? { tool_choice: { type: 'none' as const } } : {}),
        max_tokens: 1024,
      })

      continue
    }

    const otherText = extractText(response.content)
    if (otherText) finalText = otherText
    break
  }

  if (!finalText) {
    const lastText = extractText(response.content)
    if (lastText) finalText = lastText
  }

  return NextResponse.json({ response: finalText || null, prospectId })
}

function extractText(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('\n')
    .trim()
}
