import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/clients/supabase'
import { runAgent } from '@/lib/agent'
import { logEvent } from '@/lib/utils/logger'
import { sendMessageToChatId } from '@/lib/clients/unipile'

// Vercel injects CRON_SECRET automatically for cron jobs.
// Requests coming from outside (non-Vercel) are rejected.
function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${process.env.CRON_SECRET}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Global kill switch — set agent_config row id='global_enabled' value='false' to pause the bot
  const { data: globalSwitch } = await supabase
    .from('agent_config')
    .select('value')
    .eq('id', 'global_enabled')
    .single()
  if (globalSwitch?.value === 'false') {
    console.log('[cron/process-queue] Agent globally disabled — skipping queue')
    return NextResponse.json({ ok: true, skipped: 'globally_disabled', processed: 0 })
  }

  // Pick up items whose delay has elapsed, not yet processed or failed
  const { data: items, error } = await supabase
    .from('agent_queue')
    .select('*')
    .lte('process_after', new Date().toISOString())
    .is('processed_at', null)
    .is('failed_at', null)
    .limit(5)

  if (error) {
    console.error('[cron/process-queue] Error fetching queue:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let processed = 0

  for (const item of items ?? []) {
    // Optimistic lock: only proceed if we're the first to claim this row
    const { error: lockError } = await supabase
      .from('agent_queue')
      .update({ processed_at: new Date().toISOString() })
      .eq('id', item.id)
      .is('processed_at', null)

    if (lockError) {
      console.log('[cron/process-queue] Row already claimed:', item.id)
      continue
    }

    try {
      const { data: prospect } = await supabase
        .from('linkedin_agent_prospects')
        .select('agent_enabled')
        .eq('id', item.prospect_id)
        .single()

      if (prospect?.agent_enabled === false) {
        await logEvent(item.prospect_id as string, 'agent_skipped', { reason: 'agent_disabled', source: 'queue' })
        processed++
        continue
      }

      const agentResponse = await runAgent(item.prospect_id as string, item.message as string)

      if (agentResponse.message) {
        const sent = await sendMessageToChatId(item.chat_id as string, agentResponse.message)
        await logEvent(item.prospect_id as string, sent ? 'unipile_message_sent' : 'unipile_send_failed', {
          chat_id: item.chat_id,
          source: 'queue',
        })
      }

      processed++
    } catch (err) {
      const message = (err as Error).message
      console.error('[cron/process-queue] Error processing item:', item.id, message)

      await supabase
        .from('agent_queue')
        .update({ processed_at: null, failed_at: new Date().toISOString(), error: message })
        .eq('id', item.id)
    }
  }

  console.log(`[cron/process-queue] Processed: ${processed}/${items?.length ?? 0}`)
  return NextResponse.json({ ok: true, processed, total: items?.length ?? 0 })
}
