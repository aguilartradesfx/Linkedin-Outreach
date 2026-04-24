// Payload que llega de Botdog cuando un prospecto responde
export interface BotdogWebhookPayload {
  id: string;
  message: string;
  eventName: string;
  eventType: string; // "LEAD_MESSAGE_REPLIED"
  repliedAt: string;
  timestamp: string;
  campaignId: string;
  contactName: string;
  botdogUserId: string;
  campaignName: string;
  contactEmails: string[];
  contactPhones: string[];
  contactCompany: string;
  contactLinkedinUrl: string;
  botdogUserEmail: string;
  botdogUserLinkedinPublicUrl: string;
}

// Registro en Supabase
export interface Prospect {
  id: string;
  linkedin_url: string;
  linkedin_id: string | null;
  botdog_lead_id: string | null;
  apify_scrape_id: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  headline: string | null;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  company_size: string | null;
  industry: string | null;
  position: string | null;
  location: string | null;
  country: string | null;
  recent_posts: string | null;
  profile_experience: Record<string, unknown>[];
  icp_score: number;
  trigger_signals: string | null;
  qualification_reason: string | null;
  disqualification_reason: string | null;
  is_decision_maker: boolean;
  has_budget_signal: boolean;
  mentioned_problem: boolean;
  timing_urgency: boolean;
  initial_message: string | null;
  ghl_contact_id: string | null;
  ghl_appointment_id: string | null;
  appointment_datetime: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  last_interaction_at: string | null;
  metadata: Record<string, unknown>;
}

export interface Message {
  id: string;
  prospect_id: string;
  role: 'prospect' | 'agent' | 'system';
  content: string;
  turn_number: number;
  tool_calls: Record<string, unknown> | null;
  created_at: string;
}

export interface AgentResponse {
  message: string;
  prospectId: string;
  status: string;
}
