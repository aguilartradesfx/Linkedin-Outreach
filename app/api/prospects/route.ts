import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET() {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('linkedin_agent_prospects')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[api/prospects] Error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data ?? [])
  } catch (err) {
    const error = err as Error
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, ...fields } = await req.json() as { id: string; [key: string]: unknown }
    if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('linkedin_agent_prospects')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err) {
    const error = err as Error
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
