'use client'

import { useState, useMemo, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import type { SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Link2, Save } from 'lucide-react'
import { contractDataSchema, type ContractDataInput } from '@/lib/contracts/schema'
import { numberToWords } from '@/lib/contracts/number-words'
import type { ClientRow, ContractRow } from '@/types/contracts'
import { ClientSelector } from './client-selector'
import { ServicesSection } from './services-section'
import { DeliverablesTable } from './deliverables-table'

// Debounce helper for preview API calls
let previewTimer: ReturnType<typeof setTimeout> | null = null

async function fetchPreview(data: ContractDataInput): Promise<string> {
  const res = await fetch('/api/contracts/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  })
  if (!res.ok) return ''
  const { html } = await res.json()
  return html ?? ''
}

const VIGENCIA_PRESETS = [
  { label: '1 año', numero: '1 año', texto: 'un (1) año' },
  { label: '6 meses', numero: '6 meses', texto: 'seis (6) meses' },
  { label: 'Servicio único', numero: 'servicio único', texto: 'servicio único (pago único)' },
  { label: 'Otro...', numero: '', texto: '' },
]

const DEFAULT_VALUES: Partial<ContractDataInput> = {
  cliente: {
    empresa_nombre: '',
    tipo_sociedad: 'Sociedad Anónima',
    cedula_juridica: '',
    domicilio_legal: '',
    jurisdiccion: 'costarricense',
    giro_comercial: '',
    representante_nombre: '',
    representante_profesion: '',
    representante_estado_civil: 'soltero(a)',
    representante_direccion: '',
    representante_documento: '',
    representante_cargo: 'Apoderado Generalísimo sin límite de suma',
    correo_facturacion: '',
    correo_notificaciones: '',
  },
  proyecto: {
    nombre_paquete: '',
    vigencia_numero: '1 año',
    vigencia_texto: 'un (1) año',
    tiene_referencias_visuales: false,
  },
  pago: {
    monto_inicial: undefined as unknown as number,
    monto_inicial_letras: '',
    tiene_mensualidad: false,
    monto_mensual: null,
    monto_mensual_letras: null,
  },
  servicios: {
    ads: false, sistema_llamadas_ia: false, agente_whatsapp: false,
    sitio_web: false, crm_plataforma: false, automatizaciones: false,
    produccion_contenido: false, gestion_redes: false, seo: false,
    tracking: false, email_marketing: false, agente_servicio_cliente: false,
    activaciones_tienda: false, otros: false,
  },
  entregables: [],
}

interface Props {
  clients: ClientRow[]
  initialData?: Partial<ContractRow>
}

export function ContractForm({ clients, initialData }: Props) {
  const router = useRouter()
  const [selectedClientId, setSelectedClientId] = useState<string | null>(
    initialData?.client_id ?? null,
  )
  const [previewHtml, setPreviewHtml] = useState<string>('')
  const [showPreview, setShowPreview] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [publicUrl, setPublicUrl] = useState<string | null>(null)
  const [customVigencia, setCustomVigencia] = useState(false)

  const form = useForm<ContractDataInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(contractDataSchema) as any,
    defaultValues: initialData
      ? { ...DEFAULT_VALUES, ...initialData.data }
      : DEFAULT_VALUES as ContractDataInput,
    mode: 'onBlur',
  })

  const { register, watch, setValue, handleSubmit, formState: { errors } } = form

  const watchedData = watch()
  const tieneMensualidad = watch('pago.tiene_mensualidad')

  // Regenerate preview on any form change (debounced 600ms)
  const refreshPreview = useCallback(() => {
    if (previewTimer) clearTimeout(previewTimer)
    previewTimer = setTimeout(async () => {
      const html = await fetchPreview(watchedData as ContractDataInput)
      if (html) setPreviewHtml(html)
    }, 600)
  }, [watchedData])

  useMemo(() => { refreshPreview() }, [refreshPreview])

  const saveDraft = async () => {
    setSaving(true)
    try {
      const data = form.getValues()
      const url = initialData?.id ? `/api/contracts/${initialData.id}` : '/api/contracts'
      const method = initialData?.id ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, client_id: selectedClientId, draft: true }),
      })
      if (res.ok) {
        const { contract } = await res.json()
        if (!initialData?.id) router.push(`/contratos/${contract.id}`)
      }
    } catch { /* silent */ } finally {
      setSaving(false)
    }
  }

  const sendContract: SubmitHandler<ContractDataInput> = async (data) => {
    setSendError(null)
    try {
      let contractId: string
      setSaving(true)
      if (!initialData?.id) {
        const res = await fetch('/api/contracts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data, client_id: selectedClientId }),
        })
        setSaving(false)
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          setSendError(body.error ?? `Error al guardar (${res.status})`)
          return
        }
        const { contract } = await res.json()
        contractId = contract.id
      } else {
        const res = await fetch(`/api/contracts/${initialData.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data, client_id: selectedClientId }),
        })
        setSaving(false)
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          setSendError(body.error ?? `Error al guardar (${res.status})`)
          return
        }
        contractId = initialData.id
      }

      setSending(true)
      const sendRes = await fetch(`/api/contracts/${contractId}/send`, { method: 'POST' })
      setSending(false)
      if (sendRes.ok) {
        const { publicUrl: url } = await sendRes.json()
        setPublicUrl(url)
        if (!initialData?.id) router.push(`/contratos/${contractId}`)
      } else {
        const body = await sendRes.json().catch(() => ({}))
        setSendError(body.error ?? `Error al enviar (${sendRes.status})`)
      }
    } catch {
      setSaving(false)
      setSending(false)
      setSendError('Error de red. Verificá tu conexión.')
    }
  }

  const fieldClass =
    'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-orange-500/60 focus:ring-1 focus:ring-orange-500/30 transition-colors'
  const labelClass = 'block text-xs text-white/50 mb-1.5'
  const errorClass = 'text-red-400 text-xs mt-1'
  const sectionClass = 'bg-[#111111] rounded-xl p-5 space-y-4'
  const sectionTitle = 'text-sm font-semibold text-white mb-4 flex items-center gap-2'

  return (
    <div className="flex gap-0 h-full">
      {/* ── Form panel ───────────────────────────────────────────── */}
      <div id="form-scroll-panel" className={`flex-1 overflow-y-auto pb-24 ${showPreview ? 'hidden md:block md:max-w-[55%]' : 'max-w-full'}`}>
        <form
          onSubmit={handleSubmit(saveDraft)}
          className="p-6 space-y-5"
          onChange={() => setTimeout(refreshPreview, 100)}
        >
          {/* 1. CLIENTE */}
          <section className={sectionClass}>
            <h2 className={sectionTitle}>
              <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 text-xs flex items-center justify-center font-bold">1</span>
              Cliente
            </h2>
            <ClientSelector
              form={form}
              clients={clients}
              selectedClientId={selectedClientId}
              onClientSelect={setSelectedClientId}
            />
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="col-span-2">
                <label className={labelClass}>Nombre de empresa *</label>
                <input {...register('cliente.empresa_nombre')} className={fieldClass} placeholder="American Outlet S.A." />
                {errors.cliente?.empresa_nombre && <p className={errorClass}>{errors.cliente.empresa_nombre.message}</p>}
              </div>
              <div>
                <label className={labelClass}>Tipo de sociedad *</label>
                <select {...register('cliente.tipo_sociedad')} className={fieldClass}>
                  {['Sociedad Anónima', 'S.R.L.', 'LLC', 'E.I.R.L.', 'Persona Física', 'Otra'].map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Cédula jurídica *</label>
                <input {...register('cliente.cedula_juridica')} className={fieldClass} placeholder="3-101-123456" />
                {errors.cliente?.cedula_juridica && <p className={errorClass}>{errors.cliente.cedula_juridica.message}</p>}
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Domicilio legal *</label>
                <input {...register('cliente.domicilio_legal')} className={fieldClass} placeholder="San José, Costa Rica, Avenida Central..." />
              </div>
              <div>
                <label className={labelClass}>Jurisdicción</label>
                <input {...register('cliente.jurisdiccion')} className={fieldClass} defaultValue="costarricense" />
              </div>
              <div>
                <label className={labelClass}>Giro comercial *</label>
                <input {...register('cliente.giro_comercial')} className={fieldClass} placeholder="venta al detalle..." />
              </div>
              <div>
                <label className={labelClass}>Representante legal *</label>
                <input {...register('cliente.representante_nombre')} className={fieldClass} placeholder="Juan Pérez Mora" />
              </div>
              <div>
                <label className={labelClass}>Profesión</label>
                <input {...register('cliente.representante_profesion')} className={fieldClass} placeholder="empresario" />
              </div>
              <div>
                <label className={labelClass}>Estado civil</label>
                <select {...register('cliente.representante_estado_civil')} className={fieldClass}>
                  {['soltero(a)', 'casado(a)', 'divorciado(a)', 'viudo(a)', 'unión libre'].map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Documento de identidad *</label>
                <input {...register('cliente.representante_documento')} className={fieldClass} placeholder="1-1234-5678" />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Dirección del representante</label>
                <input {...register('cliente.representante_direccion')} className={fieldClass} placeholder="San José..." />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Cargo del representante</label>
                <input {...register('cliente.representante_cargo')} className={fieldClass} />
              </div>
              <div>
                <label className={labelClass}>Correo de facturación *</label>
                <input {...register('cliente.correo_facturacion')} type="email" className={fieldClass} placeholder="contabilidad@empresa.com" />
                {errors.cliente?.correo_facturacion && <p className={errorClass}>{errors.cliente.correo_facturacion.message}</p>}
              </div>
              <div>
                <label className={labelClass}>Correo de notificaciones *</label>
                <input {...register('cliente.correo_notificaciones')} type="email" className={fieldClass} placeholder="gerencia@empresa.com" />
                {errors.cliente?.correo_notificaciones && <p className={errorClass}>{errors.cliente.correo_notificaciones.message}</p>}
              </div>
            </div>
          </section>

          {/* 2. PROYECTO */}
          <section className={sectionClass}>
            <h2 className={sectionTitle}>
              <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 text-xs flex items-center justify-center font-bold">2</span>
              Proyecto
            </h2>
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Nombre del paquete *</label>
                <input {...register('proyecto.nombre_paquete')} className={fieldClass} placeholder='Paquete Retail 360' />
                {errors.proyecto?.nombre_paquete && <p className={errorClass}>{errors.proyecto.nombre_paquete.message}</p>}
              </div>
              <div>
                <label className={labelClass}>Vigencia</label>
                <select
                  className={fieldClass}
                  onChange={(e) => {
                    const preset = VIGENCIA_PRESETS.find((p) => p.label === e.target.value)
                    if (preset && preset.numero) {
                      setValue('proyecto.vigencia_numero', preset.numero)
                      setValue('proyecto.vigencia_texto', preset.texto)
                      setCustomVigencia(false)
                    } else {
                      setCustomVigencia(true)
                    }
                  }}
                  defaultValue="1 año"
                >
                  {VIGENCIA_PRESETS.map((p) => (
                    <option key={p.label} value={p.label}>{p.label}</option>
                  ))}
                </select>
              </div>
              {customVigencia && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Número (ej: &quot;2 años&quot;)</label>
                    <input {...register('proyecto.vigencia_numero')} className={fieldClass} placeholder="2 años" />
                  </div>
                  <div>
                    <label className={labelClass}>Texto legal (ej: &quot;dos (2) años&quot;)</label>
                    <input {...register('proyecto.vigencia_texto')} className={fieldClass} placeholder="dos (2) años" />
                  </div>
                </div>
              )}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('proyecto.tiene_referencias_visuales')}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-orange-500 focus:ring-orange-500/30 focus:ring-offset-0"
                />
                <span className="text-sm text-white/70">Incluye referencias visuales como anexo</span>
              </label>
            </div>
          </section>

          {/* 3. SERVICIOS */}
          <section className={sectionClass}>
            <h2 className={sectionTitle}>
              <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 text-xs flex items-center justify-center font-bold">3</span>
              Servicios activados
            </h2>
            <ServicesSection form={form} />
          </section>

          {/* 4. ENTREGABLES */}
          <section className={sectionClass}>
            <h2 className={sectionTitle}>
              <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 text-xs flex items-center justify-center font-bold">4</span>
              Entregables <span className="text-white/30 font-normal text-xs">(opcional)</span>
            </h2>
            <DeliverablesTable form={form} />
          </section>

          {/* 5. PRECIO */}
          <section className={sectionClass}>
            <h2 className={sectionTitle}>
              <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 text-xs flex items-center justify-center font-bold">5</span>
              Precio y pago
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Monto inicial (USD) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    {...register('pago.monto_inicial', {
                      valueAsNumber: true,
                      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                        const val = parseFloat(e.target.value)
                        setValue('pago.monto_inicial_letras', !isNaN(val) && val > 0 ? numberToWords(val) : '')
                      },
                    })}
                    className={fieldClass}
                    placeholder="3500"
                  />
                  {errors.pago?.monto_inicial && <p className={errorClass}>{errors.pago.monto_inicial.message}</p>}
                </div>
                <div>
                  <label className={labelClass}>En letras (auto)</label>
                  <input
                    {...register('pago.monto_inicial_letras')}
                    readOnly
                    className={`${fieldClass} opacity-60 cursor-default`}
                    placeholder="tres mil quinientos"
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('pago.tiene_mensualidad')}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-orange-500 focus:ring-orange-500/30 focus:ring-offset-0"
                />
                <span className="text-sm text-white/70">Incluye mensualidad</span>
              </label>

              {tieneMensualidad && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Monto mensual (USD)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      {...register('pago.monto_mensual', {
                        valueAsNumber: true,
                        onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                          const val = parseFloat(e.target.value)
                          setValue('pago.monto_mensual_letras', !isNaN(val) && val > 0 ? numberToWords(val) : null)
                        },
                      })}
                      className={fieldClass}
                      placeholder="750"
                    />
                    {errors.pago?.monto_mensual && <p className={errorClass}>{errors.pago.monto_mensual.message}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>En letras (auto)</label>
                    <input
                      {...register('pago.monto_mensual_letras')}
                      readOnly
                      className={`${fieldClass} opacity-60 cursor-default`}
                      placeholder="setecientos cincuenta"
                    />
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* 6. ENLACE DE PAGO */}
          <section className={sectionClass}>
            <h2 className={sectionTitle}>
              <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 text-xs flex items-center justify-center font-bold">6</span>
              Enlace de pago <span className="text-white/30 font-normal text-xs">(opcional)</span>
            </h2>
            <div>
              <label className={labelClass}>URL de pago (Stripe, etc.)</label>
              <input
                {...register('payment_link')}
                type="url"
                className={fieldClass}
                placeholder="https://buy.stripe.com/..."
              />
              <p className="text-xs text-white/30 mt-1.5">Si se completa, el cliente será redirigido aquí después de firmar.</p>
              {errors.payment_link && <p className={errorClass}>{errors.payment_link.message}</p>}
            </div>
          </section>
        </form>

        {/* ── Sticky bottom bar ────────────────────────────────── */}
        <div className="fixed bottom-0 left-0 md:left-56 right-0 bg-[#0d0d0d]/95 backdrop-blur border-t border-white/[0.06] px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-3 z-30">
          {publicUrl ? (
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Link2 size={14} className="text-green-400 shrink-0" />
              <span className="text-sm text-white/60 truncate">Enlace generado:</span>
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-orange-400 hover:text-orange-300 truncate"
              >
                {publicUrl}
              </a>
              <button
                onClick={() => navigator.clipboard.writeText(publicUrl)}
                className="text-xs text-white/40 hover:text-white/70 shrink-0 px-2 py-1 border border-white/10 rounded"
              >
                Copiar
              </button>
            </div>
          ) : (
            <div className="flex-1" />
          )}

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setShowPreview((v) => !v)}
              className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors"
            >
              {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
              {showPreview ? 'Ocultar preview' : 'Ver preview'}
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={saveDraft}
              className="flex items-center gap-2 px-4 py-2 text-sm border border-white/15 text-white/70 hover:border-white/30 hover:text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Save size={14} />
              {saving ? 'Guardando...' : 'Guardar borrador'}
            </button>

            <div className="flex flex-col items-end gap-1">
              <button
                type="button"
                disabled={saving || sending}
                onClick={handleSubmit(sendContract, (errs) => {
                document.getElementById('form-scroll-panel')?.scrollTo({ top: 0, behavior: 'smooth' })
                const sections: string[] = []
                if (errs.cliente) sections.push('Cliente')
                if (errs.proyecto) sections.push('Proyecto')
                if (errs.pago) sections.push('Precio')
                if (errs.servicios) sections.push('Servicios')
                if (errs.payment_link) sections.push('Enlace de pago')
                setSendError(sections.length ? `Campos incompletos: ${sections.join(', ')}` : 'Revisá el formulario antes de continuar.')
              })}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-orange-500 hover:bg-orange-400 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                <Link2 size={14} />
                {saving ? 'Guardando...' : sending ? 'Enviando...' : 'Firmar y enviar'}
              </button>
              {sendError && <p className="text-xs text-red-400 max-w-[200px] text-right">{sendError}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* ── Live preview panel ───────────────────────────────────── */}
      {showPreview && (
        <div className="flex-1 md:w-[45%] md:flex-none border-l border-white/[0.06] overflow-y-auto bg-[#0a0a0a]">
          <div className="sticky top-0 bg-[#0a0a0a] px-4 py-3 border-b border-white/[0.04] flex items-center justify-between z-10">
            <span className="text-xs text-white/30 font-medium uppercase tracking-wider">Vista previa</span>
            <span className="text-xs text-white/20">Se actualiza automáticamente</span>
          </div>
          <div className="p-6">
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-none">
              <div
                className="prose prose-sm max-w-none contract-preview"
                dangerouslySetInnerHTML={{ __html: previewHtml || '<p class="text-gray-400">Completá el formulario para ver la vista previa del contrato.</p>' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
