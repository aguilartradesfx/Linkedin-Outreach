'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'

export function SendButton({ contractId }: { contractId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSend() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/contracts/${contractId}/send`, { method: 'POST' })
      if (res.ok) {
        window.location.reload()
      } else {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? `Error ${res.status}`)
      }
    } catch {
      setError('Error de red')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleSend}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-orange-500 hover:bg-orange-400 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
      >
        <Send size={13} />
        {loading ? 'Enviando...' : 'Firmar y enviar'}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
