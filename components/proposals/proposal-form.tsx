'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BRALTO_SERVICES,
  BUDGET_LABELS,
  TIMELINE_LABELS,
  PRIORITY_LABELS,
  type BudgetRange,
  type Timeline,
  type ProposalPriority,
} from '@/types/proposals'
import { Loader2, CheckSquare, Square } from 'lucide-react'

const INPUT =
  'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-orange-500/60 transition-colors'
const LABEL = 'block text-xs font-medium text-white/50 mb-1.5'
const SELECT =
  'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/60 transition-colors'

export function ProposalForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [clientName, setClientName] = useState('')
  const [clientCompany, setClientCompany] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientIndustry, setClientIndustry] = useState('')
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [budgetRange, setBudgetRange] = useState<BudgetRange>('no_definido')
  const [timeline, setTimeline] = useState<Timeline>('flexible')
  const [priority, setPriority] = useState<ProposalPriority>('normal')

  function toggleService(id: string) {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clientName.trim()) { setError('El nombre del cliente es requerido'); return }
    if (selectedServices.length === 0) { setError('Selecciona al menos un servicio'); return }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: clientName.trim(),
          client_company: clientCompany.trim() || null,
          client_email: clientEmail.trim() || null,
          client_phone: clientPhone.trim() || null,
          client_industry: clientIndustry.trim() || null,
          services: selectedServices,
          notes: notes.trim() || null,
          budget_range: budgetRange,
          timeline,
          priority,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Error al guardar')
      }

      router.push('/solicitudes?success=1')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl">
      {/* Client info */}
      <section>
        <h2 className="text-sm font-semibold text-white/80 mb-4 pb-2 border-b border-white/[0.06]">
          Información del cliente
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={LABEL}>Nombre del cliente <span className="text-orange-400">*</span></label>
            <input
              className={INPUT}
              placeholder="Ej. Juan Pérez"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </div>
          <div>
            <label className={LABEL}>Empresa</label>
            <input
              className={INPUT}
              placeholder="Nombre de la empresa"
              value={clientCompany}
              onChange={(e) => setClientCompany(e.target.value)}
            />
          </div>
          <div>
            <label className={LABEL}>Industria / Rubro</label>
            <input
              className={INPUT}
              placeholder="Ej. Salud, Tecnología, Retail..."
              value={clientIndustry}
              onChange={(e) => setClientIndustry(e.target.value)}
            />
          </div>
          <div>
            <label className={LABEL}>Correo electrónico</label>
            <input
              type="email"
              className={INPUT}
              placeholder="cliente@empresa.com"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
            />
          </div>
          <div>
            <label className={LABEL}>Teléfono / WhatsApp</label>
            <input
              className={INPUT}
              placeholder="+506 8888-8888"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Services */}
      <section>
        <h2 className="text-sm font-semibold text-white/80 mb-1 pb-2 border-b border-white/[0.06]">
          Servicios requeridos <span className="text-orange-400">*</span>
        </h2>
        <p className="text-xs text-white/30 mb-4">Marca todo lo que el cliente necesita o mencionó</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {BRALTO_SERVICES.map(({ id, label }) => {
            const active = selectedServices.includes(id)
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleService(id)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-sm text-left transition-all ${
                  active
                    ? 'border-orange-500/40 bg-orange-500/10 text-orange-300'
                    : 'border-white/[0.08] bg-white/[0.02] text-white/50 hover:text-white/70 hover:border-white/20'
                }`}
              >
                {active
                  ? <CheckSquare size={14} className="flex-shrink-0" />
                  : <Square size={14} className="flex-shrink-0 opacity-40" />
                }
                {label}
              </button>
            )
          })}
        </div>
      </section>

      {/* Context */}
      <section>
        <h2 className="text-sm font-semibold text-white/80 mb-4 pb-2 border-b border-white/[0.06]">
          Contexto adicional
        </h2>
        <div className="space-y-4">
          <div>
            <label className={LABEL}>Notas — ¿Qué te dijo el cliente? ¿Qué problema tiene?</label>
            <textarea
              className={`${INPUT} resize-none h-28`}
              placeholder="Describe la situación del cliente, sus dolores, qué busca lograr..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={LABEL}>Presupuesto estimado</label>
              <select
                className={SELECT}
                value={budgetRange}
                onChange={(e) => setBudgetRange(e.target.value as BudgetRange)}
              >
                {Object.entries(BUDGET_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL}>Timeline</label>
              <select
                className={SELECT}
                value={timeline}
                onChange={(e) => setTimeline(e.target.value as Timeline)}
              >
                {Object.entries(TIMELINE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL}>Prioridad</label>
              <select
                className={SELECT}
                value={priority}
                onChange={(e) => setPriority(e.target.value as ProposalPriority)}
              >
                {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          {loading ? 'Enviando...' : 'Enviar solicitud'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2.5 text-sm text-white/40 hover:text-white/70 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
