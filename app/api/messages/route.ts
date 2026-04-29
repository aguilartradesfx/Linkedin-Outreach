import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// GET /api/messages?prospect_id=xxx  — messages for one prospect
// GET /api/messages?limit=500        — latest N messages across all prospects (for inbox)
export async function GET(req: NextRequest) {
  try {
    const supabase = createServiceClient()
    const { searchParams } = new URL(req.url)
    const prospectId = searchParams.get('prospect_id')
    const limit = parseInt(searchParams.get('limit') ?? '200', 10)

    let query = supabase
      .from('linkedin_agent_messages')
      .select('*')
      .order(prospectId ? 'turn_number' : 'created_at', { ascending: prospectId ? true : false })

    if (prospectId) {
      query = query.eq('prospect_id', prospectId)
    } else {
      query = query.limit(limit)
    }

    const { data, error } = await query

    if (error) {
      console.error('[api/messages] Error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data ?? [])
  } catch (err) {
    const error = err as Error
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
