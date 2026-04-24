import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const service = createServiceClient()
  const { data: profile } = await service
    .from('user_profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  return profile?.is_admin ? { user, service } : null
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await requireAdmin()
  if (!ctx) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const body = await request.json()
  const { full_name, is_admin, email, password, ...permissions } = body

  // Update auth credentials if provided
  if (email || password) {
    const authUpdate: { email?: string; password?: string } = {}
    if (email) authUpdate.email = email
    if (password) authUpdate.password = password
    const { error: authError } = await ctx.service.auth.admin.updateUserById(id, authUpdate)
    if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })
  }

  const hasProfileChanges =
    full_name !== undefined || is_admin !== undefined || Object.keys(permissions).length > 0

  if (!hasProfileChanges) {
    const { data: current } = await ctx.service.from('user_profiles').select('*').eq('id', id).single()
    return NextResponse.json(current ?? { id })
  }

  const { data, error } = await ctx.service
    .from('user_profiles')
    .upsert({
      id,
      ...(full_name !== undefined && { full_name }),
      ...(is_admin !== undefined && { is_admin }),
      ...permissions,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await requireAdmin()
  if (!ctx) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  // Prevent self-deletion
  const { data: { user } } = await createClient().then((s) => s.auth.getUser())
  if (user?.id === id) return NextResponse.json({ error: 'No puedes eliminarte a ti mismo' }, { status: 400 })

  const { error } = await ctx.service.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
