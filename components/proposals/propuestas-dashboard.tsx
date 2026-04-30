'use client'

import { useState, useEffect, useCallback } from 'react'
import { ExternalLink, Copy, Check, Trash2, Loader2, FileOutput } from 'lucide-react'
import type { ProposalRequest } from '@/types/proposals'
import { BRALTO_SERVICES } from '@/types/proposals'

const TH = 'text-left px-4 py-3 text-xs text-white/40 font-medium'
const TD = 'px-4 py-3'
const ROW = 'border-b border-white/[0.04] last:border-0'

function ServiceChip({ id }: { id: string }) {
  const svc = BRALTO_SERVICES.find((s) => s.id === id)
  return (
    <span className="inline-block px-1.5 py-0.5 text-[10px] bg-orange-500/10 text-orange-300/70 rounded whitespace-nowrap">
      {svc?.label ?? id}
    </span>
  )
}

function formatDate(dt: string | null) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="text-white/30 hover:text-white/70 transition-colors p-1" title="Copiar enlace">
      {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
    </button>
  )
}

function DeleteButton({ proposalId, onDeleted }: { proposalId: string; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm('¿Eliminar esta propuesta publicada? La página en bralto.io dejará de estar disponible.')) return
    setDeleting(true)
    const res = await fetch(`/api/proposals/${proposalId}/generated`, { method: 'DELETE' })
    if (res.ok) onDeleted()
    else setDeleting(false)
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="text-red-400/40 hover:text-red-400 transition-colors p-1 disabled:opacity-50"
      title="Eliminar propuesta publicada"
    >
      {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
    </button>
  )
}

type GeneratedProposal = ProposalRequest & { submitted_by_name?: string }

export function PropuestasDashboard() {
  const [proposals, setProposals] = useState<GeneratedProposal[]>([])
  const [loading, setLoading] = useState(true)

  const fetchProposals = useCallback(async () => {
    const res = await fetch('/api/proposals')
    if (res.ok) {
      const all: GeneratedProposal[] = await res.json()
      setProposals(all.filter((p) => !!p.generated_url))
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchProposals() }, [fetchProposals])

  function handleDeleted(id: string) {
    setProposals((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl min-h-screen flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Propuestas publicadas</h1>
          <p className="text-sm text-white/40 mt-0.5">
            {loading ? 'Cargando...' : `${proposals.length} propuesta(s) activa(s)`}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-white/30 text-sm py-10">
          <Loader2 size={14} className="animate-spin" />
          Cargando...
        </div>
      ) : proposals.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20">
          <FileOutput size={32} className="text-white/10 mb-3" />
          <p className="text-white/30 text-sm mb-1">No hay propuestas publicadas aún</p>
          <p className="text-white/20 text-xs">Genera una desde la sección de Solicitudes</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/[0.08] overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-white/[0.03] border-b border-white/[0.06]">
              <tr>
                <th className={TH}>Cliente</th>
                <th className={TH}>Servicios</th>
                <th className={TH}>Generada</th>
                <th className={TH}>Válida hasta</th>
                <th className={TH}>Enlace</th>
                <th className={TH}></th>
              </tr>
            </thead>
            <tbody>
              {proposals.map((p) => {
                const expiresAt = p.generated_at
                  ? new Date(new Date(p.generated_at).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString()
                  : null
                const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false

                return (
                  <tr key={p.id} className={ROW}>
                    <td className={TD}>
                      <p className="text-sm text-white font-medium">{p.client_name}</p>
                      {p.client_company && (
                        <p className="text-xs text-white/40 mt-0.5">{p.client_company}</p>
                      )}
                    </td>
                    <td className={TD}>
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {p.services.slice(0, 3).map((s) => <ServiceChip key={s} id={s} />)}
                        {p.services.length > 3 && (
                          <span className="text-[10px] text-white/30">+{p.services.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className={TD}>
                      <span className="text-xs text-white/50">{formatDate(p.generated_at)}</span>
                    </td>
                    <td className={TD}>
                      <span className={`text-xs ${isExpired ? 'text-red-400' : 'text-white/50'}`}>
                        {expiresAt ? formatDate(expiresAt) : '—'}
                        {isExpired && <span className="ml-1 text-[10px] text-red-400/70">(expirada)</span>}
                      </span>
                    </td>
                    <td className={TD}>
                      <div className="flex items-center gap-0.5">
                        <a
                          href={p.generated_url!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-400 hover:text-orange-300 transition-colors text-xs flex items-center gap-1"
                        >
                          Ver
                          <ExternalLink size={11} />
                        </a>
                        <CopyButton url={p.generated_url!} />
                      </div>
                    </td>
                    <td className={TD}>
                      <DeleteButton proposalId={p.id} onDeleted={() => handleDeleted(p.id)} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
