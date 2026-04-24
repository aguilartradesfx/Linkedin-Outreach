import { ProposalForm } from '@/components/proposals/proposal-form'

export const metadata = { title: 'Nueva solicitud de propuesta' }

export default function NuevaSolicitudPage() {
  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-white">Nueva solicitud</h1>
        <p className="text-sm text-white/40 mt-0.5">
          Llena este formulario para registrar un cliente potencial. Alejandro lo revisará para preparar la propuesta.
        </p>
      </div>
      <ProposalForm />
    </div>
  )
}
