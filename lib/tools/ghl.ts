import { supabase } from '../clients/supabase';

const GHL_BASE = 'https://services.leadconnectorhq.com';

function ghlHeaders(version: string): Record<string, string> {
  const apiKey = process.env.GHL_API_KEY;
  if (!apiKey) throw new Error('GHL_API_KEY no configurada');
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    Version: version,
  };
}

export async function searchGhlSlots(
  startDate: string,
  endDate: string,
  timezone = 'America/Costa_Rica'
): Promise<unknown> {
  const calendarId = process.env.GHL_CALENDAR_ID;
  if (!calendarId) return { error: 'GHL_CALENDAR_ID no configurado' };

  const params = new URLSearchParams({ startDate, endDate, timezone });
  const url = `${GHL_BASE}/calendars/${calendarId}/free-slots?${params}`;

  const res = await fetch(url, { headers: ghlHeaders('2021-04-15') });

  if (!res.ok) {
    const text = await res.text();
    return { error: `Error al buscar slots: ${res.status} ${text}` };
  }

  const raw = await res.json() as Record<string, unknown>;

  // Formatear slots para que Claude los lea fácil
  const slots: string[] = [];
  if (raw && typeof raw === 'object') {
    for (const [date, daySlots] of Object.entries(raw)) {
      if (Array.isArray(daySlots)) {
        for (const slot of daySlots as Array<{ startTime?: string; time?: string }>) {
          const time = slot.startTime ?? slot.time ?? JSON.stringify(slot);
          slots.push(`${date} ${time} (${timezone})`);
        }
      }
    }
  }

  return { slots, total: slots.length };
}

export async function bookGhlAppointment(
  prospectId: string,
  slotDatetime: string,
  contactEmail: string,
  notes: string
): Promise<unknown> {
  const calendarId = process.env.GHL_CALENDAR_ID;
  const locationId = process.env.GHL_LOCATION_ID;
  if (!calendarId || !locationId) {
    return { error: 'GHL_CALENDAR_ID o GHL_LOCATION_ID no configurados' };
  }

  // Obtener datos del prospecto para armar el contacto
  const { data: prospect } = await supabase
    .from('linkedin_agent_prospects')
    .select('first_name, last_name, full_name, phone, company_name')
    .eq('id', prospectId)
    .single();

  // 1. Crear o buscar contacto en GHL
  let contactId: string;

  const contactPayload = {
    firstName: prospect?.first_name ?? '',
    lastName: prospect?.last_name ?? '',
    email: contactEmail,
    phone: prospect?.phone ?? '',
    companyName: prospect?.company_name ?? '',
    locationId,
  };

  const contactRes = await fetch(`${GHL_BASE}/contacts/`, {
    method: 'POST',
    headers: ghlHeaders('2021-07-28'),
    body: JSON.stringify(contactPayload),
  });

  if (contactRes.status === 409 || !contactRes.ok) {
    // Si ya existe, buscar por email
    const searchRes = await fetch(
      `${GHL_BASE}/contacts/?locationId=${locationId}&email=${encodeURIComponent(contactEmail)}`,
      { headers: ghlHeaders('2021-07-28') }
    );
    const searchData = await searchRes.json() as { contacts?: Array<{ id: string }> };
    const existing = searchData?.contacts?.[0];
    if (!existing?.id) {
      return { error: 'No se pudo crear ni encontrar el contacto en GHL' };
    }
    contactId = existing.id;
  } else {
    const contactData = await contactRes.json() as { contact?: { id: string } };
    if (!contactData?.contact?.id) {
      return { error: 'Respuesta inesperada al crear contacto en GHL' };
    }
    contactId = contactData.contact.id;
  }

  // 2. Calcular endTime (+30 minutos)
  const start = new Date(slotDatetime);
  const end = new Date(start.getTime() + 30 * 60 * 1000);

  const appointmentPayload = {
    calendarId,
    locationId,
    contactId,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    title: `Discovery Call - ${prospect?.full_name ?? contactEmail}`,
    appointmentStatus: 'new',
    address: 'Zoom (link se envía por email)',
    notes,
  };

  const apptRes = await fetch(`${GHL_BASE}/calendars/events/appointments`, {
    method: 'POST',
    headers: ghlHeaders('2021-04-15'),
    body: JSON.stringify(appointmentPayload),
  });

  if (!apptRes.ok) {
    const text = await apptRes.text();
    return { error: `Error al crear appointment: ${apptRes.status} ${text}` };
  }

  const apptData = await apptRes.json() as { id?: string };
  const appointmentId = apptData?.id ?? null;

  // 3. Actualizar prospecto en Supabase
  await supabase
    .from('linkedin_agent_prospects')
    .update({
      ghl_contact_id: contactId,
      ghl_appointment_id: appointmentId,
      appointment_datetime: start.toISOString(),
      status: 'agendado',
      updated_at: new Date().toISOString(),
    })
    .eq('id', prospectId);

  return {
    success: true,
    contactId,
    appointmentId,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
  };
}
