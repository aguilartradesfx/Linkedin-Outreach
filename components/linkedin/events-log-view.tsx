'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { LinkedInEvent } from '@/types/linkedin'
import { AlertCircle, RefreshCw, Loader2 } from 'lucide-react'

const PAGE_SIZE = 20

export function EventsLogView() {
  const supabase = useRef(createClient()).current
  const [events, setEvents] = useState<LinkedInEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [filterType, setFilterType] = useState('')
  const [eventTypes, setEventTypes] = useState<string[]>([])
  const [refreshKey, setRefreshKey] = useState(0)

  // Load event types once on mount
  useEffect(() => {
    supabase
      .from('linkedin_agent_events')
      .select('event_type')
      .then(({ data }) => {
        if (data) {
          const types = [
            ...new Set(data.map((e: { event_type: string }) => e.event_type)),
          ].sort() as string[]
          setEventTypes(types)
        }
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load events when page/filter/refreshKey changes
  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q: any = supabase
        .from('linkedin_agent_events')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      if (filterType) q = q.eq('event_type', filterType)

      const { data, count } = await q
      if (!cancelled) {
        if (data) setEvents(data as LinkedInEvent[])
        setTotal(count ?? 0)
        setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterType, refreshKey])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="p-4 md:p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-base font-semibold text-white">Log de eventos</h2>
          <p className="text-xs text-white/40 mt-0.5">{total} eventos totales</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value)
              setPage(0)
            }}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white/70 focus:outline-none focus:border-orange-500/60"
          >
            <option value="">Todos los tipos</option>
            {eventTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="p-1.5 text-white/30 hover:text-white/70 transition-colors border border-white/10 rounded-lg hover:border-white/20"
            title="Refrescar"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.08] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-white/30 text-sm">
            <Loader2 size={14} className="animate-spin" />
            Cargando...
          </div>
        ) : events.length === 0 ? (
          <div className="py-12 text-center text-white/30 text-sm">Sin eventos</div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {events.map((event) => (
              <div
                key={event.id}
                className={`px-4 py-3 transition-colors ${
                  event.error_message ? 'bg-red-500/[0.04]' : 'hover:bg-white/[0.02]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {event.error_message && (
                      <AlertCircle size={13} className="text-red-400 flex-shrink-0 mt-0.5" />
                    )}
                    <span
                      className={`text-sm font-medium truncate ${
                        event.error_message ? 'text-red-400' : 'text-white/80'
                      }`}
                    >
                      {event.event_type}
                    </span>
                    {event.prospect_id && (
                      <span className="text-xs text-white/25 flex-shrink-0">
                        #{event.prospect_id.slice(0, 8)}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-white/25 flex-shrink-0">
                    {new Date(event.created_at).toLocaleString('es-CR')}
                  </span>
                </div>
                {event.error_message && (
                  <p className="text-xs text-red-300/60 mt-1 ml-5">{event.error_message}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-white/30">
            Página {page + 1} de {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 text-xs bg-white/5 text-white/50 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 text-xs bg-white/5 text-white/50 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
