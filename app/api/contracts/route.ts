import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { contractDataSchema } from '@/lib/contracts/schema'
import { generateContractSlug } from '@/lib/contracts/slug'
import { getBraltoSignatureDataUrl } from '@/lib/contracts/bralto-signature'

export async function POST(req: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { data: formData, client_id, draft } = body as { data: unknown; client_id?: string; draft?: boolean }

  let dataToSave: unknown
  if (draft) {
    dataToSave = formData
  } else {
    const parsed = contractDataSchema.safeParse(formData)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }
    dataToSave = parsed.data
  }

  const empresaNombre = (dataToSave as { cliente?: { empresa_nombre?: string } })?.cliente?.empresa_nombre ?? 'borrador'
  const slug = generateContractSlug(empresaNombre || 'borrador')
  const braltoSig = getBraltoSignatureDataUrl()
  const braltoTs = new Date().toISOString()

  const dataWithBraltoSig = {
    ...(dataToSave as Record<string, unknown>),
    firma: {
      ...((dataToSave as { firma?: Record<string, unknown> })?.firma ?? {}),
      bralto_canvas: braltoSig,
      bralto_timestamp: braltoTs,
    },
  }

  const { data: contract, error } = await supabase
    .from('contracts')
    .insert({
      slug,
      status: 'draft',
      data: dataWithBraltoSig,
      template_version: 'v1',
      client_id: client_id ?? null,
      created_by: user.id,
      signature_bralto_data: braltoSig,
      signature_bralto_timestamp: braltoTs,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('contract_events').insert({
    contract_id: contract.id,
    event_type: 'created',
    metadata: { created_by: user.id },
  })

  return NextResponse.json({ contract }, { status: 201 })
}
