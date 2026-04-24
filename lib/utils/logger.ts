import { supabase } from '../clients/supabase';

export async function logEvent(
  prospectId: string | null,
  eventType: string,
  eventData?: Record<string, unknown>,
  errorMessage?: string
): Promise<void> {
  const entry = {
    prospect_id: prospectId,
    event_type: eventType,
    event_data: eventData ?? null,
    error_message: errorMessage ?? null,
    created_at: new Date().toISOString(),
  };

  // Siempre loguear a consola para Vercel logs
  if (errorMessage) {
    console.error(`[${eventType}]`, { prospectId, ...eventData, error: errorMessage });
  } else {
    console.log(`[${eventType}]`, { prospectId, ...eventData });
  }

  const { error } = await supabase
    .from('linkedin_agent_events')
    .insert(entry);

  if (error) {
    console.error('[logger] Error al insertar evento en Supabase:', error.message);
  }
}
