'use client'

import { useRef, useState, useEffect } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { useRouter } from 'next/navigation'
import { RotateCcw, CheckCircle, AlertCircle } from 'lucide-react'

interface Props {
  slug: string
}

export function SignaturePad({ slug }: Props) {
  const router = useRouter()
  const sigRef = useRef<SignatureCanvas>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [accepted, setAccepted] = useState(false)
  const [isEmpty, setIsEmpty] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [canvasWidth, setCanvasWidth] = useState(500)

  // Mark view event when component mounts + set canvas width to container
  useEffect(() => {
    fetch(`/api/c/${slug}/view`, { method: 'POST' }).catch(() => null)
    if (containerRef.current) {
      setCanvasWidth(containerRef.current.offsetWidth - 4)
    }
  }, [slug])

  function handleClear() {
    sigRef.current?.clear()
    setIsEmpty(true)
  }

  function handleDrawEnd() {
    setIsEmpty(sigRef.current?.isEmpty() ?? true)
  }

  async function handleSign() {
    if (!accepted || isEmpty) return

    const signatureData = sigRef.current?.toDataURL('image/png')
    if (!signatureData) return

    setLoading(true)
    setError(null)

    const res = await fetch(`/api/c/${slug}/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signature: signatureData,
        accepted_terms: true,
      }),
    })

    setLoading(false)

    if (res.ok) {
      const body = await res.json()
      if (body.payment_link) {
        window.location.href = body.payment_link
      } else {
        router.push(`/listo?c=${slug}`)
      }
    } else {
      const data = await res.json()
      setError(data.error ?? 'Error al procesar la firma. Por favor intentá nuevamente.')
    }
  }

  const canSign = accepted && !isEmpty

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl z-50">
      <div className="max-w-4xl mx-auto px-6 py-5 space-y-4">
        {/* Terms checkbox */}
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500 focus:ring-offset-0 cursor-pointer shrink-0"
          />
          <span className="text-sm text-gray-600 leading-relaxed">
            He leído y acepto todos los términos y condiciones de este contrato, incluyendo que mi
            firma electrónica tiene plena validez legal conforme a la Ley 8454 de Costa Rica.
          </span>
        </label>

        {/* Signature canvas area */}
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-400 font-medium">Tu firma</span>
              <button
                type="button"
                onClick={handleClear}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                <RotateCcw size={11} />
                Limpiar
              </button>
            </div>
            <div
              ref={containerRef}
              className={`border-2 rounded-lg overflow-hidden transition-colors ${
                isEmpty ? 'border-gray-200' : 'border-gray-400'
              }`}
            >
              <SignatureCanvas
                ref={sigRef}
                onEnd={handleDrawEnd}
                penColor="#1a1a1a"
                canvasProps={{
                  width: canvasWidth,
                  height: 120,
                  className: 'w-full touch-none bg-gray-50',
                  style: { display: 'block' },
                }}
              />
            </div>
            {isEmpty && (
              <p className="text-xs text-gray-400 mt-1">Dibujá tu firma en el recuadro</p>
            )}
          </div>

          <button
            type="button"
            disabled={!canSign || loading}
            onClick={handleSign}
            className={`shrink-0 flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all ${
              canSign && !loading
                ? 'bg-gray-900 hover:bg-gray-800 text-white shadow-lg'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <CheckCircle size={16} />
            {loading ? 'Procesando...' : 'Firmar y enviar'}
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}
