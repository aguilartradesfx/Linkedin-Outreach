import { supabase } from '../clients/supabase';

const VALID_STATUSES = [
  'nuevo', 'conexion_enviada', 'conectado', 'conversando',
  'calificado', 'agendado', 'no_califica', 'no_respondio',
  'cerrado_ganado', 'cerrado_perdido',
] as const;

export async function getProspectData(prospectId: string): Promise<unknown> {
  const { data, error } = await supabase
    .from('linkedin_agent_prospects')
    .select('*')
    .eq('id', prospectId)
    .single();

  if (error) {
    return { error: `No se encontró el prospecto con id=${prospectId}: ${error.message}` };
  }

  return data;
}

export async function getConversationHistory(
  prospectId: string,
  limit = 20
): Promise<unknown> {
  const { data, error } = await supabase
    .from('linkedin_agent_messages')
    .select('*')
    .eq('prospect_id', prospectId)
    .order('turn_number', { ascending: true })
    .limit(limit);

  if (error) {
    return { error: `Error al obtener historial: ${error.message}` };
  }

  return data ?? [];
}

export async function updateProspectStatus(
  prospectId: string,
  updates: Record<string, unknown>
): Promise<unknown> {
  // Validar status si viene en los updates
  if (updates.status && !VALID_STATUSES.includes(updates.status as typeof VALID_STATUSES[number])) {
    return {
      error: `Status inválido: "${updates.status}". Valores permitidos: ${VALID_STATUSES.join(', ')}`,
    };
  }

  const payload = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('linkedin_agent_prospects')
    .update(payload)
    .eq('id', prospectId)
    .select()
    .single();

  if (error) {
    return { error: `Error al actualizar prospecto: ${error.message}` };
  }

  return data;
}
