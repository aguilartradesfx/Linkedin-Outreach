import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { FileText, Users, Network, ArrowRight } from 'lucide-react'

const sections = [
  {
    href: '/contratos',
    icon: FileText,
    label: 'Contratos',
    description: 'Creá, enviá y gestioná contratos de clientes.',
  },
  {
    href: '/clientes',
    icon: Users,
    label: 'Clientes',
    description: 'Base de datos de clientes activos e históricos.',
  },
  {
    href: '/linkedin-pipeline',
    icon: Network,
    label: 'LinkedIn Pipeline',
    description: 'Dashboard de prospección y seguimiento de leads.',
  },
]

export default async function AdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="p-6 md:p-10 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-white">Panel interno</h1>
        <p className="text-sm text-white/40 mt-1">{user?.email}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map(({ href, icon: Icon, label, description }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col gap-3 p-5 bg-white/[0.03] border border-white/[0.07] rounded-xl hover:border-orange-500/30 hover:bg-white/[0.05] transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Icon size={15} className="text-orange-400" />
              </div>
              <ArrowRight
                size={14}
                className="text-white/20 group-hover:text-orange-400 group-hover:translate-x-0.5 transition-all"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-white">{label}</p>
              <p className="text-xs text-white/40 mt-0.5 leading-relaxed">{description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
