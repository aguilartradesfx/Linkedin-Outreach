import { createClient } from '@/lib/supabase/server'
import { loadTemplate, renderContractMarkdown } from '@/lib/contracts/render'
import { marked } from 'marked'
import type { ContractRow } from '@/types/contracts'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response('No autorizado', { status: 401 })
  }

  const { data: contract } = await supabase
    .from('contracts')
    .select('*')
    .eq('id', id)
    .single()

  if (!contract) return new Response('No encontrado', { status: 404 })

  const c = contract as ContractRow

  const clientSig = c.signature_client_data ?? null
  const braltoSig = c.signature_bralto_data ?? null
  const clientTs = c.signature_client_timestamp
    ? new Date(c.signature_client_timestamp).toLocaleString('es-CR', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZone: 'America/Costa_Rica',
      })
    : null
  const braltoTs = c.signature_bralto_timestamp
    ? new Date(c.signature_bralto_timestamp).toLocaleString('es-CR', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZone: 'America/Costa_Rica',
      })
    : null

  const dataWithFirma = {
    ...c.data,
    firma: {
      ...(c.data?.firma ?? {}),
      cliente_canvas: clientSig,
      cliente_timestamp: c.signature_client_timestamp ?? null,
      bralto_canvas: braltoSig,
      bralto_timestamp: c.signature_bralto_timestamp ?? null,
    },
  }

  const templateString = loadTemplate(c.template_version ?? 'v1')
  const markdown = renderContractMarkdown(dataWithFirma, templateString)
  const contractHtml = String(marked.parse(markdown))

  // Footer shown at bottom of every printed page
  const footerSigRow = `
    <table style="width:100%;border-collapse:collapse;border-top:1px solid #ccc;">
      <tr>
        <td style="width:50%;padding:6px 12px;vertical-align:top;border-right:1px solid #eee;">
          <div style="font-size:9px;color:#444;font-weight:700;margin-bottom:4px;">EL CLIENTE — ${c.data?.cliente?.empresa_nombre ?? ''}</div>
          ${clientSig
            ? `<img src="${clientSig}" style="height:36px;max-width:160px;object-fit:contain;display:block;" />`
            : `<div style="border-bottom:1px solid #999;width:140px;height:36px;"></div>`
          }
          ${clientTs ? `<div style="font-size:8px;color:#777;margin-top:2px;">${clientTs}</div>` : ''}
        </td>
        <td style="width:50%;padding:6px 12px;vertical-align:top;">
          <div style="font-size:9px;color:#444;font-weight:700;margin-bottom:4px;">BRALTO — José Alejandro Aguilar</div>
          ${braltoSig
            ? `<img src="${braltoSig}" style="height:36px;max-width:160px;object-fit:contain;display:block;" />`
            : `<div style="border-bottom:1px solid #999;width:140px;height:36px;"></div>`
          }
          ${braltoTs ? `<div style="font-size:8px;color:#777;margin-top:2px;">${braltoTs}</div>` : ''}
        </td>
      </tr>
    </table>`

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Contrato — ${c.data?.cliente?.empresa_nombre ?? id}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: Georgia, "Times New Roman", serif;
      font-size: 13px;
      color: #111;
      background: white;
      padding: 48px 56px 120px; /* bottom padding for footer space */
    }

    h1 { font-size: 15px; font-weight: 700; text-align: center; margin: 20px 0 24px; color: #000; letter-spacing: -0.01em; }
    h2 { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin: 20px 0 10px; color: #000; }
    h3 { font-size: 12px; font-weight: 700; margin: 16px 0 8px; color: #000; }
    p  { font-size: 12px; line-height: 1.8; color: #222; margin-bottom: 10px; text-align: justify; }
    strong { color: #000; font-weight: 700; }
    ul, ol { padding-left: 20px; margin-bottom: 10px; }
    li { font-size: 12px; line-height: 1.8; color: #222; margin-bottom: 3px; }
    hr { border: none; border-top: 1px solid #ddd; margin: 20px 0; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 12px; vertical-align: top; border-top: 1px solid #e5e7eb; font-size: 12px; color: #222; }
    img { max-height: 64px; max-width: 200px; object-fit: contain; display: block; }
    small { font-size: 10px; color: #6b7280; }

    /* Signature footer — fixed at bottom of every printed page */
    .page-footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: white;
    }

    @media print {
      body { padding: 0; }
      @page { margin: 1.5cm 1.5cm 3.5cm; size: A4; }
      .page-footer {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: white;
      }
    }
  </style>
</head>
<body>
  <div>${contractHtml}</div>

  <div class="page-footer">
    ${footerSigRow}
  </div>

  <script>
    window.addEventListener('load', function() {
      setTimeout(function() { window.print(); }, 400);
    });
  </script>
</body>
</html>`

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
