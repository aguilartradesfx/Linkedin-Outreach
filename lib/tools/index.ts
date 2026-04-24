import Anthropic from '@anthropic-ai/sdk';
import { getProspectData, getConversationHistory, updateProspectStatus } from './supabase';
import { searchGhlSlots, bookGhlAppointment } from './ghl';

export const toolDefinitions: Anthropic.Tool[] = [
  {
    name: 'get_prospect_data',
    description: 'Lee los datos completos de un prospecto desde Supabase por su ID. Úsalo al inicio de cada conversación para tener contexto sobre quién es el prospecto, su estado de calificación y señales detectadas.',
    input_schema: {
      type: 'object' as const,
      properties: {
        prospect_id: {
          type: 'string',
          description: 'ID UUID del prospecto en la tabla linkedin_agent_prospects',
        },
      },
      required: ['prospect_id'],
    },
  },
  {
    name: 'get_conversation_history',
    description: 'Obtiene el historial de mensajes de un prospecto ordenado cronológicamente. Úsalo al inicio para no repetir preguntas ni mensajes ya enviados.',
    input_schema: {
      type: 'object' as const,
      properties: {
        prospect_id: {
          type: 'string',
          description: 'ID UUID del prospecto',
        },
        limit: {
          type: 'number',
          description: 'Máximo de mensajes a retornar (default: 20)',
        },
      },
      required: ['prospect_id'],
    },
  },
  {
    name: 'update_prospect_status',
    description: 'Actualiza el estado de calificación y señales de un prospecto en Supabase. Úsalo después de cada turno de conversación para mantener el estado actualizado.',
    input_schema: {
      type: 'object' as const,
      properties: {
        prospect_id: {
          type: 'string',
          description: 'ID UUID del prospecto',
        },
        updates: {
          type: 'object',
          description: 'Campos a actualizar. Puede incluir: status, is_decision_maker, has_budget_signal, mentioned_problem, timing_urgency, qualification_reason, disqualification_reason, last_interaction_at, ghl_contact_id, ghl_appointment_id, appointment_datetime',
          properties: {
            status: { type: 'string' },
            is_decision_maker: { type: 'boolean' },
            has_budget_signal: { type: 'boolean' },
            mentioned_problem: { type: 'boolean' },
            timing_urgency: { type: 'boolean' },
            qualification_reason: { type: 'string' },
            disqualification_reason: { type: 'string' },
            last_interaction_at: { type: 'string' },
            ghl_contact_id: { type: 'string' },
            ghl_appointment_id: { type: 'string' },
            appointment_datetime: { type: 'string' },
          },
        },
      },
      required: ['prospect_id', 'updates'],
    },
  },
  {
    name: 'search_ghl_slots',
    description: 'Busca slots disponibles en el calendario de GHL para los próximos días. Úsalo cuando el prospecto quiere agendar una call para mostrarle opciones concretas.',
    input_schema: {
      type: 'object' as const,
      properties: {
        start_date: {
          type: 'string',
          description: 'Fecha de inicio en formato ISO (YYYY-MM-DD)',
        },
        end_date: {
          type: 'string',
          description: 'Fecha de fin en formato ISO (YYYY-MM-DD)',
        },
        timezone: {
          type: 'string',
          description: 'Zona horaria del prospecto (default: America/Costa_Rica)',
        },
      },
      required: ['start_date', 'end_date'],
    },
  },
  {
    name: 'book_ghl_appointment',
    description: 'Confirma y agenda una cita en GHL. Crea el contacto si no existe y genera el appointment. Actualiza el prospecto en Supabase con status=agendado.',
    input_schema: {
      type: 'object' as const,
      properties: {
        prospect_id: {
          type: 'string',
          description: 'ID UUID del prospecto',
        },
        slot_datetime: {
          type: 'string',
          description: 'Fecha y hora del slot elegido en formato ISO',
        },
        contact_email: {
          type: 'string',
          description: 'Email del prospecto para crear/buscar el contacto en GHL',
        },
        notes: {
          type: 'string',
          description: 'Notas para Alejandro: problema mencionado, empresa, cargo, señales detectadas',
        },
      },
      required: ['prospect_id', 'slot_datetime', 'contact_email', 'notes'],
    },
  },
];

export async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<unknown> {
  switch (toolName) {
    case 'get_prospect_data':
      return getProspectData(toolInput.prospect_id as string);

    case 'get_conversation_history':
      return getConversationHistory(
        toolInput.prospect_id as string,
        toolInput.limit as number | undefined
      );

    case 'update_prospect_status':
      return updateProspectStatus(
        toolInput.prospect_id as string,
        toolInput.updates as Record<string, unknown>
      );

    case 'search_ghl_slots':
      return searchGhlSlots(
        toolInput.start_date as string,
        toolInput.end_date as string,
        toolInput.timezone as string | undefined
      );

    case 'book_ghl_appointment':
      return bookGhlAppointment(
        toolInput.prospect_id as string,
        toolInput.slot_datetime as string,
        toolInput.contact_email as string,
        toolInput.notes as string
      );

    default:
      return { error: `Tool desconocida: ${toolName}` };
  }
}
