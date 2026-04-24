import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ContractForm } from '@/components/contracts/contract-form'
import type { ClientRow, ContractRow } from '@/types/contracts'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditarContratoPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: contract }, { data: clientsData }] = await Promise.all([
    supabase.from('contracts').select('*').eq('id', id).single(),
    supabase.from('clients').select('*').order('empresa_nombre'),
  ])

  if (!contract) notFound()

  const c = contract as ContractRow
  if (!['draft', 'sent'].includes(c.status)) {
    return (
      <div className="p-8">
        <p className="text-white/50">Este contrato no puede editarse en su estado actual.</p>
        <a href={`/contratos/${id}`} className="text-orange-400 text-sm mt-2 inline-block">
          ← Volver al contrato
        </a>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="border-b border-white/[0.06] px-6 py-4 flex items-center gap-3 shrink-0">
        <a href={`/contratos/${id}`} className="text-white/30 hover:text-white/60 text-sm transition-colors">
          ← {c.data?.cliente?.empresa_nombre ?? 'Contrato'}
        </a>
        <span className="text-white/20">/</span>
        <span className="text-sm text-white/70">Editar</span>
      </div>
      <div className="flex-1 overflow-hidden">
        <ContractForm clients={(clientsData ?? []) as ClientRow[]} initialData={c} />
      </div>
    </div>
  )
}
