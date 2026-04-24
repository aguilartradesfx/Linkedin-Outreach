import { z } from 'zod'

const entregableSchema = z.object({
  servicio: z.string(),
  descripcion: z.string(),
  cantidad: z.union([z.number(), z.string()]).nullable().optional(),
  unidad: z.string().nullable().optional(),
})

const clienteSchema = z.object({
  empresa_nombre: z.string().min(1, 'Requerido'),
  tipo_sociedad: z.enum(['Sociedad Anónima', 'S.R.L.', 'LLC', 'E.I.R.L.', 'Persona Física', 'Otra']),
  cedula_juridica: z.string().min(1, 'Requerido'),
  domicilio_legal: z.string().min(1, 'Requerido'),
  jurisdiccion: z.string().min(1),
  giro_comercial: z.string().min(1, 'Requerido'),
  representante_nombre: z.string().min(1, 'Requerido'),
  representante_profesion: z.string(),
  representante_estado_civil: z.enum(['soltero(a)', 'casado(a)', 'divorciado(a)', 'viudo(a)', 'unión libre']),
  representante_direccion: z.string(),
  representante_documento: z.string().min(1, 'Requerido'),
  representante_cargo: z.string(),
  correo_facturacion: z.string().email('Email inválido'),
  correo_notificaciones: z.string().email('Email inválido'),
})

const proyectoSchema = z.object({
  nombre_paquete: z.string().min(1, 'Requerido'),
  vigencia_numero: z.string().min(1),
  vigencia_texto: z.string().min(1),
  tiene_referencias_visuales: z.boolean(),
  descripcion_adicional: z.string().optional(),
})

const pagoSchema = z.object({
  monto_inicial: z.number().positive('Debe ser mayor a 0'),
  monto_inicial_letras: z.string(),
  tiene_mensualidad: z.boolean(),
  monto_mensual: z.number().nullable().optional(),
  monto_mensual_letras: z.string().nullable().optional(),
})

const serviciosSchema = z.object({
  ads: z.boolean(),
  sistema_llamadas_ia: z.boolean(),
  agente_whatsapp: z.boolean(),
  sitio_web: z.boolean(),
  crm_plataforma: z.boolean(),
  automatizaciones: z.boolean(),
  produccion_contenido: z.boolean(),
  gestion_redes: z.boolean(),
  seo: z.boolean(),
  tracking: z.boolean(),
  email_marketing: z.boolean(),
  agente_servicio_cliente: z.boolean(),
  activaciones_tienda: z.boolean(),
  otros: z.boolean(),
  otros_descripcion: z.string().nullable().optional(),
})

export const contractDataSchema = z.object({
  cliente: clienteSchema,
  proyecto: proyectoSchema,
  pago: pagoSchema,
  servicios: serviciosSchema,
  entregables: z.array(entregableSchema).optional(),
  payment_link: z
    .string()
    .url('URL inválida')
    .optional()
    .or(z.literal(''))
    .transform((v) => (v === '' ? undefined : v)),
  firma: z.record(z.unknown()).optional(),
})

export type ContractDataInput = z.infer<typeof contractDataSchema>
