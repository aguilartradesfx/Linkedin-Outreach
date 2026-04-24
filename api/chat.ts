import { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { supabase } from '../lib/clients/supabase';
import { runAgent } from '../lib/agent';
import { validateWebhookSignature } from '../lib/utils/webhook-validator';
import { logEvent } from '../lib/utils/logger';

// Rate limiting en memoria por contactLinkedinUrl
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 20;

const payloadSchema = z.object({
  id: z.string(),
  message: z.string(),
  eventName: z.string().optional().default(''),
  eventType: z.string(),
  repliedAt: z.string().optional().default(''),
  timestamp: z.string().optional().default(''),
  campaignId: z.string().optional().default(''),
  contactName: z.string(),
  botdogUserId: z.string().optional().default(''),
  campaignName: z.string().optional().default(''),
  contactEmails: z.array(z.string()).optional().default([]),
  contactPhones: z.array(z.string()).optional().default([]),
  contactCompany: z.string().optional().default(''),
  contactLinkedinUrl: z.string(),
  botdogUserEmail: z.string().optional().default(''),
  botdogUserLinkedinPublicUrl: z.string().optional().default(''),
});

function checkRateLimit(linkedinUrl: string): boolean {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(linkedinUrl) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );
  if (timestamps.length >= RATE_LIMIT_MAX) return false;
  timestamps.push(now);
  rateLimitMap.set(linkedinUrl, timestamps);
  return true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = req.body as unknown;

    // Validar firma del webhook
    const signatureHeader = req.headers['x-webhook-signature'] as string | undefined;
    if (!validateWebhookSignature(signatureHeader, body)) {
      return res.status(401).json({ error: 'Firma de webhook inválida' });
    }

    // Validar payload con Zod
    const parsed = payloadSchema.safeParse(body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Payload inválido', details: parsed.error.flatten() });
    }

    const payload = parsed.data;

    // Solo procesar mensajes de respuesta de leads
    if (payload.eventType !== 'LEAD_MESSAGE_REPLIED') {
      return res.status(200).json({ ok: true, skipped: true });
    }

    // Rate limiting
    if (!checkRateLimit(payload.contactLinkedinUrl)) {
      return res.status(429).json({ error: 'Rate limit excedido para este prospecto' });
    }

    // Buscar o crear prospecto
    const { data: existing } = await supabase
      .from('linkedin_agent_prospects')
      .select('*')
      .eq('linkedin_url', payload.contactLinkedinUrl)
      .single();

    let prospectId: string;

    if (!existing) {
      const nameParts = payload.contactName.trim().split(' ');
      const firstName = nameParts[0] ?? '';
      const lastName = nameParts.slice(1).join(' ');

      const { data: created, error: createError } = await supabase
        .from('linkedin_agent_prospects')
        .insert({
          linkedin_url: payload.contactLinkedinUrl,
          full_name: payload.contactName,
          first_name: firstName,
          last_name: lastName,
          company_name: payload.contactCompany || null,
          email: payload.contactEmails[0] ?? null,
          phone: payload.contactPhones[0] ?? null,
          botdog_lead_id: payload.id,
          status: 'conversando',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_interaction_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError || !created) {
        await logEvent(null, 'prospect_create_error', { linkedin_url: payload.contactLinkedinUrl }, createError?.message);
        return res.status(500).json({ error: 'No se pudo crear el prospecto' });
      }

      prospectId = created.id as string;
    } else {
      prospectId = existing.id as string;

      // Actualizar estado si corresponde
      const currentStatus = existing.status as string;
      const shouldUpdateStatus = ['conexion_enviada', 'conectado'].includes(currentStatus);

      await supabase
        .from('linkedin_agent_prospects')
        .update({
          last_interaction_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...(shouldUpdateStatus ? { status: 'conversando' } : {}),
        })
        .eq('id', prospectId);
    }

    const agentResponse = await runAgent(prospectId, payload.message);

    return res.status(200).json({ success: true, response: agentResponse });
  } catch (err) {
    const error = err as Error;
    await logEvent(null, 'chat_handler_error', {}, error.message).catch(() => null);
    console.error('[api/chat] Error no manejado:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
