import Handlebars from 'handlebars'
import fs from 'fs'
import path from 'path'
import type { ContractData } from '@/types/contracts'

// Register once — safe to call multiple times since Handlebars de-dupes by name
Handlebars.registerHelper('sigImg', (dataUrl: unknown) => {
  if (!dataUrl || typeof dataUrl !== 'string') {
    return new Handlebars.SafeString(
      '<div style="height:80px;border-bottom:2px solid #d1d5db;margin:8px 0;"></div>',
    )
  }
  return new Handlebars.SafeString(
    `<img src="${dataUrl}" style="height:80px;max-width:220px;object-fit:contain;display:block;" />`,
  )
})

Handlebars.registerHelper('formatTS', (ts: unknown) => {
  if (!ts || typeof ts !== 'string') return ''
  try {
    return new Date(ts).toLocaleString('es-CR', {
      timeZone: 'America/Costa_Rica',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ts
  }
})

export function loadTemplate(version: string): string {
  const templatePath = path.join(process.cwd(), 'templates', 'contract', `${version}.md`)
  return fs.readFileSync(templatePath, 'utf-8')
}

export function renderContractMarkdown(data: ContractData, templateString: string): string {
  const servicios = data.servicios ?? {}

  // Derived flags referenced in the Handlebars template
  const requiere_consumo_ia = !!(
    servicios.sistema_llamadas_ia ||
    servicios.agente_whatsapp ||
    servicios.agente_servicio_cliente
  )
  const servicios_no_incluye_contenido = !(
    servicios.produccion_contenido || servicios.gestion_redes
  )

  // Auto-populate firma dates if not already present
  const now = new Date()
  const firma = {
    dia: String(now.getDate()),
    mes: now.toLocaleDateString('es-CR', { month: 'long', timeZone: 'America/Costa_Rica' }),
    anio: String(now.getFullYear()),
    ...(data.firma ?? {}),
  }

  const context = {
    ...data,
    servicios: {
      ...servicios,
      requiere_consumo_ia,
      servicios_no_incluye_contenido,
    },
    firma,
  }

  const compiled = Handlebars.compile(templateString)
  return compiled(context)
}
