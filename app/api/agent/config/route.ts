import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { SYSTEM_PROMPT } from '@/lib/prompts/system'

export const dynamic = 'force-dynamic'

export async function GET() {
  // GET is intentionally unauthenticated — the system prompt is not sensitive
  // and the page is already protected by middleware for authenticated users.
  try {
    const service = createServiceClient()
    const { data } = await service
      .from('agent_config')
      .select('value')
      .eq('id', 'system_prompt')
      .maybeSingle()

    return NextResponse.json({ prompt: data?.value ?? SYSTEM_PROMPT })
  } catch {
    return NextResponse.json({ prompt: SYSTEM_PROMPT })
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

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
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[agent-config PUT]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
