import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { InternalNav } from '@/components/internal/internal-nav'

export default async function InternalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">
      <InternalNav />
      <main className="pt-14 md:pt-0 md:ml-56 min-h-screen">{children}</main>
    </div>
  )
}
