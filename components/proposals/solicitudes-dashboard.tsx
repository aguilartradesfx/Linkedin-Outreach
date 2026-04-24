'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  Plus, X, ChevronDown, Loader2, ClipboardList,
  Building2, Mail, Phone, MessageSquare, Trash2,
} from 'lucide-react'
import type { ProposalRequest, ProposalStatus, ProposalPriority } from '@/types/proposals'
import {
  BRALTO_SERVICES, STATUS_LABELS, STATUS_COLORS,
  PRIORITY_LABELS, PRIORITY_COLORS,
  BUDGET_LABELS, TIMELINE_LABELS,
} from '@/types/proposals'

const TH = 'text-left px-4 py-3 text-xs text-white/40 font-medium'
const TD = 'px-4 py-3'
const ROW = 'hover:bg-white/[0.03] cursor-pointer transition-colors border-b border-white/[0.04] last:border-0'

function ServiceChip({ id }: { id: string }) {
  const svc = BRALTO_SERVICES.find((s) => s.id === id)
  return (
    <span className="inline-block px-1.5 py-0.5 text-[10px] bg-orange-500/10 text-orange-300/70 rounded whitespace-nowrap">
      {svc?.label ?? id}
    </span>
  )
}

function StatusBadge({ status }: { status: ProposalStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${STATUS_COLORS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  )
}

function formatDate(dt: string) {
  return new Date(dt).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })
}

interface DetailPanelProps {
  proposal: ProposalRequest
  onClose: () => void
  onUpdated: (p: ProposalRequest) => void
  onDeleted: (id: string) => void
}

function DetailPanel({ proposal, onClose, onUpdated, onDeleted }: DetailPanelProps) {
  const [status, setStatus] = useState<ProposalStatus>(proposal.status)
  const [priority, setPriority] = useState<ProposalPriority>(proposal.priority)
  const [internalNotes, setInternalNotes] = useState(proposal.internal_notes ?? '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function save(patch: Partial<ProposalRequest>) {
    setSaving(true)
    const res = await fetch(`/api/proposals/${proposal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (res.ok) {
      const updated = await res.json()
      onUpdated(updated)
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar esta solicitud? Esta acción no se puede deshacer.')) return
    setDeleting(true)
    const res = await fetch(`/api/proposals/${proposal.id}`, { method: 'DELETE' })
    if (res.ok) onDeleted(proposal.id)
    setDeleting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50" onClick={onClose} />
      <div className="w-full max-w-[520px] bg-[#0f0f0f] border-l border-white/[0.08] flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-white/[0.08] flex-shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-base font-semibold text-white truncate">{proposal.client_name}</h2>
            {proposal.client_company && (
              <p className="text-xs text-white/40 mt-0.5">{proposal.client_company}</p>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <StatusBadge status={status} />
              <span className={`text-xs font-medium ${PRIORITY_COLORS[priority]}`}>
                {PRIORITY_LABELS[priority]}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors p-1 flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Contact */}
          <div className="space-y-2">
            {proposal.client_email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail size={13} className="text-white/30 flex-shrink-0" />
                <a href={`mailto:${proposal.client_email}`} className="text-white/70 hover:text-orange-400 transition-colors">
                  {proposal.client_email}
                </a>
              </div>
            )}
            {proposal.client_phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone size={13} className="text-white/30 flex-shrink-0" />
                <span className="text-white/70">{proposal.client_phone}</span>
              </div>
            )}
            {proposal.client_industry && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 size={13} className="text-white/30 flex-shrink-0" />
                <span className="text-white/60">{proposal.client_industry}</span>
              </div>
            )}
          </div>

          {/* Services */}
          <div>
            <p className="text-xs text-white/40 mb-2">Servicios solicitados</p>
            <div className="flex flex-wrap gap-1.5">
              {proposal.services.map((s) => <ServiceChip key={s} id={s} />)}
            </div>
          </div>

          {/* Notes */}
          {proposal.notes && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <MessageSquare size={12} className="text-white/30" />
                <span className="text-xs text-white/40">Notas del vendedor</span>
              </div>
              <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">{proposal.notes}</p>
            </div>
          )}

          {/* Budget & Timeline */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">
              <p className="text-xs text-white/30 mb-1">Presupuesto</p>
              <p className="text-sm text-white/80">{BUDGET_LABELS[proposal.budget_range]}</p>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">
              <p className="text-xs text-white/30 mb-1">Timeline</p>
              <p className="text-sm text-white/80">{TIMELINE_LABELS[proposal.timeline]}</p>
            </div>
          </div>

          {/* Dates */}
          <div className="text-xs text-white/25 space-y-1 pt-2 border-t border-white/[0.06]">
            <div>Enviada: {formatDate(proposal.created_at)}</div>
          </div>

          {/* Internal notes */}
          <div>
            <label className="block text-xs text-white/40 mb-1.5">Notas internas (solo equipo Bralto)</label>
            <textarea
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-orange-500/60 resize-none h-24 transition-colors"
              placeholder="Agrega notas internas sobre esta solicitud..."
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
            />
            <button
              onClick={() => save({ internal_notes: internalNotes })}
              disabled={saving}
              className="mt-1.5 text-xs text-orange-400 hover:text-orange-300 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Guardando...' : 'Guardar notas'}
            </button>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-white/[0.08] space-y-2.5 flex-shrink-0">
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <select
                value={status}
                onChange={(e) => { const s = e.target.value as ProposalStatus; setStatus(s); save({ status: s }) }}
                disabled={saving}
                className="w-full appearance-none bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-orange-500/60 disabled:opacity-50 pr-7"
              >
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={priority}
                onChange={(e) => { const p = e.target.value as ProposalPriority; setPriority(p); save({ priority: p }) }}
                disabled={saving}
                className="w-full appearance-none bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-orange-500/60 disabled:opacity-50 pr-7"
              >
                {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            </div>
          </div>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs text-red-400/60 hover:text-red-400 border border-red-500/10 hover:border-red-500/25 rounded-lg transition-colors disabled:opacity-50"
          >
            <Trash2 size={12} />
            {deleting ? 'Eliminando...' : 'Eliminar solicitud'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function SolicitudesDashboard() {
  const searchParams = useSearchParams()
  const [proposals, setProposals] = useState<ProposalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<ProposalRequest | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showSuccess, setShowSuccess] = useState(searchParams.get('success') === '1')

  const fetchProposals = useCallback(async () => {
    const res = await fetch('/api/proposals')
    if (res.ok) setProposals(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchProposals() }, [fetchProposals])

  useEffect(() => {
    if (showSuccess) {
      const t = setTimeout(() => setShowSuccess(false), 4000)
      return () => clearTimeout(t)
    }
  }, [showSuccess])

  const filtered = statusFilter === 'all'
    ? proposals
    : proposals.filter((p) => p.status === statusFilter)

  const counts = {
    pendiente:         proposals.filter((p) => p.status === 'pendiente').length,
    en_revision:       proposals.filter((p) => p.status === 'en_revision').length,
    propuesta_enviada: proposals.filter((p) => p.status === 'propuesta_enviada').length,
    ganado:            proposals.filter((p) => p.status === 'ganado').length,
    perdido:           proposals.filter((p) => p.status === 'perdido').length,
  }

  function handleUpdated(updated: ProposalRequest) {
    setProposals((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    setSelected(updated)
  }

  function handleDeleted(id: string) {
    setProposals((prev) => prev.filter((p) => p.id !== id))
    setSelected(null)
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl">
      {showSuccess && (
        <div className="mb-4 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm rounded-lg">
          Solicitud enviada correctamente. El equipo la revisará pronto.
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Solicitudes de propuesta</h1>
          <p className="text-sm text-white/40 mt-0.5">
            {loading ? 'Cargando...' : `${proposals.length} solicitud(es)`}
          </p>
        </div>
        <Link
          href="/solicitudes/nueva"
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={15} />
          Nueva solicitud
        </Link>
      </div>

      {/* Status filter pills */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {([
          ['all', 'Todas', proposals.length],
          ['pendiente', 'Pendientes', counts.pendiente],
          ['en_revision', 'En revisión', counts.en_revision],
          ['propuesta_enviada', 'Propuesta enviada', counts.propuesta_enviada],
          ['ganado', 'Ganadas', counts.ganado],
          ['perdido', 'Perdidas', counts.perdido],
        ] as [string, string, number][]).map(([val, label, count]) => (
          <button
            key={val}
            onClick={() => setStatusFilter(val)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              statusFilter === val
                ? 'bg-orange-500/15 text-orange-400 border-orange-500/30'
                : 'bg-white/[0.03] text-white/40 border-white/[0.08] hover:text-white/60'
            }`}
          >
            {label}
            <span className={`text-[10px] px-1 rounded ${statusFilter === val ? 'bg-orange-500/20' : 'bg-white/[0.06]'}`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center gap-2 text-white/30 text-sm py-10">
          <Loader2 size={14} className="animate-spin" />
          Cargando...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <ClipboardList size={32} className="text-white/10 mb-3" />
          <p className="text-white/30 text-sm mb-1">
            {proposals.length === 0 ? 'Aún no hay solicitudes' : 'Sin resultados para este filtro'}
          </p>
          {proposals.length === 0 && (
            <Link href="/solicitudes/nueva" className="text-orange-400 text-xs hover:text-orange-300 mt-1 transition-colors">
              Crear primera solicitud →
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-white/[0.08] overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-white/[0.03] border-b border-white/[0.06]">
              <tr>
                <th className={TH}>Cliente</th>
                <th className={TH}>Servicios</th>
                <th className={TH}>Presupuesto</th>
                <th className={TH}>Prioridad</th>
                <th className={TH}>Estado</th>
                <th className={TH}>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className={ROW} onClick={() => setSelected(p)}>
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
                    <span className="text-xs text-white/50">{BUDGET_LABELS[p.budget_range]}</span>
                  </td>
                  <td className={TD}>
                    <span className={`text-xs font-medium ${PRIORITY_COLORS[p.priority]}`}>
                      {PRIORITY_LABELS[p.priority]}
                    </span>
                  </td>
                  <td className={TD}>
                    <StatusBadge status={p.status} />
                  </td>
                  <td className={TD}>
                    <span className="text-xs text-white/30">{formatDate(p.created_at)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <DetailPanel
          proposal={selected}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  )
}
