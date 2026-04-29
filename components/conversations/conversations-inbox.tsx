'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { LinkedInProspect, LinkedInMessage } from '@/types/linkedin'
import { ProspectStatusBadge } from '@/components/linkedin/status-badge'
import {
  MessageSquare, ExternalLink, Search, Loader2, RefreshCw,
  Building2, User, Bot,
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

function formatDateTime(dt: string) {
  return new Date(dt).toLocaleString('es-CR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

// ─── Chat view ────────────────────────────────────────────────────────────────

function ChatView({ prospect }: { prospect: LinkedInProspect }) {
  const [messages, setMessages] = useState<LinkedInMessage[]>([])
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoading(true)
    setMessages([])

    fetch(`/api/messages?prospect_id=${prospect.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setMessages(data as LinkedInMessage[])
        setLoading(false)
      })
      .catch(() => setLoading(false))

    const channel = supabase
      .channel(`chat-${prospect.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'linkedin_agent_messages', filter: `prospect_id=eq.${prospect.id}` },
        (payload) => setMessages((prev) => [...prev, payload.new as LinkedInMessage]),
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [prospect.id])

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }, [messages])

  const name = prospectName(prospect)

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="px-5 py-4 border-b border-white/[0.08] flex-shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-orange-400">{getInitials(name)}</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-semibold text-white truncate">{name}</h3>
                {prospect.linkedin_url && (
                  <a
                    href={prospect.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/20 hover:text-orange-400 transition-colors flex-shrink-0"
                  >
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
              {prospect.headline && (
                <p className="text-xs text-white/40 truncate">{prospect.headline}</p>
              )}
            </div>
          </div>
          <ProspectStatusBadge status={prospect.status} />
        </div>

        <div className="flex items-center gap-4 mt-3 text-xs text-white/30">
          {prospect.company_name && (
            <span className="flex items-center gap-1"><Building2 size={10} />{prospect.company_name}</span>
          )}
          {prospect.position && (
            <span className="flex items-center gap-1"><User size={10} />{prospect.position}</span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-white/30 text-sm gap-2">
            <Loader2 size={14} className="animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MessageSquare size={24} className="text-white/10 mb-2" />
            <p className="text-sm text-white/30">Sin mensajes registrados</p>
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.role === 'system') {
              return (
                <div key={msg.id} className="flex justify-center">
                  <span className="text-[10px] text-white/25 bg-white/5 px-3 py-1 rounded-full max-w-xs text-center">
                    {msg.content}
                  </span>
                </div>
              )
            }
            const isAgent = msg.role === 'agent'
            return (
              <div key={msg.id} className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}>
                {!isAgent && (
                  <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mr-2 flex-shrink-0 self-end mb-1">
                    <span className="text-[9px] text-white/40">{getInitials(name)}</span>
                  </div>
                )}
                <div>
                  {isAgent && (
                    <div className="flex items-center gap-1 justify-end mb-1">
                      <Bot size={10} className="text-orange-400/60" />
                      <span className="text-[10px] text-orange-400/60">Agente</span>
                    </div>
                  )}
                  {!isAgent && (
                    <p className="text-[10px] text-white/30 mb-1 ml-0.5">{name}</p>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                      isAgent
                        ? 'bg-orange-500/15 border border-orange-500/20 rounded-tr-sm'
                        : 'bg-white/[0.06] border border-white/[0.08] rounded-tl-sm'
                    }`}
                  >
                    <p className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </p>
                    <p className="text-[10px] text-white/20 mt-1 text-right">
                      {formatDateTime(msg.created_at)}
                    </p>
                  </div>
                </div>
                {isAgent && (
                  <div className="w-6 h-6 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center ml-2 flex-shrink-0 self-end mb-1">
                    <Bot size={10} className="text-orange-400" />
                  </div>
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

    // Build map: prospect_id → last message (first seen = latest, since sorted DESC)
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

    const channel = supabase
      .channel('inbox-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'linkedin_agent_messages' }, fetchInbox)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'linkedin_agent_prospects' }, fetchInbox)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') console.log('[realtime] inbox: conectado')
        if (status === 'CHANNEL_ERROR') console.error('[realtime] inbox: error de canal')
      })

    return () => { supabase.removeChannel(channel) }
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
      {/* Sidebar list */}
      <div className={`w-full md:w-80 lg:w-96 flex-shrink-0 border-r border-white/[0.08] flex flex-col ${selected ? 'hidden md:flex' : 'flex'}`}>
        {/* Header */}
        <div className="px-4 py-4 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-base font-semibold text-white">Conversaciones</h1>
            <button onClick={fetchInbox} className="text-white/30 hover:text-white/60 transition-colors p-1">
              <RefreshCw size={13} />
            </button>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar prospecto..."
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-orange-500/60"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-white/30 text-sm gap-2">
              <Loader2 size={14} className="animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <MessageSquare size={24} className="text-white/10 mb-2" />
              <p className="text-sm text-white/30">
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
                  className={`w-full text-left px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors ${isSelected ? 'bg-orange-500/5 border-l-2 border-l-orange-500' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-500/10 border border-orange-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[10px] font-semibold text-orange-400">{getInitials(name)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p className="text-sm font-medium text-white truncate">{name}</p>
                        <span className="text-[10px] text-white/25 flex-shrink-0">{relativeTime(item.lastMessageAt)}</span>
                      </div>
                      {item.prospect.company_name && (
                        <p className="text-xs text-white/35 mb-1 truncate">{item.prospect.company_name}</p>
                      )}
                      <p className={`text-xs truncate ${item.lastMessageRole === 'agent' ? 'text-orange-400/60' : 'text-white/40'}`}>
                        {item.lastMessageRole === 'agent' ? '🤖 ' : ''}{item.lastMessage}
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
          <>
            {/* Back button on mobile */}
            <div className="md:hidden px-4 py-2 border-b border-white/[0.06] flex-shrink-0">
              <button onClick={() => setSelected(null)} className="text-xs text-orange-400 hover:text-orange-300 transition-colors">
                ← Volver
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ChatView prospect={selected} />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <MessageSquare size={32} className="text-white/10 mb-3" />
            <p className="text-sm text-white/30">Selecciona una conversación para verla</p>
          </div>
        )}
      </div>
    </div>
  )
}
