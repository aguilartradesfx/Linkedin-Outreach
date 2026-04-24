import { CheckCircle } from 'lucide-react'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function FirmadoPage({ params }: Props) {
  const { slug } = await params

  return (
    <>
      <header className="bg-gradient-to-r from-[#111111] to-[#1a1a1a] border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <span className="text-white font-bold text-lg tracking-tight">Bralto</span>
        </div>
      </header>

      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={32} className="text-green-600" />
          </div>

          <h1 className="text-2xl font-semibold text-gray-900 mb-3">
            Contrato firmado exitosamente
          </h1>

          <p className="text-gray-500 text-sm leading-relaxed mb-8">
            Hemos registrado tu firma electrónica junto con el timestamp, IP y tu aceptación
            explícita de los términos. Recibirás una copia en tu correo electrónico.
          </p>

          <div className="p-4 bg-white rounded-xl border border-gray-200 text-left space-y-2 mb-8">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Evidencia registrada</p>
            <div className="space-y-1 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                Firma visual en canvas
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                Timestamp ISO con zona horaria
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                Dirección IP del firmante
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                Aceptación explícita de términos
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-400">
            Referencia de contrato:{' '}
            <span className="font-mono text-gray-500">{slug}</span>
          </p>

          <p className="text-xs text-gray-400 mt-4">
            ¿Preguntas? Escribinos a{' '}
            <a href="mailto:cs@bralto.io" className="text-gray-600 hover:underline">
              cs@bralto.io
            </a>
          </p>
        </div>
      </main>
    </>
  )
}
