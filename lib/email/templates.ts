interface EmailResult {
  subject: string
  html: string
}

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { margin: 0; padding: 0; background: #f9f9f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: #0d0d0d; padding: 32px 40px; text-align: center; }
    .header-title { color: #ffffff; font-size: 20px; font-weight: 700; margin: 0; letter-spacing: -0.3px; }
    .header-sub { color: rgba(255,255,255,0.4); font-size: 12px; margin: 4px 0 0; text-transform: uppercase; letter-spacing: 1px; }
    .body { padding: 40px; }
    .body p { color: #374151; font-size: 15px; line-height: 1.7; margin: 0 0 16px; }
    .cta { display: block; margin: 32px auto; width: fit-content; background: #F97316; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600; }
    .footer { padding: 24px 40px; border-top: 1px solid #f0f0f0; text-align: center; }
    .footer p { color: #9ca3af; font-size: 12px; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <p class="header-title">Bralto</p>
      <p class="header-sub">Marketing Digital &amp; Tecnología</p>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Bralto · NEXT MOVE DIGITAL LLC · cs@bralto.io</p>
    </div>
  </div>
</body>
</html>`
}

interface ContractEmailParams {
  clienteName: string
  empresa: string
  contractUrl: string
}

export function emailContractSent({ clienteName, empresa, contractUrl }: ContractEmailParams): EmailResult {
  return {
    subject: `Tu contrato de servicios Bralto está listo para firmar — ${empresa}`,
    html: baseTemplate(`
      <p>Hola <strong>${clienteName}</strong>,</p>
      <p>Tu contrato de servicios con <strong>Bralto</strong> para <strong>${empresa}</strong> ya está listo para tu revisión y firma.</p>
      <p>Podés firmarlo de forma digital haciendo clic en el siguiente enlace:</p>
      <a href="${contractUrl}" class="cta">Revisar y firmar contrato</a>
      <p style="font-size:13px;color:#6b7280;">Si el botón no funciona, copiá este enlace en tu navegador:<br/><a href="${contractUrl}" style="color:#F97316;">${contractUrl}</a></p>
      <p>Si tenés alguna consulta, no dudes en escribirnos a <a href="mailto:cs@bralto.io" style="color:#F97316;">cs@bralto.io</a>.</p>
    `),
  }
}

interface ContractSignedEmailParams {
  clienteName: string
  empresa: string
  contractUrl: string
  signedAt: string
}

export function emailContractSigned({ clienteName, empresa, contractUrl, signedAt }: ContractSignedEmailParams): EmailResult {
  return {
    subject: `Contrato firmado — ${empresa}`,
    html: baseTemplate(`
      <p>Hola <strong>${clienteName}</strong>,</p>
      <p>Confirmamos que tu contrato de servicios con <strong>Bralto</strong> para <strong>${empresa}</strong> ha sido firmado exitosamente el <strong>${signedAt}</strong>.</p>
      <p>Podés acceder a tu copia del contrato en cualquier momento:</p>
      <a href="${contractUrl}" class="cta">Ver mi contrato</a>
      <p>Nuestro equipo estará en contacto contigo próximamente para dar inicio al proyecto. ¡Bienvenido a bordo! 🚀</p>
      <p>Cualquier consulta, escribinos a <a href="mailto:cs@bralto.io" style="color:#F97316;">cs@bralto.io</a>.</p>
    `),
  }
}

export function emailContractReminder({ clienteName, empresa, contractUrl }: ContractEmailParams): EmailResult {
  return {
    subject: `Recordatorio: tu contrato de servicios Bralto está pendiente de firma — ${empresa}`,
    html: baseTemplate(`
      <p>Hola <strong>${clienteName}</strong>,</p>
      <p>Te recordamos que tu contrato de servicios con <strong>Bralto</strong> para <strong>${empresa}</strong> está pendiente de firma.</p>
      <p>Podés firmarlo de forma rápida y segura haciendo clic aquí:</p>
      <a href="${contractUrl}" class="cta">Firmar mi contrato</a>
      <p style="font-size:13px;color:#6b7280;">Si ya lo firmaste o tenés alguna consulta, escribinos a <a href="mailto:cs@bralto.io" style="color:#F97316;">cs@bralto.io</a>.</p>
    `),
  }
}
