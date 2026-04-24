import { createClient } from '@/lib/supabase/server'
import { ContractForm } from '@/components/contracts/contract-form'
import type { ClientRow, ContractRow } from '@/types/contracts'

export const metadata = { title: 'Nuevo contrato' }

interface Props {
  searchParams: Promise<{ from?: string }>
}

export default async function NuevoContratoPage({ searchParams }: Props) {
  const { from } = await searchParams
  const supabase = await createClient()

  const [{ data: clientsData }, { data: sourceContract }] = await Promise.all([
    supabase.from('clients').select('*').order('empresa_nombre'),
    from
      ? supabase.from('contracts').select('data, client_id').eq('id', from).single()
      : Promise.resolve({ data: null }),
  ])

  const prefill = sourceContract
    ? ({ data: sourceContract.data, client_id: sourceContract.client_id } as Partial<ContractRow>)
    : undefined

  const title = prefill ? 'Duplicar contrato' : 'Nuevo contrato'

  return (
    <div className="h-screen flex flex-col">
      <div className="border-b border-white/[0.06] px-6 py-4 flex items-center gap-3 shrink-0">
        <a href="/contratos" className="text-white/30 hover:text-white/60 text-sm transition-colors">
          ← Contratos
        </a>
        <span className="text-white/20">/</span>
        <span className="text-sm text-white/70">{title}</span>
      </div>
      <div className="flex-1 overflow-hidden">
        <ContractForm clients={(clientsData ?? []) as ClientRow[]} initialData={prefill} />
      </div>
    </div>
  )
}
