import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { SYSTEM_PROMPT } from '@/lib/prompts/system'

async function getAuthorizedUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const service = createServiceClient()
  const { data: profile } = await service
    .from('user_profiles')
    .select('can_view_linkedin, is_admin')
    .eq('id', user.id)
    .single()

  return profile?.can_view_linkedin || profile?.is_admin ? user : null
}

export async function GET() {
  const user = await getAuthorizedUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const service = createServiceClient()
  const { data } = await service
    .from('agent_config')
    .select('value')
    .eq('id', 'system_prompt')
    .single()

  return NextResponse.json({ prompt: data?.value ?? SYSTEM_PROMPT })
}

export async function PUT(request: Request) {
  const user = await getAuthorizedUser()
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
}
