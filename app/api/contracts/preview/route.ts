import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { loadTemplate, renderContractMarkdown } from '@/lib/contracts/render'
import { marked } from 'marked'
import type { ContractData } from '@/types/contracts'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { data: ContractData; template_version?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  try {
    const templateVersion = body.template_version ?? 'v1'
    const templateString = loadTemplate(templateVersion)
    const markdown = renderContractMarkdown(body.data, templateString)
    const html = String(marked.parse(markdown))
    return NextResponse.json({ html })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
