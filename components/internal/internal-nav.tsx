'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { FileText, Users, LogOut, Menu, X, Network, LayoutDashboard, ClipboardList, MessageCircle, UserCog } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

const navItems = [
  { href: '/admin',             label: 'Inicio',          icon: LayoutDashboard },
  { href: '/contratos',         label: 'Contratos',       icon: FileText },
  { href: '/clientes',          label: 'Clientes',        icon: Users },
  { href: '/solicitudes',       label: 'Solicitudes',     icon: ClipboardList },
  { href: '/conversaciones',    label: 'Conversaciones',  icon: MessageCircle },
  { href: '/linkedin-pipeline', label: 'LinkedIn Pipeline', icon: Network },
  { href: '/usuarios',          label: 'Usuarios',        icon: UserCog },
]

export function InternalNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

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
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
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
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-white/60 hover:text-white p-1"
        >
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
