import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { SYSTEM_PROMPT } from '@/lib/prompts/system'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const service = createServiceClient()
    // maybeSingle() returns null (no error) when the table is empty
    const { data } = await service
      .from('agent_config')
      .select('value')
      .eq('id', 'system_prompt')
      .maybeSingle()

    return NextResponse.json({ prompt: data?.value ?? SYSTEM_PROMPT })
  } catch {
    // Any failure (missing table, env issues, etc.) → return the hardcoded default
    return NextResponse.json({ prompt: SYSTEM_PROMPT })
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    const { prompt } = body

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'Prompt inválido' }, { status: 400 })
    }

    const service = createServiceClient()
    const { error } = await service
      .from('agent_config')
      .upsert({ id: 'system_prompt', value: prompt.trim(), updated_at: new Date().toISOString() })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
