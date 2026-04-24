import { NextResponse, after } from 'next/server'

// Redis key for permanently confirmed bookings
const KEY = 'bralto:booked_slots'
// TTL for temporary hold (seconds)
const LOCK_TTL = 300

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  const { Redis } = require('@upstash/redis')
  return new Redis({ url, token })
}

// ── GET: return booked (permanent) + locked (temporary) slots ────────────────

export async function GET() {
  const redis = getRedis()
  if (!redis) return NextResponse.json({ booked: [], locked: [] })

  try {
    const [booked, lockKeys] = await Promise.all([
      redis.smembers(KEY) as Promise<string[]>,
      redis.keys('bralto:lock:*') as Promise<string[]>,
    ])
    const locked = lockKeys.map((k: string) => k.replace('bralto:lock:', ''))
    return NextResponse.json({ booked: booked ?? [], locked })
  } catch {
    return NextResponse.json({ booked: [], locked: [] })
  }
}

// ── POST: lock | unlock | confirm ────────────────────────────────────────────

export async function POST(req: Request) {
  const body = await req.json()
  const { action, slot, sessionId } = body

  if (!slot || typeof slot !== 'string') {
    return NextResponse.json({ error: 'Invalid slot' }, { status: 400 })
  }

  // ── lock: reserve slot for 5 minutes ──────────────────────────────────────
  if (action === 'lock') {
    if (!sessionId) return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })

    const redis = getRedis()
    if (!redis) {
      // Redis not configured — grant lock anyway (no real blocking)
      return NextResponse.json({ success: true, expiresAt: Date.now() + LOCK_TTL * 1000 })
    }

    try {
      const lockKey = `bralto:lock:${slot}`

      // Reject if already permanently booked
      const isBooked = await redis.sismember(KEY, slot)
      if (isBooked) {
        return NextResponse.json(
          { error: 'Este horario ya fue confirmado por otro usuario. Por favor elija otro.' },
          { status: 409 },
        )
      }

      // NX = set only if the key does not exist
      const result = await redis.set(lockKey, sessionId, { nx: true, ex: LOCK_TTL })

      if (result === null) {
        // Already locked — check if it's by this same session
        const owner = await redis.get(lockKey)
        if (owner === sessionId) {
          const ttl = await redis.ttl(lockKey)
          return NextResponse.json({ success: true, expiresAt: Date.now() + ttl * 1000 })
        }
        return NextResponse.json(
          { error: 'Este horario acaba de ser seleccionado por otro usuario. Por favor elija otro.' },
          { status: 409 },
        )
      }

      return NextResponse.json({ success: true, expiresAt: Date.now() + LOCK_TTL * 1000 })
    } catch {
      // Redis error — grant lock optimistically
      return NextResponse.json({ success: true, expiresAt: Date.now() + LOCK_TTL * 1000 })
    }
  }

  // ── unlock: release lock when user goes back ───────────────────────────────
  if (action === 'unlock') {
    if (!sessionId) return NextResponse.json({ success: true })

    const redis = getRedis()
    if (!redis) return NextResponse.json({ success: true })

    try {
      const lockKey = `bralto:lock:${slot}`
      const owner = await redis.get(lockKey)
      if (owner === sessionId) await redis.del(lockKey)
    } catch { /* ignore — lock will expire on its own */ }

    return NextResponse.json({ success: true })
  }

  // ── confirm: make slot permanent and save to Supabase ─────────────────────
  if (action === 'confirm') {
    const redis = getRedis()

    if (redis) {
      try {
        const lockKey = `bralto:lock:${slot}`

        // Verify the session still owns the lock (not expired)
        if (sessionId) {
          const owner = await redis.get(lockKey)
          if (owner !== null && owner !== sessionId) {
            return NextResponse.json(
              { error: 'El bloqueo del horario expiró. Por favor regrese y seleccione otro.' },
              { status: 409 },
            )
          }
        }

        // Attempt permanent booking
        const added = await redis.sadd(KEY, slot)
        if (added === 0) {
          // Already booked by someone else
          return NextResponse.json(
            { error: 'Este horario ya fue confirmado. Por favor regrese y elija otro.' },
            { status: 409 },
          )
        }

        // Release temporary lock
        await redis.del(lockKey)
      } catch { /* continue to Supabase regardless */ }
    }

    // Persist booking details to Supabase
    // Required table: bookings (slot_key, nombre, apellido, telefono, email, answers, created_at)
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_ANON_KEY
    if (supabaseUrl && supabaseKey) {
      try {
        const { nombre, apellido, countryCode, telefono, email, answers } = body
        await fetch(`${supabaseUrl}/rest/v1/bookings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${supabaseKey}`,
            apikey: supabaseKey,
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            slot_key: slot,
            nombre,
            apellido,
            telefono: `${countryCode ?? ''}${telefono ?? ''}`,
            email,
            answers,
          }),
        })
      } catch { /* Supabase save is non-critical — booking is already locked in Redis */ }
    }

    // Fire-and-forget webhook to N8N — uses after() so the function stays
    // alive until the fetch completes even after the response is sent
    const webhookUrl = process.env.N8N_WEBHOOK_URL
    if (webhookUrl) {
      const { nombre, apellido, countryCode, telefono, email, answers } = body
      const payload = JSON.stringify({
        slot_key: slot,
        nombre,
        apellido,
        telefono: `${countryCode ?? ''}${telefono ?? ''}`,
        email,
        answers,
        booked_at: new Date().toISOString(),
      })
      after(async () => {
        try {
          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
          })
        } catch (err) {
          console.error('[n8n webhook] failed:', err)
        }
      })
    }

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
