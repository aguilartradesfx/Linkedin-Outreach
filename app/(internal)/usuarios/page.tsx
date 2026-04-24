import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { UserManagement } from '@/components/users/user-management'
import type { UserWithProfile, UserProfile } from '@/types/user-profiles'

export const metadata = { title: 'Usuarios' }

export default async function UsuariosPage() {
  // Auth check server-side — no cookie issues
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = createServiceClient()

  // Admin check
  const { data: profile } = await service
    .from('user_profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.is_admin === true

  // Pre-load users server-side if admin
  let initialUsers: UserWithProfile[] = []
  if (isAdmin) {
    const [{ data: { users } }, { data: profiles }] = await Promise.all([
      service.auth.admin.listUsers(),
      service.from('user_profiles').select('*'),
    ])
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]))
    initialUsers = users.map((u) => ({
      id: u.id,
      email: u.email ?? '',
      created_at: u.created_at,
      profile: (profileMap.get(u.id) ?? null) as UserProfile | null,
    }))
  }

  return <UserManagement isAdmin={isAdmin} initialUsers={initialUsers} />
}
