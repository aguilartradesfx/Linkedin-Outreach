'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { LinkedInProspect, LinkedInMessage, LinkedInEvent, ProspectStatus } from '@/types/linkedin'
import { PROSPECT_STATUSES } from '@/types/linkedin'
import { ProspectStatusBadge, STATUS_CONFIG } from './status-badge'
import { SignalList } from './signal-dots'
import {
  X,
  ExternalLink,
  Calendar,
  MapPin,
  Building2,
  User,
  MessageSquare,
  Activity,
  ChevronDown,
  Loader2,
} from 'lucide-react'

interface ProspectPanelProps {
  prospect: LinkedInProspect
  onClose: () => void
  onProspectUpdated: (updated: LinkedInProspect) => void
}

type PanelTab = 'info' | 'chat' | 'eventos'

function formatDate(dt: string | null) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('es-CR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ProspectPanel({ prospect, onClose, onProspectUpdated }: ProspectPanelProps) {
  const supabase = useRef(createClient()).current
  const [messages, setMessages] = useState<LinkedInMessage[]>([])
  const [events, setEvents] = useState<LinkedInEvent[]>([])
  const [activeTab, setActiveTab] = useState<PanelTab>('info')
  const [updating, setUpdating] = useState(false)
  const [currentStatus, setCurrentStatus] = useState<ProspectStatus>(prospect.status)
  const [loadingData, setLoadingData] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setCurrentStatus(prospect.status)
    setMessages([])
    setEvents([])
    setActiveTab('info')
    setLoadingData(true)

    async function loadData() {
      const [{ data: msgs }, { data: evts }] = await Promise.all([
        supabase
          .from('linkedin_agent_messages')
          .select('*')
          .eq('prospect_id', prospect.id)
          .order('turn_number', { ascending: true }),
        supabase
          .from('linkedin_agent_events')
          .select('*')
          .eq('prospect_id', prospect.id)
          .order('created_at', { ascending: false })
          .limit(50),
      ])
      if (msgs) setMessages(msgs as LinkedInMessage[])
      if (evts) setEvents(evts as LinkedInEvent[])
      setLoadingData(false)
    }

    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prospect.id])

  useEffect(() => {
    if (activeTab === 'chat') {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }, [activeTab, messages])

  async function handleStatusChange(newStatus: ProspectStatus) {
    if (newStatus === currentStatus || updating) return
    setUpdating(true)
    const { data, error } = await supabase
      .from('linkedin_agent_prospects')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', prospect.id)
      .select()
      .single()
    setUpdating(false)
    if (!error && data) {
      setCurrentStatus(newStatus)
      onProspectUpdated(data as LinkedInProspect)
    }
  }

  const prospectName =
    prospect.full_name ??
    (`${prospect.first_name ?? ''} ${prospect.last_name ?? ''}`.trim() || 'Sin nombre')

  const PANEL_TABS: { id: PanelTab; label: string }[] = [
    { id: 'info', label: 'Info' },
    { id: 'chat', label: `Conversación${messages.length > 0 ? ` (${messages.length})` : ''}` },
    { id: 'eventos', label: `Eventos${events.length > 0 ? ` (${events.length})` : ''}` },
  ]

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/50" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-[520px] bg-[#0f0f0f] border-l border-white/[0.08] flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-white/[0.08] flex-shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base font-semibold text-white truncate">{prospectName}</h2>
              {prospect.linkedin_url && (
                <a
                  href={prospect.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/30 hover:text-orange-400 transition-colors flex-shrink-0"
                  title="Ver perfil en LinkedIn"
                >
                  <ExternalLink size={13} />
                </a>
              )}
            </div>
            {prospect.headline && (
              <p className="text-xs text-white/50 truncate">{prospect.headline}</p>
            )}
            <div className="mt-2">
              <ProspectStatusBadge status={currentStatus} />
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white/70 transition-colors p-1 flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/[0.06] flex-shrink-0">
          {PANEL_TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors relative ${
                activeTab === id
                  ? 'text-orange-400'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              {label}
              {activeTab === id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loadingData && (
            <div className="flex items-center justify-center py-10 text-white/30 text-sm gap-2">
              <Loader2 size={14} className="animate-spin" />
              Cargando...
            </div>
          )}

          {!loadingData && activeTab === 'info' && (
            <div className="p-5 space-y-5">
              {/* Contact info */}
              <div className="space-y-2.5">
                {prospect.company_name && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <Building2 size={14} className="text-white/30 flex-shrink-0" />
                    <span className="text-white/80">{prospect.company_name}</span>
                    {prospect.company_size && (
                      <span className="text-white/30 text-xs">({prospect.company_size})</span>
                    )}
                  </div>
                )}
                {prospect.position && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <User size={14} className="text-white/30 flex-shrink-0" />
                    <span className="text-white/70">{prospect.position}</span>
                  </div>
                )}
                {(prospect.location || prospect.country) && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <MapPin size={14} className="text-white/30 flex-shrink-0" />
                    <span className="text-white/60">
                      {[prospect.location, prospect.country].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}
                {prospect.appointment_datetime && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <Calendar size={14} className="text-emerald-400 flex-shrink-0" />
                    <span className="text-emerald-300 font-medium">
                      {formatDate(prospect.appointment_datetime)}
                    </span>
                  </div>
                )}
              </div>

              {/* ICP Score */}
              {prospect.icp_score !== null && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-white/40">Score ICP</span>
                    <span
                      className={`text-sm font-bold ${
                        prospect.icp_score >= 70
                          ? 'text-emerald-400'
                          : prospect.icp_score >= 40
                          ? 'text-amber-400'
                          : 'text-red-400'
                      }`}
                    >
                      {prospect.icp_score}/100
                    </span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        prospect.icp_score >= 70
                          ? 'bg-emerald-400'
                          : prospect.icp_score >= 40
                          ? 'bg-amber-400'
                          : 'bg-red-400'
                      }`}
                      style={{ width: `${prospect.icp_score}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Signals */}
              <div>
                <p className="text-xs text-white/40 mb-2.5">Señales de calificación</p>
                <SignalList
                  isDecisionMaker={prospect.is_decision_maker}
                  hasBudgetSignal={prospect.has_budget_signal}
                  mentionedProblem={prospect.mentioned_problem}
                  timingUrgency={prospect.timing_urgency}
                />
              </div>

              {/* Qualification / disqualification reasons */}
              {prospect.qualification_reason && (
                <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-lg p-3">
                  <p className="text-xs text-emerald-400 font-medium mb-1">Razón de calificación</p>
                  <p className="text-xs text-white/70 leading-relaxed">{prospect.qualification_reason}</p>
                </div>
              )}
              {prospect.disqualification_reason && (
                <div className="bg-red-500/5 border border-red-500/15 rounded-lg p-3">
                  <p className="text-xs text-red-400 font-medium mb-1">Razón de descalificación</p>
                  <p className="text-xs text-white/70 leading-relaxed">{prospect.disqualification_reason}</p>
                </div>
              )}

              {/* Trigger signals */}
              {prospect.trigger_signals && prospect.trigger_signals.length > 0 && (
                <div>
                  <p className="text-xs text-white/40 mb-2">Trigger signals</p>
                  <div className="flex flex-wrap gap-1.5">
                    {prospect.trigger_signals.map((s, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-orange-500/10 text-orange-300/70 text-xs rounded"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact details */}
              {(prospect.email || prospect.phone) && (
                <div className="space-y-1.5">
                  {prospect.email && (
                    <div className="text-xs">
                      <span className="text-white/30">Email: </span>
                      <span className="text-white/70">{prospect.email}</span>
                    </div>
                  )}
                  {prospect.phone && (
                    <div className="text-xs">
                      <span className="text-white/30">Teléfono: </span>
                      <span className="text-white/70">{prospect.phone}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Timestamps */}
              <div className="text-xs text-white/25 space-y-1 pt-2 border-t border-white/[0.06]">
                <div>Creado: {formatDate(prospect.created_at)}</div>
                {prospect.last_interaction_at && (
                  <div>Última interacción: {formatDate(prospect.last_interaction_at)}</div>
                )}
              </div>
            </div>
          )}

          {!loadingData && activeTab === 'chat' && (
            <div className="p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="py-12 text-center text-white/30 text-sm">
                  <MessageSquare size={24} className="mx-auto mb-2 opacity-30" />
                  Sin mensajes registrados
                </div>
              ) : (
                messages.map((msg) => {
                  if (msg.role === 'system') {
                    return (
                      <div key={msg.id} className="flex justify-center">
                        <span className="text-xs text-white/25 bg-white/5 px-3 py-1 rounded-full max-w-xs text-center">
                          {msg.content}
                        </span>
                      </div>
                    )
                  }
                  const isAgent = msg.role === 'agent'
                  return (
                    <div key={msg.id} className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                          isAgent
                            ? 'bg-orange-500/15 border border-orange-500/20 rounded-tr-sm'
                            : 'bg-white/[0.06] border border-white/[0.08] rounded-tl-sm'
                        }`}
                      >
                        {!isAgent && (
                          <p className="text-[10px] text-white/40 mb-1 font-medium">Prospecto</p>
                        )}
                        <p className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap">
                          {msg.content}
                        </p>
                        {msg.turn_number !== null && (
                          <p className="text-[10px] text-white/25 mt-1 text-right">
                            Turno {msg.turn_number}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {!loadingData && activeTab === 'eventos' && (
            <div className="p-4 space-y-2">
              {events.length === 0 ? (
                <div className="py-12 text-center text-white/30 text-sm">
                  <Activity size={24} className="mx-auto mb-2 opacity-30" />
                  Sin eventos registrados
                </div>
              ) : (
                events.map((event) => (
                  <div
                    key={event.id}
                    className={`p-3 rounded-lg border text-xs ${
                      event.error_message
                        ? 'border-red-500/20 bg-red-500/5'
                        : 'border-white/[0.06] bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <span
                        className={`font-medium truncate ${
                          event.error_message ? 'text-red-400' : 'text-white/80'
                        }`}
                      >
                        {event.event_type}
                      </span>
                      <span className="text-white/25 flex-shrink-0">
                        {new Date(event.created_at).toLocaleString('es-CR')}
                      </span>
                    </div>
                    {event.error_message && (
                      <p className="text-red-300/60 mt-1">{event.error_message}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Status Update Footer */}
        <div className="p-4 border-t border-white/[0.08] space-y-2.5 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <select
                value={currentStatus}
                onChange={(e) => handleStatusChange(e.target.value as ProspectStatus)}
                disabled={updating}
                className="w-full appearance-none bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-orange-500/60 disabled:opacity-50 pr-8"
              >
                {PROSPECT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_CONFIG[s].label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none"
              />
            </div>
            {updating && <Loader2 size={14} className="animate-spin text-white/40 flex-shrink-0" />}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleStatusChange('cerrado_ganado')}
              disabled={updating || currentStatus === 'cerrado_ganado'}
              className="flex-1 py-2 text-xs font-medium bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ✓ Cerrado ganado
            </button>
            <button
              onClick={() => handleStatusChange('cerrado_perdido')}
              disabled={updating || currentStatus === 'cerrado_perdido'}
              className="flex-1 py-2 text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/15 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              × Cerrado perdido
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
