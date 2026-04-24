import type { ProspectStatus } from '@/types/linkedin'

export const STATUS_CONFIG: Record<ProspectStatus, { label: string; className: string }> = {
  nuevo: { label: 'Nuevo', className: 'bg-white/10 text-white/60' },
  conexion_enviada: { label: 'Conexión enviada', className: 'bg-sky-500/15 text-sky-400' },
  conectado: { label: 'Conectado', className: 'bg-blue-500/15 text-blue-400' },
  conversando: { label: 'Conversando', className: 'bg-amber-500/15 text-amber-400' },
  calificado: { label: 'Calificado', className: 'bg-orange-500/15 text-orange-400' },
  agendado: { label: 'Agendado', className: 'bg-emerald-500/15 text-emerald-400' },
  no_califica: { label: 'No califica', className: 'bg-red-500/10 text-red-400/80' },
  no_respondio: { label: 'No respondió', className: 'bg-white/5 text-white/35' },
  cerrado_ganado: { label: 'Cerrado ganado', className: 'bg-emerald-500/20 text-emerald-300' },
  cerrado_perdido: { label: 'Cerrado perdido', className: 'bg-red-500/15 text-red-400' },
}

export function ProspectStatusBadge({ status }: { status: ProspectStatus }) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: 'bg-white/10 text-white/50' }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${config.className}`}
    >
      {config.label}
    </span>
  )
}
