import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const body = z.object({
  signature: z.string().min(10),
})

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()

  // Verify authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let parsed
  try {
    parsed = body.safeParse(await req.json())
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data: contract } = await supabase
    .from('contracts')
    .select('id, status, data')
    .eq('id', id)
    .single()

  if (!contract) return NextResponse.json({ error: 'Contrato no encontrado' }, { status: 404 })
  if (contract.status !== 'signed_by_client') {
    return NextResponse.json(
      { error: 'El cliente debe firmar primero' },
      { status: 409 },
    )
  }

  const now = new Date().toISOString()
  const updatedData = {
    ...contract.data,
    firma: {
      ...(contract.data?.firma ?? {}),
      bralto_canvas: parsed.data.signature,
      bralto_timestamp: now,
    },
  }

  const { error } = await supabase
    .from('contracts')
    .update({
      status: 'signed_fully',
      signature_bralto_data: parsed.data.signature,
      signature_bralto_timestamp: now,
      data: updatedData,
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('contract_events').insert({
    contract_id: id,
    event_type: 'signed',
    metadata: { signer: 'bralto', timestamp: now },
  })

  return NextResponse.json({ ok: true })
}
