import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const service = createServiceClient()
  const { data, error } = await service
    .from('proposal_requests')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await request.json()
  const {
    client_name,
    client_company,
    client_email,
    client_phone,
    client_industry,
    services,
    notes,
    budget_range,
    timeline,
    priority,
  } = body

  if (!client_name || !Array.isArray(services) || services.length === 0) {
    return NextResponse.json({ error: 'Nombre del cliente y al menos un servicio son requeridos' }, { status: 400 })
  }

  const service = createServiceClient()
  const { data, error } = await service
    .from('proposal_requests')
    .insert({
      client_name,
      client_company: client_company || null,
      client_email: client_email || null,
      client_phone: client_phone || null,
      client_industry: client_industry || null,
      services,
      notes: notes || null,
      budget_range: budget_range || 'no_definido',
      timeline: timeline || 'flexible',
      priority: priority || 'normal',
      submitted_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
