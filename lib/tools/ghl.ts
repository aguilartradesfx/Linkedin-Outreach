import { supabase } from '../clients/supabase';

const N8N_CHECK_SLOTS = 'https://bralto-io-n8n.z49dor.easypanel.host/webhook/check-slots';
const N8N_BOOK_APPOINTMENT = 'https://bralto-io-n8n.z49dor.easypanel.host/webhook/book-appointment';

export async function searchGhlSlots(
  startDate: string,
  endDate: string,
  timezone = 'America/Costa_Rica'
): Promise<unknown> {
  const res = await fetch(N8N_CHECK_SLOTS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ startDate, endDate, timezone }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { error: `Error al consultar slots: ${res.status} ${text}` };
  }

  return res.json();
}

export async function bookGhlAppointment(
  prospectId: string,
  slotDatetime: string,
  contactEmail: string,
  notes: string
): Promise<unknown> {
  const { data: prospect } = await supabase
    .from('linkedin_agent_prospects')
    .select('first_name, last_name, phone, company_name')
    .eq('id', prospectId)
    .single();

  const res = await fetch(N8N_BOOK_APPOINTMENT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prospectId,
      slotDatetime,
      email: contactEmail,
      firstName: prospect?.first_name ?? '',
      lastName: prospect?.last_name ?? '',
      phone: prospect?.phone ?? '',
      company: prospect?.company_name ?? '',
      notes,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { error: `Error al agendar cita: ${res.status} ${text}` };
  }

  const data = await res.json() as {
    success?: boolean;
    appointmentId?: string;
    contactId?: string;
    datetime?: string;
    error?: string;
  };

  if (!data.success) {
    return { error: data.error ?? 'n8n no pudo agendar la cita' };
  }

  await supabase
    .from('linkedin_agent_prospects')
    .update({
      ghl_contact_id: data.contactId ?? null,
      ghl_appointment_id: data.appointmentId ?? null,
      appointment_datetime: data.datetime ?? slotDatetime,
      status: 'agendado',
      updated_at: new Date().toISOString(),
    })
    .eq('id', prospectId);

  return {
    success: true,
    contactId: data.contactId,
    appointmentId: data.appointmentId,
    startTime: data.datetime ?? slotDatetime,
  };
}
