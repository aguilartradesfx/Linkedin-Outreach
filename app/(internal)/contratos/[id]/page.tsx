import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { loadTemplate, renderContractMarkdown } from '@/lib/contracts/render'
import { StatusBadge } from '@/components/contracts/status-badge'
import { CopyButton } from '@/components/contracts/copy-button'
import { SendButton } from '@/components/contracts/send-button'
import { BraltoSignButton } from '@/components/contracts/bralto-sign-button'
import { PrintButton } from '@/components/contracts/print-button'
import { DeleteButton } from '@/components/contracts/delete-button'
import { Copy, ExternalLink, Pencil } from 'lucide-react'
import type { ContractRow, ContractStatus } from '@/types/contracts'
import { marked } from 'marked'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ContratoDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: contract } = await supabase
    .from('contracts')
    .select('*')
    .eq('id', id)
    .single()

  if (!contract) notFound()

  const c = contract as ContractRow

  // Inject signature data into the contract data before rendering
  const dataWithFirma = {
    ...c.data,
    firma: {
      ...(c.data?.firma ?? {}),
      cliente_canvas: c.signature_client_data ?? null,
      cliente_timestamp: c.signature_client_timestamp ?? null,
      cliente_ip: c.signature_client_ip ?? null,
      bralto_canvas: c.signature_bralto_data ?? null,
      bralto_timestamp: c.signature_bralto_timestamp ?? null,
    },
  }

  const templateString = loadTemplate(c.template_version ?? 'v1')
  const markdown = renderContractMarkdown(dataWithFirma, templateString)
  const html = String(marked.parse(markdown))

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bralto.io'
  const publicUrl = `${siteUrl}/c/${c.slug}`
  const isShareable = ['sent', 'viewed', 'signed_by_client', 'signed_fully'].includes(c.status)

  return (
    <div className="min-h-screen" id="print-contract">
      {/* Top bar — offset below mobile nav (h-14) */}
      <div className="border-b border-white/[0.06] px-4 md:px-6 py-3 md:py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 sticky top-14 md:top-0 bg-[#0d0d0d]/95 backdrop-blur z-10 no-print">
        <div className="flex items-center gap-3">
          <Link href="/contratos" className="text-white/30 hover:text-white/60 text-sm transition-colors shrink-0">
            ← Contratos
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-sm text-white/70 truncate">
            {c.data?.cliente?.empresa_nombre ?? id}
          </span>
          <StatusBadge status={c.status as ContractStatus} />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isShareable && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.04] rounded-lg text-xs text-white/50 min-w-0">
              <span className="truncate max-w-[140px] md:max-w-[200px]">{publicUrl}</span>
              <CopyButton text={publicUrl} />
              <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-orange-400 transition-colors">
                <ExternalLink size={12} />
              </a>
            </div>
          )}

          <PrintButton contractId={id} />

          <Link
            href={`/contratos/nuevo?from=${id}`}
            className="flex items-center gap-2 px-3 py-1.5 text-sm border border-white/15 text-white/70 hover:border-white/30 hover:text-white rounded-lg transition-colors"
          >
            <Copy size={13} />
            Duplicar
          </Link>

          {['draft', 'sent'].includes(c.status) && (
            <Link
              href={`/contratos/${id}/editar`}
              className="flex items-center gap-2 px-3 py-1.5 text-sm border border-white/15 text-white/70 hover:border-white/30 hover:text-white rounded-lg transition-colors"
            >
              <Pencil size={13} />
              Editar
            </Link>
          )}

          {c.status === 'draft' && <SendButton contractId={id} />}
          {c.status === 'draft' && <DeleteButton contractId={id} />}
          {c.status === 'signed_by_client' && <BraltoSignButton contractId={id} />}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-10">
        {/* Metadata cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 no-print">
          <InfoCard label="Cliente" value={c.data?.cliente?.empresa_nombre ?? '—'} />
          <InfoCard label="Paquete" value={c.data?.proyecto?.nombre_paquete ?? '—'} />
          <InfoCard
            label="Monto inicial"
            value={c.data?.pago ? `$${c.data.pago.monto_inicial.toLocaleString('es-CR')}` : '—'}
          />
        </div>

        {/* Signature evidence */}
        {(c.status === 'signed_by_client' || c.status === 'signed_fully') && (
          <div className="mb-8 p-4 bg-green-500/10 border border-green-500/20 rounded-xl no-print">
            <p className="text-sm font-medium text-green-400 mb-2">Firmado por el cliente</p>
            <div className="grid grid-cols-2 gap-3 text-xs text-white/50">
              <div>
                <span className="text-white/30">Fecha:</span>{' '}
                {c.signature_client_timestamp
                  ? new Date(c.signature_client_timestamp).toLocaleString('es-CR')
                  : '—'}
              </div>
              <div>
                <span className="text-white/30">IP:</span> {c.signature_client_ip ?? '—'}
              </div>
              <div className="col-span-2 truncate">
                <span className="text-white/30">User-agent:</span> {c.signature_client_user_agent ?? '—'}
              </div>
            </div>
          </div>
        )}

        {c.status === 'signed_by_client' && (
          <div className="mb-8 p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl no-print">
            <p className="text-sm font-medium text-orange-400">
              Esperando tu firma — usá el botón &quot;Firmar como Bralto&quot; para completar el contrato.
            </p>
          </div>
        )}

        {/* Contract rendered */}
        <div className="bg-white rounded-2xl shadow-xl p-10">
          <div
            className="contract-document"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#111111] rounded-xl p-4 border border-white/[0.06]">
      <p className="text-xs text-white/30 mb-1">{label}</p>
      <p className="text-sm text-white font-medium truncate">{value}</p>
    </div>
  )
}
