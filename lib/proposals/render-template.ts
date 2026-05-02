import fs from 'fs'
import path from 'path'
import type { ProposalRequest } from '@/types/proposals'
import { BRALTO_SERVICES, BUDGET_LABELS, TIMELINE_LABELS } from '@/types/proposals'

const ADMIN_URL = 'https://admin.bralto.io'

function escapeHtml(str: string) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function buildAcceptModal(proposal: ProposalRequest): string {
  const acceptUrl = `${ADMIN_URL}/api/proposals/${proposal.id}/accept`
  const preName    = escapeHtml(proposal.client_name)
  const preEmail   = escapeHtml(proposal.client_email    ?? '')
  const prePhone   = escapeHtml(proposal.client_phone    ?? '')
  const preCompany = escapeHtml(proposal.client_company  ?? '')

  return `
<!-- BRALTO ACCEPT MODAL — auto-injected -->
<div id="b-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.55);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);z-index:9999;align-items:center;justify-content:center;padding:20px;font-family:'Sora',sans-serif">
  <div style="background:#fff;border-radius:24px;padding:40px;max-width:480px;width:100%;position:relative;box-shadow:0 32px 80px rgba(0,0,0,0.2)">
    <button onclick="document.getElementById('b-overlay').style.display='none'" style="position:absolute;top:14px;right:14px;width:32px;height:32px;border:none;background:rgba(0,0,0,0.06);border-radius:50%;cursor:pointer;font-size:20px;line-height:1;color:#666;display:flex;align-items:center;justify-content:center">&times;</button>

    <div id="b-form-wrap">
      <div style="display:inline-flex;align-items:center;gap:6px;padding:5px 14px;background:rgba(255,107,43,0.08);border:1px solid rgba(255,107,43,0.2);border-radius:100px;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#ff6b2b;margin-bottom:18px">
        <span style="width:6px;height:6px;border-radius:50%;background:#ff6b2b;display:inline-block"></span>
        Confirmar aceptación
      </div>
      <h2 style="font-size:22px;font-weight:800;color:#0a0a0a;margin:0 0 8px;line-height:1.2">¡Excelente decisión!</h2>
      <p style="color:#666;font-size:14px;font-weight:300;line-height:1.6;margin:0 0 28px">Confirma tus datos y nuestro equipo se pondrá en contacto contigo de inmediato.</p>

      <form id="b-form" style="display:flex;flex-direction:column;gap:14px">
        <div>
          <label style="display:block;font-size:12px;font-weight:600;color:#0a0a0a;margin-bottom:6px">Nombre completo *</label>
          <input type="text" name="name" required value="${preName}" placeholder="Tu nombre completo" style="width:100%;padding:12px 16px;border:1.5px solid rgba(0,0,0,0.1);border-radius:10px;font-size:14px;font-family:'Sora',sans-serif;outline:none;box-sizing:border-box;transition:border-color .2s" onfocus="this.style.borderColor='#ff6b2b'" onblur="this.style.borderColor='rgba(0,0,0,0.1)'">
        </div>
        <div>
          <label style="display:block;font-size:12px;font-weight:600;color:#0a0a0a;margin-bottom:6px">Correo electrónico *</label>
          <input type="email" name="email" required value="${preEmail}" placeholder="tu@empresa.com" style="width:100%;padding:12px 16px;border:1.5px solid rgba(0,0,0,0.1);border-radius:10px;font-size:14px;font-family:'Sora',sans-serif;outline:none;box-sizing:border-box;transition:border-color .2s" onfocus="this.style.borderColor='#ff6b2b'" onblur="this.style.borderColor='rgba(0,0,0,0.1)'">
        </div>
        <div>
          <label style="display:block;font-size:12px;font-weight:600;color:#0a0a0a;margin-bottom:6px">Teléfono</label>
          <input type="tel" name="phone" value="${prePhone}" placeholder="+506 0000-0000" style="width:100%;padding:12px 16px;border:1.5px solid rgba(0,0,0,0.1);border-radius:10px;font-size:14px;font-family:'Sora',sans-serif;outline:none;box-sizing:border-box;transition:border-color .2s" onfocus="this.style.borderColor='#ff6b2b'" onblur="this.style.borderColor='rgba(0,0,0,0.1)'">
        </div>
        <div>
          <label style="display:block;font-size:12px;font-weight:600;color:#0a0a0a;margin-bottom:6px">Empresa</label>
          <input type="text" name="company" value="${preCompany}" placeholder="Nombre de tu empresa" style="width:100%;padding:12px 16px;border:1.5px solid rgba(0,0,0,0.1);border-radius:10px;font-size:14px;font-family:'Sora',sans-serif;outline:none;box-sizing:border-box;transition:border-color .2s" onfocus="this.style.borderColor='#ff6b2b'" onblur="this.style.borderColor='rgba(0,0,0,0.1)'">
        </div>
        <button type="submit" id="b-submit" style="margin-top:4px;padding:15px;background:#ff6b2b;color:white;border:none;border-radius:12px;font-size:15px;font-weight:700;font-family:'Sora',sans-serif;cursor:pointer;transition:opacity .15s">
          Confirmar y aceptar propuesta →
        </button>
        <p id="b-error" style="display:none;color:#e74c3c;font-size:13px;text-align:center;margin:0"></p>
      </form>
    </div>

    <div id="b-success" style="display:none;text-align:center;padding:16px 0">
      <div style="width:68px;height:68px;background:rgba(255,107,43,0.1);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:32px">🎉</div>
      <h3 style="font-size:21px;font-weight:800;color:#0a0a0a;margin:0 0 12px">¡Propuesta aceptada!</h3>
      <p style="color:#666;font-size:14px;font-weight:300;line-height:1.7;margin:0">Te enviamos un correo de confirmación. Nuestro equipo se pondrá en contacto contigo muy pronto para dar el siguiente paso.</p>
    </div>
  </div>
</div>

<script>
(function(){
  var ACCEPT_URL='${acceptUrl}';

  function openAccept(){document.getElementById('b-overlay').style.display='flex'}
  window.braltoOpenAccept=openAccept;

  // Close on backdrop click
  document.getElementById('b-overlay').addEventListener('click',function(e){
    if(e.target===this)this.style.display='none';
  });

  // Auto-wire buttons by text content or common selectors
  function wire(){
    var targets=document.querySelectorAll('.accept-btn,[data-bralto-accept],#bralto-cta,#accept-proposal-btn');
    targets.forEach(function(el){el.addEventListener('click',function(e){e.preventDefault();openAccept();});});
    document.querySelectorAll('a,button').forEach(function(el){
      if(/aceptar/i.test(el.textContent||'')){
        el.addEventListener('click',function(e){e.preventDefault();openAccept();});
      }
    });
  }
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',wire);}else{wire();}

  // Form submit
  document.addEventListener('DOMContentLoaded',function(){
    var form=document.getElementById('b-form');
    if(!form)return;
    form.addEventListener('submit',function(e){
      e.preventDefault();
      var btn=document.getElementById('b-submit');
      var err=document.getElementById('b-error');
      btn.disabled=true;btn.textContent='Enviando...';err.style.display='none';
      var data={};
      new FormData(form).forEach(function(v,k){data[k]=v;});
      fetch(ACCEPT_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})
        .then(function(r){
          if(r.ok){
            document.getElementById('b-form-wrap').style.display='none';
            document.getElementById('b-success').style.display='block';
          } else {
            btn.disabled=false;btn.textContent='Confirmar y aceptar propuesta →';
            err.textContent='Hubo un error. Por favor intenta de nuevo.';err.style.display='block';
          }
        })
        .catch(function(){
          btn.disabled=false;btn.textContent='Confirmar y aceptar propuesta →';
          err.textContent='Error de conexión. Por favor intenta de nuevo.';err.style.display='block';
        });
    });
  });
})();
</script>
`
}

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

  // 2. Etiquetas de servicios seleccionados
  const serviceLabels = proposal.services.map((id) => {
    const svc = BRALTO_SERVICES.find((s) => s.id === id)
    return svc?.label ?? id
  })

  // 3. Reemplazar todos los placeholders
  const company = proposal.client_company ?? proposal.client_name
  const companySlug = company
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')

  const values: Record<string, string> = {
    CLIENT_NAME:           proposal.client_name,
    CLIENT_COMPANY:        proposal.client_company  ?? '',
    CLIENT_INDUSTRY:       proposal.client_industry ?? '',
    CLIENT_EMAIL:          proposal.client_email    ?? '',
    CLIENT_PHONE:          proposal.client_phone    ?? '',
    PROPOSAL_DATE:         proposalDate,
    EXPIRY_DATE:           expiryDate,
    BUDGET_LABEL:          BUDGET_LABELS[proposal.budget_range],
    TIMELINE_LABEL:        TIMELINE_LABELS[proposal.timeline],
    NOTES:                 proposal.notes           ?? '',
    SERVICES_COUNT:        String(proposal.services.length),
    SERVICES_LIST:         serviceLabels.join(', '),
    COMPANY_INITIAL:       company.charAt(0).toUpperCase(),
    CLIENT_COMPANY_SLUG:   companySlug,
    CLIENT_INDUSTRY_LOWER: (proposal.client_industry ?? '').toLowerCase(),
  }

  for (const [key, value] of Object.entries(values)) {
    html = html.replaceAll(`{{${key}}}`, value)
  }

  // 4. Inyectar modal de aceptación antes de </body>
  const modal = buildAcceptModal(proposal)
  if (html.includes('</body>')) {
    html = html.replace('</body>', `${modal}</body>`)
  } else {
    html += modal
  }

  return html
}
