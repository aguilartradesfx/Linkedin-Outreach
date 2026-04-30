'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { LinkedInProspect, LinkedInMessage } from '@/types/linkedin'
import { ProspectStatusBadge } from '@/components/linkedin/status-badge'
import {
  MessageSquare, ExternalLink, Search, Loader2, RefreshCw,
  Building2, User, Bot, BotOff, ChevronLeft,
} from 'lucide-react'

const supabase = createClient()

function getInitials(name: string | null | undefined) {
  if (!name) return '?'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function prospectName(p: LinkedInProspect) {
  return p.full_name ?? (`${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Sin nombre')
}

function relativeTime(dt: string) {
  const diff = Date.now() - new Date(dt).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'ahora'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

function formatTime(dt: string) {
  return new Date(dt).toLocaleString('es-CR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

// ─── Chat view ────────────────────────────────────────────────────────────────

function ChatView({
  prospect,
  onProspectUpdated,
  onBack,
}: {
  prospect: LinkedInProspect
  onProspectUpdated: (p: LinkedInProspect) => void
  onBack: () => void
}) {
  const [messages, setMessages] = useState<LinkedInMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [togglingAgent, setTogglingAgent] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const agentEnabled = prospect.agent_enabled !== false

  async function toggleAgent() {
    setTogglingAgent(true)
    try {
      const res = await fetch('/api/prospects', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: prospect.id, agent_enabled: !agentEnabled }),
      })
      if (res.ok) {
        const updated = await res.json()
        onProspectUpdated(updated as LinkedInProspect)
      }
    } finally {
      setTogglingAgent(false)
    }
  }

  const loadMessages = useCallback(() => {
    return fetch(`/api/messages?prospect_id=${prospect.id}`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setMessages(data as LinkedInMessage[]) })
      .catch(() => null)
  }, [prospect.id])

  useEffect(() => {
    setLoading(true)
    setMessages([])

    loadMessages().finally(() => setLoading(false))

    // Polling cada 5s — funciona aunque Supabase Realtime no esté habilitado en el dashboard
    const poll = setInterval(loadMessages, 5000)

    // Realtime como complemento (si está habilitado, los cambios llegan antes del poll)
    const channel = supabase
      .channel(`chat-${prospect.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'linkedin_agent_messages', filter: `prospect_id=eq.${prospect.id}` },
        (payload) => setMessages((prev) => {
          const incoming = payload.new as LinkedInMessage
          if (prev.some((m) => m.id === incoming.id)) return prev
          return [...prev, incoming]
        }),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'linkedin_agent_prospects', filter: `id=eq.${prospect.id}` },
        (payload) => onProspectUpdated(payload.new as LinkedInProspect),
      )
      .subscribe()

    return () => {
      clearInterval(poll)
      supabase.removeChannel(channel)
    }
  }, [prospect.id, loadMessages])

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }, [messages])

  const name = prospectName(prospect)

  const lastAgentIdx = messages.reduce((acc, m, i) => m.role === 'agent' ? i : acc, -1)
  const isRead = prospect.last_read_at != null && lastAgentIdx >= 0 &&
    new Date(prospect.last_read_at) >= new Date(messages[lastAgentIdx]?.created_at ?? 0)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.07] flex-shrink-0 bg-[#111]">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="md:hidden text-white/40 hover:text-white/70 transition-colors p-0.5 -ml-1"
          >
            <ChevronLeft size={18} />
          </button>

          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-white/[0.08] border border-white/[0.12] flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-semibold text-white/70">{getInitials(name)}</span>
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-semibold text-white leading-tight truncate">{name}</h3>
              {prospect.linkedin_url && (
                <a
                  href={prospect.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/20 hover:text-white/50 transition-colors flex-shrink-0"
                >
                  <ExternalLink size={10} />
                </a>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {prospect.company_name && (
                <span className="flex items-center gap-0.5 text-[10px] text-white/35">
                  <Building2 size={9} />{prospect.company_name}
                </span>
              )}
              {prospect.position && !prospect.company_name && (
                <span className="flex items-center gap-0.5 text-[10px] text-white/35">
                  <User size={9} />{prospect.position}
                </span>
              )}
              {prospect.headline && !prospect.company_name && !prospect.position && (
                <span className="text-[10px] text-white/35 truncate">{prospect.headline}</span>
              )}
            </div>
          </div>

          {/* Status + agent toggle */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <ProspectStatusBadge status={prospect.status} />
            <button
              onClick={toggleAgent}
              disabled={togglingAgent}
              title={agentEnabled ? 'Agente activo — click para pausar' : 'Agente pausado — click para activar'}
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium border transition-all ${
                agentEnabled
                  ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400 hover:bg-red-500/10 hover:border-red-500/25 hover:text-red-400'
                  : 'bg-red-500/10 border-red-500/25 text-red-400 hover:bg-emerald-500/10 hover:border-emerald-500/25 hover:text-emerald-400'
              }`}
            >
              {togglingAgent ? (
                <Loader2 size={9} className="animate-spin" />
              ) : agentEnabled ? (
                <Bot size={9} />
              ) : (
                <BotOff size={9} />
              )}
              {agentEnabled ? 'Agente activo' : 'Pausado'}
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-white/30">
            <Loader2 size={14} className="animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MessageSquare size={22} className="text-white/10 mb-2" />
            <p className="text-sm text-white/25">Sin mensajes registrados</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            if (msg.role === 'system') {
              return (
                <div key={msg.id} className="flex justify-center py-2">
                  <span className="text-[10px] text-white/20 bg-white/[0.04] px-3 py-1 rounded-full">
                    {msg.content}
                  </span>
                </div>
              )
            }

            const isAgent = msg.role === 'agent'
            const showRead = isAgent && idx === lastAgentIdx && isRead

            return (
              <div key={msg.id} className={`flex flex-col ${isAgent ? 'items-end' : 'items-start'}`}>
                <div className={`flex items-end gap-2 max-w-[72%] ${isAgent ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Avatar */}
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mb-0.5 bg-white/[0.06] border border-white/[0.09]">
                    {isAgent
                      ? <Bot size={10} className="text-white/40" />
                      : <span className="text-[9px] text-white/40">{getInitials(name)}</span>
                    }
                  </div>

                  {/* Bubble */}
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 ${
                      isAgent
                        ? 'bg-white/[0.10] rounded-br-sm'
                        : 'bg-white/[0.05] rounded-bl-sm'
                    }`}
                  >
                    <p className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </p>
                    <p className={`text-[10px] mt-1 ${isAgent ? 'text-white/25 text-right' : 'text-white/20'}`}>
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </div>

                {showRead && (
                  <span className="text-[10px] text-white/25 mr-8 mt-0.5">Leído</span>
                )}
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

// ─── Inbox list item ──────────────────────────────────────────────────────────

interface InboxItem {
  prospect: LinkedInProspect
  lastMessage: string
  lastMessageRole: 'prospect' | 'agent' | 'system'
  lastMessageAt: string
  unreadCount: number
}

// ─── Main component ────────────────────────────────────────────────────────────

export function ConversationsInbox() {
  const [items, setItems] = useState<InboxItem[]>([])
  const [selected, setSelected] = useState<LinkedInProspect | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchInbox = useCallback(async () => {
    try {
      const [prospectsRes, messagesRes] = await Promise.all([
        fetch('/api/prospects'),
        fetch('/api/messages?limit=500'),
      ])

      if (!prospectsRes.ok || !messagesRes.ok) { setLoading(false); return }

      const prospects: LinkedInProspect[] = await prospectsRes.json()
      const messages: Array<{ prospect_id: string; content: string; role: string; created_at: string }> = await messagesRes.json()

      if (!Array.isArray(prospects) || !Array.isArray(messages)) { setLoading(false); return }

      const lastMsgMap = new Map<string, { content: string; role: string; created_at: string }>()
      for (const m of messages) {
        const pid = m.prospect_id as string
        if (!lastMsgMap.has(pid)) {
          lastMsgMap.set(pid, { content: m.content as string, role: m.role as string, created_at: m.created_at as string })
        }
      }

      const inbox: InboxItem[] = (prospects as LinkedInProspect[])
        .filter((p) => lastMsgMap.has(p.id))
        .map((p) => {
          const msg = lastMsgMap.get(p.id)!
          return {
            prospect: p,
            lastMessage: msg.content,
            lastMessageRole: msg.role as 'prospect' | 'agent' | 'system',
            lastMessageAt: msg.created_at,
            unreadCount: 0,
          }
        })
        .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())

      setItems(inbox)
    } catch (err) {
      console.error('[inbox] Error al cargar:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInbox()

    // Polling cada 10s para el panel de lista (garantiza actualización aunque Realtime no esté activo)
    const poll = setInterval(fetchInbox, 10000)

    const channel = supabase
      .channel('inbox-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'linkedin_agent_messages' }, fetchInbox)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'linkedin_agent_prospects' }, fetchInbox)
      .subscribe()

    return () => {
      clearInterval(poll)
      supabase.removeChannel(channel)
    }
  }, [fetchInbox])

  const filtered = search
    ? items.filter((item) => {
        const q = search.toLowerCase()
        const name = prospectName(item.prospect).toLowerCase()
        return name.includes(q) || (item.prospect.company_name ?? '').toLowerCase().includes(q)
      })
    : items

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <div className={`w-full md:w-72 lg:w-80 flex-shrink-0 border-r border-white/[0.07] flex flex-col bg-[#0f0f0f] ${selected ? 'hidden md:flex' : 'flex'}`}>
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-sm font-semibold text-white/90">Conversaciones</h1>
            <button onClick={fetchInbox} className="text-white/25 hover:text-white/55 transition-colors p-1 rounded">
              <RefreshCw size={12} />
            </button>
          </div>
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar prospecto..."
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-white/25 focus:outline-none focus:border-white/25 transition-colors"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-white/25">
              <Loader2 size={14} className="animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <MessageSquare size={22} className="text-white/10 mb-2" />
              <p className="text-xs text-white/25">
                {items.length === 0 ? 'Sin conversaciones aún' : 'Sin resultados'}
              </p>
            </div>
          ) : (
            filtered.map((item) => {
              const name = prospectName(item.prospect)
              const isSelected = selected?.id === item.prospect.id
              return (
                <button
                  key={item.prospect.id}
                  onClick={() => setSelected(item.prospect)}
                  className={`w-full text-left px-4 py-3 border-b border-white/[0.04] transition-colors ${
                    isSelected
                      ? 'bg-white/[0.06] border-l-2 border-l-white/40'
                      : 'hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-white/[0.07] border border-white/[0.10] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[10px] font-semibold text-white/60">{getInitials(name)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p className="text-xs font-medium text-white/90 truncate">{name}</p>
                        <span className="text-[10px] text-white/25 flex-shrink-0">{relativeTime(item.lastMessageAt)}</span>
                      </div>
                      {item.prospect.company_name && (
                        <p className="text-[10px] text-white/30 mb-0.5 truncate">{item.prospect.company_name}</p>
                      )}
                      <p className="text-[11px] text-white/35 truncate">
                        {item.lastMessageRole === 'agent' ? 'Tú: ' : ''}{item.lastMessage}
                      </p>
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Chat panel */}
      <div className={`flex-1 bg-[#0d0d0d] flex flex-col ${selected ? 'flex' : 'hidden md:flex'}`}>
        {selected ? (
          <div className="flex-1 overflow-hidden">
            <ChatView
              prospect={selected}
              onBack={() => setSelected(null)}
              onProspectUpdated={(updated) => {
                setSelected(updated)
                setItems((prev) =>
                  prev.map((item) =>
                    item.prospect.id === updated.id ? { ...item, prospect: updated } : item
                  )
                )
              }}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <MessageSquare size={28} className="text-white/[0.08] mb-3" />
            <p className="text-sm text-white/20">Selecciona una conversación</p>
          </div>
        )}
      </div>
    </div>
  )
}
