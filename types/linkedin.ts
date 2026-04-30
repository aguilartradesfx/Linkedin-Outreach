export type ProspectStatus =
  | 'nuevo'
  | 'conexion_enviada'
  | 'conectado'
  | 'conversando'
  | 'calificado'
  | 'agendado'
  | 'no_califica'
  | 'no_respondio'
  | 'cerrado_ganado'
  | 'cerrado_perdido'

export const PROSPECT_STATUSES: ProspectStatus[] = [
  'nuevo',
  'conexion_enviada',
  'conectado',
  'conversando',
  'calificado',
  'agendado',
  'no_califica',
  'no_respondio',
  'cerrado_ganado',
  'cerrado_perdido',
]

export interface LinkedInProspect {
  id: string
  linkedin_url: string | null
  first_name: string | null
  last_name: string | null
  full_name: string | null
  headline: string | null
  email: string | null
  phone: string | null
  company_name: string | null
  company_size: string | null
  industry: string | null
  position: string | null
  location: string | null
  country: string | null
  recent_posts: unknown
  profile_experience: unknown
  icp_score: number | null
  trigger_signals: string[] | null
  qualification_reason: string | null
  disqualification_reason: string | null
  is_decision_maker: boolean | null
  has_budget_signal: boolean | null
  mentioned_problem: boolean | null
  timing_urgency: boolean | null
  initial_message: string | null
  ghl_contact_id: string | null
  ghl_appointment_id: string | null
  appointment_datetime: string | null
  status: ProspectStatus
  agent_enabled: boolean | null
  unipile_chat_id: string | null
  last_read_at: string | null
  created_at: string
  updated_at: string | null
  last_interaction_at: string | null
  metadata: unknown
}

export interface LinkedInMessage {
  id: string
  prospect_id: string
  role: 'prospect' | 'agent' | 'system'
  content: string
  turn_number: number | null
  tool_calls: unknown
  created_at: string
}

export interface LinkedInEvent {
  id: string
  prospect_id: string | null
  event_type: string
  event_data: unknown
  error_message: string | null
  created_at: string
}
