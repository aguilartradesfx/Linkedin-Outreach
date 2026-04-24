'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Trash2, X } from 'lucide-react'

export function DeleteButton({ contractId }: { contractId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    const res = await fetch(`/api/contracts/${contractId}/delete`, { method: 'DELETE' })
    setLoading(false)
    if (res.ok) {
      router.push('/contratos')
      router.refresh()
    }
  }

  const modal = open ? createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={() => setOpen(false)}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative bg-[#111111] border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Eliminar contrato</h3>
          <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white/70"><X size={16} /></button>
        </div>
        <p className="text-sm text-white/60 mb-6">Esta acción no se puede deshacer. El contrato y todos sus eventos serán eliminados permanentemente.</p>
        <div className="flex gap-3 justify-end">
          <button onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-white/50 hover:text-white/80 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/90 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Trash2 size={13} />
            {loading ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  ) : null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm border border-red-500/30 text-red-400/70 hover:border-red-500/60 hover:text-red-400 rounded-lg transition-colors"
      >
        <Trash2 size={13} />
        Eliminar
      </button>
      {modal}
    </>
  )
}
