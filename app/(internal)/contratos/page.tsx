import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { StatusBadge } from '@/components/contracts/status-badge'
import { CopyButton } from '@/components/contracts/copy-button'
import { ClickableRow } from '@/components/contracts/clickable-row'
import { Plus, FileText, ExternalLink } from 'lucide-react'
import type { ContractRow, ContractStatus } from '@/types/contracts'

const STATUSES: { value: ContractStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'draft', label: 'Borrador' },
  { value: 'sent', label: 'Enviado' },
  { value: 'viewed', label: 'Visto' },
  { value: 'signed_by_client', label: 'Firmado' },
  { value: 'cancelled', label: 'Cancelado' },
]

interface Props {
  searchParams: Promise<{ status?: string; q?: string }>
}

export default async function ContratosPage({ searchParams }: Props) {
  const { status, q } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('contracts')
    .select('id, slug, status, template_version, created_at, sent_at, signed_at, data')
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data: contracts = [] } = await query

  const filtered = q
    ? (contracts as ContractRow[]).filter((c) =>
        c.data?.cliente?.empresa_nombre?.toLowerCase().includes(q.toLowerCase()) ||
        c.data?.proyecto?.nombre_paquete?.toLowerCase().includes(q.toLowerCase()),
      )
    : (contracts as ContractRow[])

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bralto.io'

  return (
    <div className="p-4 md:p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div>
          <h1 className="text-xl font-semibold text-white">Contratos</h1>
          <p className="text-sm text-white/40 mt-0.5">{filtered.length} contrato(s)</p>
        </div>
        <Link
          href="/contratos/nuevo"
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={15} />
          Nuevo contrato
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        {STATUSES.map(({ value, label }) => (
          <Link
            key={value}
            href={`/contratos?status=${value}${q ? `&q=${q}` : ''}`}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              (status ?? 'all') === value
                ? 'bg-orange-500 text-white'
                : 'bg-white/5 text-white/50 hover:text-white/80 hover:bg-white/10'
            }`}
          >
            {label}
          </Link>
        ))}

        <form method="GET" action="/contratos" className="w-full md:w-auto md:ml-auto mt-2 md:mt-0">
          {status && status !== 'all' && (
            <input type="hidden" name="status" value={status} />
          )}
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar..."
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-orange-500/60 w-full md:w-56"
          />
        </form>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileText size={32} className="text-white/10 mb-3" />
          <p className="text-white/30 text-sm">No hay contratos{status && status !== 'all' ? ' con este estado' : ''}</p>
          <Link href="/contratos/nuevo" className="text-orange-400 hover:text-orange-300 text-sm mt-2">
            Crear el primero →
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-white/[0.08] overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead className="bg-white/[0.03] border-b border-white/[0.06]">
              <tr>
                <th className="text-left px-4 py-3 text-xs text-white/40 font-medium">Cliente</th>
                <th className="text-left px-4 py-3 text-xs text-white/40 font-medium">Paquete</th>
                <th className="text-left px-4 py-3 text-xs text-white/40 font-medium">Estado</th>
                <th className="text-left px-4 py-3 text-xs text-white/40 font-medium">Fecha</th>
                <th className="px-4 py-3 text-xs text-white/40 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map((contract) => (
                <ClickableRow key={contract.id} href={`/contratos/${contract.id}`}>
                  <td className="px-4 py-3">
                    <p className="text-sm text-white font-medium">
                      {contract.data?.cliente?.empresa_nombre ?? '—'}
                    </p>
                    <p className="text-xs text-white/30">
                      {contract.data?.cliente?.representante_nombre ?? ''}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-white/70">
                      {contract.data?.proyecto?.nombre_paquete ?? '—'}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={contract.status as ContractStatus} />
                  </td>
                  <td className="px-4 py-3 text-xs text-white/40">
                    {new Date(contract.created_at).toLocaleDateString('es-CR')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/contratos/${contract.id}`}
                        className="text-xs text-white/40 hover:text-white/80 px-2 py-1 rounded transition-colors"
                      >
                        Ver
                      </Link>
                      {['sent', 'viewed', 'signed_by_client', 'signed_fully'].includes(contract.status) && (
                        <>
                          <a
                            href={`${siteUrl}/c/${contract.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white/30 hover:text-orange-400 transition-colors"
                            title="Abrir enlace público"
                          >
                            <ExternalLink size={13} />
                          </a>
                          <CopyButton text={`${siteUrl}/c/${contract.slug}`} />
                        </>
                      )}
                    </div>
                  </td>
                </ClickableRow>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
