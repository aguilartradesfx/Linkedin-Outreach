import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { InternalNav } from '@/components/internal/internal-nav'
import type { UserProfile } from '@/types/user-profiles'

export default async function InternalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = createServiceClient()
  const { data: profile } = await service
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">
      <InternalNav profile={profile as UserProfile | null} />
      <main className="pt-14 md:pt-0 md:ml-56 min-h-screen">{children}</main>
    </div>
  )
}
