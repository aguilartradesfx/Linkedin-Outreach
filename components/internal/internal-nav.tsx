'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  FileText, Users, LogOut, Menu, X, Network,
  LayoutDashboard, ClipboardList, MessageCircle, UserCog,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import type { UserProfile } from '@/types/user-profiles'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  // null = always visible; string = key in UserProfile that must be true
  permission: keyof UserProfile | null
}

const NAV_ITEMS: NavItem[] = [
  { href: '/admin',             label: 'Inicio',           icon: LayoutDashboard, permission: null },
  { href: '/contratos',         label: 'Contratos',        icon: FileText,        permission: 'can_view_contracts' },
  { href: '/clientes',          label: 'Clientes',         icon: Users,           permission: 'can_view_clients' },
  { href: '/solicitudes',       label: 'Solicitudes',      icon: ClipboardList,   permission: 'can_submit_proposals' },
  { href: '/conversaciones',    label: 'Conversaciones',   icon: MessageCircle,   permission: 'can_view_linkedin' },
  { href: '/linkedin-pipeline', label: 'LinkedIn Pipeline',icon: Network,         permission: 'can_view_linkedin' },
  { href: '/usuarios',          label: 'Usuarios',         icon: UserCog,         permission: 'is_admin' },
]

function isVisible(item: NavItem, profile: UserProfile | null): boolean {
  if (item.permission === null) return true
  if (!profile) return false
  if (profile.is_admin) return true // admins see everything
  return !!profile[item.permission]
}

interface InternalNavProps {
  profile: UserProfile | null
}

export function InternalNav({ profile }: InternalNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  const visibleItems = NAV_ITEMS.filter((item) => isVisible(item, profile))

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const navContent = (
    <>
      {/* Logo */}
      <div className="px-5 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Image src="/logo-white.svg" alt="Bralto" width={90} height={22} className="h-5 w-auto object-contain" />
          <span className="text-orange-500 text-[10px] font-medium uppercase tracking-widest mt-0.5">
            interno
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {visibleItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href) && (href !== '/admin' || pathname === '/admin')
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                active
                  ? 'bg-orange-500/10 text-orange-400'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
              }`}
            >
              <Icon size={15} strokeWidth={active ? 2 : 1.5} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-4 border-t border-white/[0.06] pt-3">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-colors w-full"
        >
          <LogOut size={15} strokeWidth={1.5} />
          Cerrar sesión
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-56 bg-[#111111] border-r border-white/[0.06] flex-col z-40">
        {navContent}
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#111111] border-b border-white/[0.06] flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-2">
          <Image src="/logo-white.svg" alt="Bralto" width={80} height={20} className="h-5 w-auto object-contain" />
          <span className="text-orange-500 text-[10px] font-medium uppercase tracking-widest">interno</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-white/60 hover:text-white p-1">
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <aside
            className="absolute left-0 top-0 h-full w-64 bg-[#111111] border-r border-white/[0.06] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {navContent}
          </aside>
        </div>
      )}
    </>
  )
}
