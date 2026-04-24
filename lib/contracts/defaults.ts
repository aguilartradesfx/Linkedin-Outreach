import type { ServiciosData, EntregableItem } from '@/types/contracts'

type ServiciosInput = Partial<ServiciosData>

export function generateDefaultEntregables(servicios: ServiciosInput): EntregableItem[] {
  const items: EntregableItem[] = []

  if (servicios.ads) {
    items.push({ servicio: 'ADS', descripcion: 'Gestión de campañas publicitarias (Meta/Google)', cantidad: 1, unidad: 'mes' })
    items.push({ servicio: 'ADS', descripcion: 'Reporte mensual de rendimiento publicitario', cantidad: 1, unidad: 'mes' })
  }
  if (servicios.sistema_llamadas_ia) {
    items.push({ servicio: 'Sistema Llamadas IA', descripcion: 'Configuración e integración del agente de voz IA', cantidad: 1, unidad: 'proyecto' })
    items.push({ servicio: 'Sistema Llamadas IA', descripcion: 'Capacitación de uso y monitoreo del sistema', cantidad: 1, unidad: 'sesión' })
  }
  if (servicios.agente_whatsapp) {
    items.push({ servicio: 'Agente WhatsApp IA', descripcion: 'Diseño y configuración del agente conversacional', cantidad: 1, unidad: 'proyecto' })
    items.push({ servicio: 'Agente WhatsApp IA', descripcion: 'Flujos de conversación personalizados', cantidad: 3, unidad: 'flujos' })
  }
  if (servicios.sitio_web) {
    items.push({ servicio: 'Sitio Web', descripcion: 'Diseño y desarrollo del sitio web', cantidad: 1, unidad: 'proyecto' })
    items.push({ servicio: 'Sitio Web', descripcion: 'Configuración de hosting y dominio', cantidad: 1, unidad: 'proyecto' })
    items.push({ servicio: 'Sitio Web', descripcion: 'SEO on-page básico', cantidad: 1, unidad: 'proyecto' })
  }
  if (servicios.crm_plataforma) {
    items.push({ servicio: 'CRM / Plataforma', descripcion: 'Configuración inicial de la plataforma Bralto', cantidad: 1, unidad: 'proyecto' })
    items.push({ servicio: 'CRM / Plataforma', descripcion: 'Capacitación de uso del CRM', cantidad: 1, unidad: 'sesión' })
  }
  if (servicios.automatizaciones) {
    items.push({ servicio: 'Automatizaciones', descripcion: 'Diseño e implementación de flujos automatizados', cantidad: 3, unidad: 'flujos' })
  }
  if (servicios.produccion_contenido) {
    items.push({ servicio: 'Producción de Contenido', descripcion: 'Piezas gráficas para redes sociales', cantidad: 8, unidad: 'piezas/mes' })
    items.push({ servicio: 'Producción de Contenido', descripcion: 'Videos/Reels cortos', cantidad: 4, unidad: 'piezas/mes' })
  }
  if (servicios.gestion_redes) {
    items.push({ servicio: 'Gestión de Redes', descripcion: 'Publicación y calendarización de contenido', cantidad: 12, unidad: 'posts/mes' })
    items.push({ servicio: 'Gestión de Redes', descripcion: 'Gestión de comunidad (respuestas y comentarios)', cantidad: 1, unidad: 'mes' })
  }
  if (servicios.seo) {
    items.push({ servicio: 'SEO', descripcion: 'Auditoría técnica y optimización SEO', cantidad: 1, unidad: 'proyecto' })
    items.push({ servicio: 'SEO', descripcion: 'Reporte mensual de posicionamiento', cantidad: 1, unidad: 'mes' })
  }
  if (servicios.tracking) {
    items.push({ servicio: 'Tracking', descripcion: 'Configuración de Google Tag Manager y GA4', cantidad: 1, unidad: 'proyecto' })
    items.push({ servicio: 'Tracking', descripcion: 'Dashboard de analítica', cantidad: 1, unidad: 'proyecto' })
  }
  if (servicios.email_marketing) {
    items.push({ servicio: 'Email Marketing', descripcion: 'Diseño de plantillas de email', cantidad: 2, unidad: 'plantillas' })
    items.push({ servicio: 'Email Marketing', descripcion: 'Secuencia automatizada de bienvenida', cantidad: 1, unidad: 'secuencia' })
  }
  if (servicios.agente_servicio_cliente) {
    items.push({ servicio: 'Agente IA Servicio', descripcion: 'Implementación de agente conversacional de atención al cliente', cantidad: 1, unidad: 'proyecto' })
  }
  if (servicios.activaciones_tienda) {
    items.push({ servicio: 'Activaciones Tienda', descripcion: 'Diseño de dinámica comercial en punto de venta', cantidad: 1, unidad: 'activación' })
  }

  return items
}
