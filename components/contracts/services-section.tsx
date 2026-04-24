'use client'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { UseFormReturn } from 'react-hook-form'
import type { ContractDataInput } from '@/lib/contracts/schema'

const SERVICE_GROUPS = [
  {
    label: 'Publicidad y adquisición',
    services: [
      { key: 'ads', label: 'Gestión de Campañas Publicitarias (Meta / Google / TikTok)' },
      { key: 'seo', label: 'SEO y Posicionamiento' },
      { key: 'tracking', label: 'Configuración de Tracking (GTM / GA4 / Pixel)' },
    ],
  },
  {
    label: 'IA y automatización',
    services: [
      { key: 'sistema_llamadas_ia', label: 'Sistema de Llamadas con IA (entrantes/salientes)' },
      { key: 'agente_whatsapp', label: 'Agente de WhatsApp con IA' },
      { key: 'agente_servicio_cliente', label: 'Agente de IA para Servicio al Cliente' },
      { key: 'automatizaciones', label: 'Automatizaciones e Integraciones' },
      { key: 'crm_plataforma', label: 'Configuración de Plataforma Bralto (CRM)' },
    ],
  },
  {
    label: 'Contenido y presencia',
    services: [
      { key: 'produccion_contenido', label: 'Producción de Contenido (flyers, reels, foto, video)' },
      { key: 'gestion_redes', label: 'Gestión y Publicación de Redes Sociales' },
      { key: 'email_marketing', label: 'Email Marketing' },
    ],
  },
  {
    label: 'Desarrollo y experiencia',
    services: [
      { key: 'sitio_web', label: 'Diseño y Desarrollo de Sitio Web' },
      { key: 'activaciones_tienda', label: 'Activaciones en Tienda y Eventos' },
    ],
  },
]

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<ContractDataInput, any, any>
}

export function ServicesSection({ form }: Props) {
  const { register, watch, setValue } = form
  const otros = watch('servicios.otros')

  return (
    <div className="space-y-5">
      {SERVICE_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-2">
            {group.label}
          </p>
          <div className="space-y-1.5">
            {group.services.map(({ key, label }) => (
              <label
                key={key}
                className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white/[0.03] cursor-pointer group"
              >
                <input
                  type="checkbox"
                  {...register(`servicios.${key as keyof ContractDataInput['servicios']}` as never)}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-orange-500 focus:ring-orange-500/30 focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-sm text-white/70 group-hover:text-white/90 transition-colors">
                  {label}
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}

      {/* Otros */}
      <div>
        <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-2">Otros</p>
        <label className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white/[0.03] cursor-pointer group">
          <input
            type="checkbox"
            {...register('servicios.otros')}
            className="w-4 h-4 rounded border-white/20 bg-white/5 text-orange-500 focus:ring-orange-500/30 focus:ring-offset-0 cursor-pointer"
          />
          <span className="text-sm text-white/70 group-hover:text-white/90 transition-colors">
            Otros servicios (especificar)
          </span>
        </label>
        {otros && (
          <textarea
            {...register('servicios.otros_descripcion')}
            rows={3}
            placeholder="Describe los servicios adicionales..."
            className="mt-2 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-orange-500/60 focus:ring-1 focus:ring-orange-500/30 transition-colors resize-none"
          />
        )}
      </div>

      {/* Error display */}
      {form.formState.errors.servicios?.root && (
        <p className="text-red-400 text-xs">{form.formState.errors.servicios.root.message}</p>
      )}
    </div>
  )
}
