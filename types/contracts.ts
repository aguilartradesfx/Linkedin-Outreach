export type ContractStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'signed_by_client'
  | 'signed_fully'
  | 'cancelled'

export type TipoSociedad =
  | 'Sociedad Anónima'
  | 'S.R.L.'
  | 'LLC'
  | 'E.I.R.L.'
  | 'Persona Física'
  | 'Otra'

export type EstadoCivil =
  | 'soltero(a)'
  | 'casado(a)'
  | 'divorciado(a)'
  | 'viudo(a)'
  | 'unión libre'

export type EventType =
  | 'created'
  | 'sent'
  | 'opened'
  | 'viewed'
  | 'signed'
  | 'cancelled'
  | 'downloaded'

export interface ClienteData {
  empresa_nombre: string
  tipo_sociedad: TipoSociedad
  cedula_juridica: string
  domicilio_legal: string
  jurisdiccion: string
  giro_comercial: string
  representante_nombre: string
  representante_profesion: string
  representante_estado_civil: EstadoCivil
  representante_direccion: string
  representante_documento: string
  representante_cargo: string
  correo_facturacion: string
  correo_notificaciones: string
}

export interface ProyectoData {
  nombre_paquete: string
  vigencia_numero: string
  vigencia_texto: string
  tiene_referencias_visuales: boolean
  descripcion_adicional?: string
}

export interface PagoData {
  monto_inicial: number
  monto_inicial_letras: string
  tiene_mensualidad: boolean
  monto_mensual?: number | null
  monto_mensual_letras?: string | null
}

export interface ServiciosData {
  ads: boolean
  sistema_llamadas_ia: boolean
  agente_whatsapp: boolean
  sitio_web: boolean
  crm_plataforma: boolean
  automatizaciones: boolean
  produccion_contenido: boolean
  gestion_redes: boolean
  seo: boolean
  tracking: boolean
  email_marketing: boolean
  agente_servicio_cliente: boolean
  activaciones_tienda: boolean
  otros: boolean
  otros_descripcion?: string | null
  // Derived flags — calculated server-side before rendering
  requiere_consumo_ia?: boolean
  servicios_no_incluye_contenido?: boolean
}

export interface EntregableItem {
  servicio: string
  descripcion: string
  cantidad?: number | string | null
  unidad?: string | null
}

export interface FirmaData {
  [key: string]: unknown
  dia?: string | null
  mes?: string | null
  anio?: string | null
  cliente_canvas?: string | null
  cliente_timestamp?: string | null
  cliente_ip?: string | null
  cliente_user_agent?: string | null
  cliente_aceptacion_terminos?: boolean
  bralto_canvas?: string | null
  bralto_timestamp?: string | null
}

export interface ContractData {
  cliente: ClienteData
  proyecto: ProyectoData
  pago: PagoData
  servicios: ServiciosData
  entregables?: EntregableItem[]
  firma?: FirmaData
}

// ── Database rows ──────────────────────────────────────────────────────────

export interface ClientRow {
  id: string
  empresa_nombre: string
  cedula_juridica?: string | null
  representante_nombre?: string | null
  correo_notificaciones?: string | null
  notas?: string | null
  created_at: string
  created_by?: string | null
}

export interface ContractRow {
  id: string
  slug: string
  status: ContractStatus
  data: ContractData
  template_version: string
  client_id?: string | null
  signature_client_data?: string | null
  signature_client_timestamp?: string | null
  signature_client_ip?: string | null
  signature_client_user_agent?: string | null
  signature_client_accepted_terms?: boolean
  signature_bralto_data?: string | null
  signature_bralto_timestamp?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string
  sent_at?: string | null
  viewed_at?: string | null
  signed_at?: string | null
  signed_pdf_url?: string | null
}

// Returned by get_contract_by_slug RPC — limited fields, safe for public exposure
export interface PublicContractData {
  slug: string
  status: ContractStatus
  data: ContractData
  template_version: string
  signed_pdf_url?: string | null
  signed_at?: string | null
}

export interface ContractEventRow {
  id: string
  contract_id: string
  event_type: EventType
  metadata?: Record<string, unknown> | null
  ip?: string | null
  user_agent?: string | null
  created_at: string
}

export const STATUS_LABELS: Record<ContractStatus, string> = {
  draft: 'Borrador',
  sent: 'Enviado',
  viewed: 'Visto',
  signed_by_client: 'Firmado por cliente',
  signed_fully: 'Firmado completo',
  cancelled: 'Cancelado',
}

export const STATUS_COLORS: Record<ContractStatus, string> = {
  draft: 'bg-white/10 text-white/60',
  sent: 'bg-blue-500/15 text-blue-400',
  viewed: 'bg-yellow-500/15 text-yellow-400',
  signed_by_client: 'bg-orange-500/15 text-orange-400',
  signed_fully: 'bg-green-500/15 text-green-400',
  cancelled: 'bg-red-500/15 text-red-400',
}
