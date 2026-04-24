import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

function generatePassword(length = 12): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  // Only admins can list users
  const service = createServiceClient()
  const { data: profile } = await service
    .from('user_profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { data: { users }, error } = await service.auth.admin.listUsers()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: profiles } = await service
    .from('user_profiles')
    .select('*')

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]))

  const result = users.map((u) => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
    profile: profileMap.get(u.id) ?? null,
  }))

  return NextResponse.json(result)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const service = createServiceClient()
  const { data: callerProfile } = await service
    .from('user_profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!callerProfile?.is_admin) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const body = await request.json()
  const { email, full_name, permissions } = body

  if (!email) return NextResponse.json({ error: 'Email es requerido' }, { status: 400 })

  const tempPassword = generatePassword(14)

  const { data: newUser, error: createError } = await service.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: full_name || '' },
  })

  if (createError) return NextResponse.json({ error: createError.message }, { status: 500 })

  // Upsert profile with permissions
  const { error: profileError } = await service
    .from('user_profiles')
    .upsert({
      id: newUser.user.id,
      full_name: full_name || null,
      ...(permissions ?? {}),
    })

  if (profileError) {
    // Rollback: delete the created user
    await service.auth.admin.deleteUser(newUser.user.id)
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  return NextResponse.json({
    id: newUser.user.id,
    email: newUser.user.email,
    tempPassword,
  }, { status: 201 })
}
