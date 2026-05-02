import fs from 'fs'
import path from 'path'
import type { ProposalRequest } from '@/types/proposals'
import { BRALTO_SERVICES, BUDGET_LABELS, TIMELINE_LABELS } from '@/types/proposals'

export function renderProposalTemplate(
  proposal: ProposalRequest,
  proposalDate: string,
  expiryDate: string,
): string {
  const templatePath = path.join(process.cwd(), 'templates', 'proposals', 'template.html')
  let html = fs.readFileSync(templatePath, 'utf-8')

  // 1. Secciones condicionales — incluir solo si el servicio está seleccionado
  const selectedServices = new Set(proposal.services)
  html = html.replace(
    /<!-- SECTION_START:(\w+) -->([\s\S]*?)<!-- SECTION_END:\1 -->/g,
    (_, serviceId, content) => selectedServices.has(serviceId) ? content : '',
  )

  // 2. Lista de servicios con sus etiquetas legibles
  const serviceLabels = proposal.services.map((id) => {
    const svc = BRALTO_SERVICES.find((s) => s.id === id)
    return svc?.label ?? id
  })

  // 3. Reemplazar todos los placeholders
  const values: Record<string, string> = {
    CLIENT_NAME:      proposal.client_name,
    CLIENT_COMPANY:   proposal.client_company  ?? '',
    CLIENT_INDUSTRY:  proposal.client_industry ?? '',
    CLIENT_EMAIL:     proposal.client_email    ?? '',
    CLIENT_PHONE:     proposal.client_phone    ?? '',
    PROPOSAL_DATE:    proposalDate,
    EXPIRY_DATE:      expiryDate,
    BUDGET_LABEL:     BUDGET_LABELS[proposal.budget_range],
    TIMELINE_LABEL:   TIMELINE_LABELS[proposal.timeline],
    NOTES:            proposal.notes           ?? '',
    SERVICES_COUNT:   String(proposal.services.length),
    SERVICES_LIST:    serviceLabels.join(', '),
  }

  for (const [key, value] of Object.entries(values)) {
    html = html.replaceAll(`{{${key}}}`, value)
  }

  return html
}
