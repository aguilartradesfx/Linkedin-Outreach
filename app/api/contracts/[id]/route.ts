import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { contractDataSchema } from '@/lib/contracts/schema'
import { getBraltoSignatureDataUrl } from '@/lib/contracts/bralto-signature'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only draft contracts can be edited
  const { data: existing } = await supabase
    .from('contracts')
    .select('id, status, data, signature_bralto_data, signature_bralto_timestamp')
    .eq('id', id)
    .single()

  if (!existing) return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
  if (existing.status !== 'draft' && existing.status !== 'sent') {
    return NextResponse.json({ error: 'Only draft or sent contracts can be edited' }, { status: 409 })
  }

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

  // Preserve (or re-apply) Bralto signature on edit
  const braltoSig = existing.signature_bralto_data ?? getBraltoSignatureDataUrl()
  const braltoTs = existing.signature_bralto_timestamp ?? new Date().toISOString()

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
    .update({
      data: dataWithBraltoSig,
      client_id: client_id ?? null,
      signature_bralto_data: braltoSig,
      signature_bralto_timestamp: braltoTs,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ contract })
}
