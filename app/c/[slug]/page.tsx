import { notFound } from 'next/navigation'
import { SignaturePad } from '@/components/contracts/signature-pad'
import { loadTemplate, renderContractMarkdown } from '@/lib/contracts/render'
import { marked } from 'marked'
import type { PublicContractData } from '@/types/contracts'

interface Props {
  params: Promise<{ slug: string }>
}

async function getContract(slug: string): Promise<PublicContractData | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey) return null

  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/get_contract_by_slug`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify({ p_slug: slug }),
    cache: 'no-store',
  })

  if (!res.ok) return null
  const data = await res.json()
  return data ?? null
}

export default async function PublicContractPage({ params }: Props) {
  const { slug } = await params
  const contract = await getContract(slug)

  if (!contract) notFound()

  const isSigned = ['signed_by_client', 'signed_fully'].includes(contract.status)
  const isSignable = ['sent', 'viewed'].includes(contract.status)

  const templateString = loadTemplate(contract.template_version ?? 'v1')
  const markdown = renderContractMarkdown(contract.data, templateString)
  const html = String(marked.parse(markdown))

  return (
    <>
      {/* Header — dark with orange, as per brief */}
      <header className="bg-gradient-to-r from-[#111111] to-[#1a1a1a] border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-white font-bold text-lg tracking-tight">Bralto</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/40">
            <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
            Documento legal — firma electrónica
          </div>
        </div>
      </header>

      {/* Contract document */}
      <main className="bg-gray-50 min-h-screen pb-72">
        <div className="max-w-4xl mx-auto px-4 py-10">
          {/* Status banner */}
          {isSigned && (
            <div className="mb-6 flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
              <span className="text-green-600 text-sm font-medium">
                ✓ Este contrato fue firmado. Gracias por tu confianza.
              </span>
            </div>
          )}

          {/* Document paper */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 md:p-16">
            <style>{`
              .contract-document, .contract-document * { color: #111827 !important; }
              .contract-document h1 { font-size: 1.125rem; font-weight: 700; text-align: center; margin-bottom: 2rem; letter-spacing: -0.01em; color: #111827 !important; }
              .contract-document h2 { font-size: 0.9rem; font-weight: 700; margin-top: 2rem; margin-bottom: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #111827 !important; }
              .contract-document h3 { font-size: 0.875rem; font-weight: 600; margin-top: 1.5rem; margin-bottom: 0.5rem; color: #111827 !important; }
              .contract-document p { font-size: 0.875rem; line-height: 1.75; color: #374151 !important; margin-bottom: 0.75rem; text-align: justify; }
              .contract-document strong { color: #111827 !important; font-weight: 700; }
              .contract-document ul { margin: 0.5rem 0 0.5rem 1.25rem; }
              .contract-document li { font-size: 0.875rem; line-height: 1.75; color: #374151 !important; margin-bottom: 0.25rem; }
              .contract-document hr { margin: 1.5rem 0; border-color: #e5e7eb; }
              .contract-document table { width: 100%; border-collapse: collapse; margin-top: 2rem; }
              .contract-document td { padding: 1rem; vertical-align: top; border-top: 1px solid #e5e7eb; font-size: 0.875rem; color: #374151 !important; }
              .contract-document blockquote { display: none; }
              .contract-document small { color: #6b7280 !important; }
            `}</style>
            <div
              className="contract-document font-serif"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Este contrato es confidencial. No lo comparta con terceros no autorizados.
          </p>
        </div>
      </main>

      {/* Sticky signature panel — only if signable */}
      {isSignable && <SignaturePad slug={slug} />}
    </>
  )
}
