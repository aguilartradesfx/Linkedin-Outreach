import { NextResponse } from 'next/server'
import type Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { anthropic } from '@/lib/clients/anthropic'

interface TestMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await request.json()
  const { message, systemPrompt, history = [] }: {
    message: string
    systemPrompt: string
    history: TestMessage[]
  } = body

  if (!message || !systemPrompt) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  const messages = [
    ...(history as TestMessage[]).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user' as const, content: message },
  ]

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    system: systemPrompt,
    messages,
    max_tokens: 1024,
  })

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('\n')
    .trim()

  return NextResponse.json({ response: text })
}
