'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { LinkedInProspect, ProspectStatus } from '@/types/linkedin'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { ProspectStatusBadge } from './status-badge'
import { SignalDots } from './signal-dots'
import { ProspectPanel } from './prospect-panel'
import { EventsLogView } from './events-log-view'
import { startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns'
import {
  Users,
  Calendar,
  TrendingUp,
  Star,
  Activity,
  Search,
  RefreshCw,
  Loader2,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react'

// ─── Helpers ────────────────────────────────────────────────────────────────

const supabase = createClient()

function icpColor(score: number) {
  if (score >= 70) return 'text-emerald-400'
  if (score >= 40) return 'text-amber-400'
  return 'text-red-400'
}

function formatShortDate(dt: string | null) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('es-CR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(dt: string | null) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('es-CR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function truncate(str: string | null | undefined, len: number) {
  if (!str) return '—'
  return str.length > len ? str.slice(0, len) + '…' : str
}

function prospectName(p: LinkedInProspect) {
  return (
    p.full_name ??
    (`${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Sin nombre')
  )
}

function computeMetrics(prospects: LinkedInProspect[]) {
  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })

  const total = prospects.length

  const active = prospects.filter((p) =>
    ['conexion_enviada', 'conectado', 'conversando', 'calificado'].includes(p.status),
  ).length

  const scheduledThisWeek = prospects.filter((p) => {
    if (p.status !== 'agendado' || !p.appointment_datetime) return false
    try {
      return isWithinInterval(parseISO(p.appointment_datetime), {
        start: weekStart,
        end: weekEnd,
      })
    } catch {
      return false
    }
  }).length

  const respondedStatuses: ProspectStatus[] = [
    'conversando',
    'calificado',
    'agendado',
    'cerrado_ganado',
    'cerrado_perdido',
  ]
  const responded = prospects.filter((p) => respondedStatuses.includes(p.status)).length
  const sentOrResponded = prospects.filter(
    (p) => p.status === 'conexion_enviada' || respondedStatuses.includes(p.status),
  ).length
  const responseRate =
    sentOrResponded > 0 ? Math.round((responded / sentOrResponded) * 100) : 0

  const activeWithScore = prospects.filter(
    (p) =>
      ['conexion_enviada', 'conectado', 'conversando', 'calificado'].includes(p.status) &&
      p.icp_score !== null,
  )
  const avgIcpScore =
    activeWithScore.length > 0
      ? Math.round(
          activeWithScore.reduce((sum, p) => sum + (p.icp_score ?? 0), 0) /
            activeWithScore.length,
        )
      : 0

  return { total, active, scheduledThisWeek, responseRate, avgIcpScore }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon size={28} className="text-white/10 mb-3" />
      <p className="text-sm text-white/30">{text}</p>
    </div>
  )
}

const TH = 'text-left px-4 py-3 text-xs text-white/40 font-medium'
const TD = 'px-4 py-3'
const ROW =
  'hover:bg-white/[0.03] cursor-pointer transition-colors border-b border-white/[0.04] last:border-0'

// ─── Main component ──────────────────────────────────────────────────────────

export function PipelineDashboard() {
  const [prospects, setProspects] = useState<LinkedInProspect[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProspect, setSelectedProspect] = useState<LinkedInProspect | null>(null)
  const [activeTab, setActiveTab] = useState('agendadas')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [minScore, setMinScore] = useState<number>(0)
  const initialLoad = useRef(true)

  const fetchProspects = useCallback(async () => {
    const { data } = await supabase
      .from('linkedin_agent_prospects')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setProspects(data as LinkedInProspect[])
    setLoading(false)
    initialLoad.current = false
  }, [])

  useEffect(() => {
    fetchProspects()

    const channel = supabase
      .channel('linkedin-prospects-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'linkedin_agent_prospects' },
        () => {
          fetchProspects()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchProspects])

  const metrics = useMemo(() => computeMetrics(prospects), [prospects])

  const agendadas = useMemo(
    () =>
      prospects
        .filter((p) => p.status === 'agendado')
        .sort((a, b) => {
          if (!a.appointment_datetime) return 1
          if (!b.appointment_datetime) return -1
          return (
            new Date(a.appointment_datetime).getTime() -
            new Date(b.appointment_datetime).getTime()
          )
        }),
    [prospects],
  )

  const hotLeads = useMemo(
    () =>
      prospects
        .filter(
          (p) =>
            (p.icp_score ?? 0) >= 70 &&
            ['conversando', 'calificado'].includes(p.status),
        )
        .sort((a, b) => (b.icp_score ?? 0) - (a.icp_score ?? 0)),
    [prospects],
  )

  const conversando = useMemo(
    () =>
      prospects
        .filter((p) => p.status === 'conversando')
        .sort((a, b) => {
          if (!a.last_interaction_at) return 1
          if (!b.last_interaction_at) return -1
          return (
            new Date(b.last_interaction_at).getTime() -
            new Date(a.last_interaction_at).getTime()
          )
        }),
    [prospects],
  )

  const todos = useMemo(() => {
    return prospects.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      if ((p.icp_score ?? 0) < minScore) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return (
          prospectName(p).toLowerCase().includes(q) ||
          (p.company_name ?? '').toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [prospects, statusFilter, minScore, searchQuery])

  function handleProspectUpdated(updated: LinkedInProspect) {
    setProspects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    setSelectedProspect(updated)
  }

  const TABS = [
    { value: 'agendadas', label: '📅 Agendadas', count: agendadas.length },
    { value: 'hot', label: '🔥 Hot Leads', count: hotLeads.length },
    { value: 'conversando', label: '💬 Conversando', count: conversando.length },
    { value: 'todos', label: '📊 Todos', count: todos.length },
    { value: 'eventos', label: 'Eventos', count: null },
  ]

  return (
    <div className="p-4 md:p-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">LinkedIn Pipeline</h1>
          <p className="text-sm text-white/40 mt-0.5">
            {loading ? 'Cargando...' : `${metrics.total} prospecto(s)`}
          </p>
        </div>
        <button
          onClick={fetchProspects}
          className="flex items-center gap-2 px-3 py-2 text-sm text-white/40 hover:text-white/70 border border-white/10 rounded-lg hover:border-white/20 transition-colors"
        >
          <RefreshCw size={13} />
          Refrescar
        </button>
      </div>

      {/* Metric cards */}
      {loading ? (
        <div className="flex items-center gap-2 mb-8 text-white/30 text-sm">
          <Loader2 size={14} className="animate-spin" />
          Cargando datos...
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
          {(
            [
              { label: 'Total prospectos', value: metrics.total, Icon: Users, highlight: false },
              { label: 'Pipeline activo', value: metrics.active, Icon: Activity, highlight: true },
              {
                label: 'Calls esta semana',
                value: metrics.scheduledThisWeek,
                Icon: Calendar,
                highlight: metrics.scheduledThisWeek > 0,
              },
              {
                label: 'Tasa de respuesta',
                value: `${metrics.responseRate}%`,
                Icon: TrendingUp,
                highlight: metrics.responseRate > 0,
              },
              {
                label: 'Score ICP prom.',
                value: metrics.avgIcpScore,
                Icon: Star,
                highlight: metrics.avgIcpScore >= 70,
              },
            ] as const
          ).map(({ label, value, Icon, highlight }) => (
            <div
              key={label}
              className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4 hover:border-orange-500/20 transition-colors group"
            >
              <Icon
                size={14}
                className="text-white/20 mb-2 group-hover:text-orange-500/50 transition-colors"
              />
              <p
                className={`text-2xl font-bold tabular-nums ${
                  highlight ? 'text-orange-400' : 'text-white'
                }`}
              >
                {value}
              </p>
              <p className="text-xs text-white/40 mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <TabsPrimitive.Root value={activeTab} onValueChange={setActiveTab}>
        <TabsPrimitive.List className="flex border-b border-white/[0.06] mb-5 overflow-x-auto">
          {TABS.map(({ value, label, count }) => (
            <TabsPrimitive.Trigger
              key={value}
              value={value}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                activeTab === value
                  ? 'text-orange-400 border-orange-500'
                  : 'text-white/40 border-transparent hover:text-white/70'
              }`}
            >
              {label}
              {count !== null && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    activeTab === value
                      ? 'bg-orange-500/20 text-orange-400'
                      : 'bg-white/[0.06] text-white/30'
                  }`}
                >
                  {count}
                </span>
              )}
            </TabsPrimitive.Trigger>
          ))}
        </TabsPrimitive.List>

        {/* ── Tab: Agendadas ── */}
        <TabsPrimitive.Content value="agendadas">
          {agendadas.length === 0 ? (
            <EmptyState icon={Calendar} text="Sin calls agendadas" />
          ) : (
            <div className="rounded-xl border border-white/[0.08] overflow-hidden overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className="bg-white/[0.03] border-b border-white/[0.06]">
                  <tr>
                    <th className={TH}>Nombre</th>
                    <th className={TH}>Empresa</th>
                    <th className={TH}>Cargo</th>
                    <th className={TH}>Score ICP</th>
                    <th className={TH}>Fecha cita</th>
                    <th className={TH}>Problema detectado</th>
                  </tr>
                </thead>
                <tbody>
                  {agendadas.map((p) => (
                    <tr key={p.id} className={ROW} onClick={() => setSelectedProspect(p)}>
                      <td className={TD}>
                        <p className="text-sm text-white font-medium">{prospectName(p)}</p>
                      </td>
                      <td className={TD}>
                        <p className="text-sm text-white/70">{p.company_name ?? '—'}</p>
                      </td>
                      <td className={TD}>
                        <p className="text-sm text-white/60">{truncate(p.position, 30)}</p>
                      </td>
                      <td className={TD}>
                        {p.icp_score !== null ? (
                          <span className={`text-sm font-bold ${icpColor(p.icp_score)}`}>
                            {p.icp_score}
                          </span>
                        ) : (
                          <span className="text-white/25">—</span>
                        )}
                      </td>
                      <td className={TD}>
                        <span className="text-sm text-emerald-300">
                          {formatDateTime(p.appointment_datetime)}
                        </span>
                      </td>
                      <td className={TD}>
                        <p className="text-xs text-white/50">
                          {truncate(p.qualification_reason, 60)}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsPrimitive.Content>

        {/* ── Tab: Hot Leads ── */}
        <TabsPrimitive.Content value="hot">
          {hotLeads.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              text="Sin hot leads (score ≥ 70 en conversando o calificado)"
            />
          ) : (
            <div className="rounded-xl border border-white/[0.08] overflow-hidden overflow-x-auto">
              <table className="w-full min-w-[580px]">
                <thead className="bg-white/[0.03] border-b border-white/[0.06]">
                  <tr>
                    <th className={TH}>Nombre</th>
                    <th className={TH}>Empresa</th>
                    <th className={TH}>Score ICP</th>
                    <th className={TH}>Status</th>
                    <th className={TH}>Señales</th>
                    <th className={TH}>Última interacción</th>
                  </tr>
                </thead>
                <tbody>
                  {hotLeads.map((p) => (
                    <tr key={p.id} className={ROW} onClick={() => setSelectedProspect(p)}>
                      <td className={TD}>
                        <p className="text-sm text-white font-medium">{prospectName(p)}</p>
                      </td>
                      <td className={TD}>
                        <p className="text-sm text-white/70">{p.company_name ?? '—'}</p>
                      </td>
                      <td className={TD}>
                        {p.icp_score !== null ? (
                          <span className={`text-sm font-bold ${icpColor(p.icp_score)}`}>
                            {p.icp_score}
                          </span>
                        ) : (
                          <span className="text-white/25">—</span>
                        )}
                      </td>
                      <td className={TD}>
                        <ProspectStatusBadge status={p.status} />
                      </td>
                      <td className={TD}>
                        <SignalDots
                          isDecisionMaker={p.is_decision_maker}
                          hasBudgetSignal={p.has_budget_signal}
                          mentionedProblem={p.mentioned_problem}
                          timingUrgency={p.timing_urgency}
                        />
                      </td>
                      <td className={TD}>
                        <span className="text-xs text-white/40">
                          {formatShortDate(p.last_interaction_at)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsPrimitive.Content>

        {/* ── Tab: Conversando ── */}
        <TabsPrimitive.Content value="conversando">
          {conversando.length === 0 ? (
            <EmptyState icon={MessageSquare} text="Sin prospectos conversando" />
          ) : (
            <div className="rounded-xl border border-white/[0.08] overflow-hidden overflow-x-auto">
              <table className="w-full min-w-[580px]">
                <thead className="bg-white/[0.03] border-b border-white/[0.06]">
                  <tr>
                    <th className={TH}>Nombre</th>
                    <th className={TH}>Empresa</th>
                    <th className={TH}>Mensaje inicial</th>
                    <th className={TH}>Señales</th>
                    <th className={TH}>Última interacción</th>
                  </tr>
                </thead>
                <tbody>
                  {conversando.map((p) => (
                    <tr key={p.id} className={ROW} onClick={() => setSelectedProspect(p)}>
                      <td className={TD}>
                        <p className="text-sm text-white font-medium">{prospectName(p)}</p>
                      </td>
                      <td className={TD}>
                        <p className="text-sm text-white/70">{p.company_name ?? '—'}</p>
                      </td>
                      <td className={TD}>
                        <p className="text-xs text-white/50">{truncate(p.initial_message, 60)}</p>
                      </td>
                      <td className={TD}>
                        <SignalDots
                          isDecisionMaker={p.is_decision_maker}
                          hasBudgetSignal={p.has_budget_signal}
                          mentionedProblem={p.mentioned_problem}
                          timingUrgency={p.timing_urgency}
                        />
                      </td>
                      <td className={TD}>
                        <span className="text-xs text-white/40">
                          {formatShortDate(p.last_interaction_at)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsPrimitive.Content>

        {/* ── Tab: Todos ── */}
        <TabsPrimitive.Content value="todos">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="relative">
              <Search
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
              />
              <input
                type="text"
                placeholder="Buscar nombre o empresa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-orange-500/60 w-56"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white/70 focus:outline-none focus:border-orange-500/60"
            >
              <option value="all">Todos los estados</option>
              {(
                [
                  'nuevo',
                  'conexion_enviada',
                  'conectado',
                  'conversando',
                  'calificado',
                  'agendado',
                  'no_califica',
                  'no_respondio',
                  'cerrado_ganado',
                  'cerrado_perdido',
                ] as ProspectStatus[]
              ).map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40">Score mín:</span>
              <input
                type="number"
                min={0}
                max={100}
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white/70 focus:outline-none focus:border-orange-500/60 w-16 text-center"
              />
            </div>
          </div>

          {todos.length === 0 ? (
            <EmptyState icon={Users} text="Sin resultados con los filtros aplicados" />
          ) : (
            <div className="rounded-xl border border-white/[0.08] overflow-hidden overflow-x-auto">
              <table className="w-full min-w-[520px]">
                <thead className="bg-white/[0.03] border-b border-white/[0.06]">
                  <tr>
                    <th className={TH}>Nombre</th>
                    <th className={TH}>Empresa</th>
                    <th className={TH}>Status</th>
                    <th className={TH}>Score ICP</th>
                    <th className={TH}>Fecha creación</th>
                  </tr>
                </thead>
                <tbody>
                  {todos.map((p) => (
                    <tr key={p.id} className={ROW} onClick={() => setSelectedProspect(p)}>
                      <td className={TD}>
                        <p className="text-sm text-white font-medium">{prospectName(p)}</p>
                        {p.headline && (
                          <p className="text-xs text-white/30 mt-0.5">
                            {truncate(p.headline, 40)}
                          </p>
                        )}
                      </td>
                      <td className={TD}>
                        <p className="text-sm text-white/70">{p.company_name ?? '—'}</p>
                      </td>
                      <td className={TD}>
                        <ProspectStatusBadge status={p.status} />
                      </td>
                      <td className={TD}>
                        {p.icp_score !== null ? (
                          <span className={`text-sm font-bold ${icpColor(p.icp_score)}`}>
                            {p.icp_score}
                          </span>
                        ) : (
                          <span className="text-white/25">—</span>
                        )}
                      </td>
                      <td className={TD}>
                        <span className="text-xs text-white/40">
                          {formatShortDate(p.created_at)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsPrimitive.Content>

        {/* ── Tab: Eventos ── */}
        <TabsPrimitive.Content value="eventos">
          <EventsLogView />
        </TabsPrimitive.Content>
      </TabsPrimitive.Root>

      {/* Detail panel */}
      {selectedProspect && (
        <ProspectPanel
          prospect={selectedProspect}
          onClose={() => setSelectedProspect(null)}
          onProspectUpdated={handleProspectUpdated}
        />
      )}
    </div>
  )
}
