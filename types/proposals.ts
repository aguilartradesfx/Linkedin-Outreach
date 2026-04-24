export const BRALTO_SERVICES = [
  { id: 'redes_sociales',  label: 'Gestión de redes sociales' },
  { id: 'automatizacion',  label: 'Automatización de procesos' },
  { id: 'sitio_web',       label: 'Creación de sitio web' },
  { id: 'branding',        label: 'Branding / Identidad visual' },
  { id: 'email_marketing', label: 'Email marketing' },
  { id: 'seo',             label: 'SEO y posicionamiento' },
  { id: 'contenido',       label: 'Creación de contenido' },
  { id: 'ads',             label: 'Publicidad pagada (Ads)' },
  { id: 'consultoria',     label: 'Consultoría estratégica' },
  { id: 'agente_ia',       label: 'Agente IA (LinkedIn / WhatsApp)' },
  { id: 'crm',             label: 'CRM y seguimiento comercial' },
  { id: 'produccion',      label: 'Fotografía / Producción' },
] as const

export type ServiceId = typeof BRALTO_SERVICES[number]['id']

export type ProposalStatus =
  | 'pendiente'
  | 'en_revision'
  | 'propuesta_enviada'
  | 'ganado'
  | 'perdido'

export type ProposalPriority = 'baja' | 'normal' | 'alta' | 'urgente'

export type BudgetRange =
  | 'menos_500'
  | '500_1500'
  | '1500_3000'
  | 'mas_3000'
  | 'no_definido'

export type Timeline = 'urgente' | '1_mes' | '2_3_meses' | 'flexible'

export interface ProposalRequest {
  id: string
  client_name: string
  client_company: string | null
  client_email: string | null
  client_phone: string | null
  client_industry: string | null
  services: string[]
  notes: string | null
  budget_range: BudgetRange
  timeline: Timeline
  submitted_by: string | null
  assigned_to: string | null
  status: ProposalStatus
  priority: ProposalPriority
  internal_notes: string | null
  created_at: string
  updated_at: string
}

export const STATUS_LABELS: Record<ProposalStatus, string> = {
  pendiente:         'Pendiente',
  en_revision:       'En revisión',
  propuesta_enviada: 'Propuesta enviada',
  ganado:            'Ganado',
  perdido:           'Perdido',
}

export const STATUS_COLORS: Record<ProposalStatus, string> = {
  pendiente:         'bg-yellow-500/10 text-yellow-300 border-yellow-500/20',
  en_revision:       'bg-blue-500/10 text-blue-300 border-blue-500/20',
  propuesta_enviada: 'bg-orange-500/10 text-orange-300 border-orange-500/20',
  ganado:            'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  perdido:           'bg-red-500/10 text-red-300 border-red-500/20',
}

export const PRIORITY_LABELS: Record<ProposalPriority, string> = {
  baja:    'Baja',
  normal:  'Normal',
  alta:    'Alta',
  urgente: 'Urgente',
}

export const PRIORITY_COLORS: Record<ProposalPriority, string> = {
  baja:    'text-white/30',
  normal:  'text-white/50',
  alta:    'text-amber-400',
  urgente: 'text-red-400',
}

export const BUDGET_LABELS: Record<BudgetRange, string> = {
  menos_500:  '< $500/mes',
  '500_1500': '$500 – $1,500/mes',
  '1500_3000':'$1,500 – $3,000/mes',
  mas_3000:   '$3,000+/mes',
  no_definido:'No definido',
}

export const TIMELINE_LABELS: Record<Timeline, string> = {
  urgente:    'Urgente (< 2 semanas)',
  '1_mes':    '1 mes',
  '2_3_meses':'2 – 3 meses',
  flexible:   'Flexible',
}
