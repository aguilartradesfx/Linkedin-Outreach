'use client'

import { useFieldArray, UseFormReturn } from 'react-hook-form'
import { Plus, Trash2, Sparkles } from 'lucide-react'
import type { ContractDataInput } from '@/lib/contracts/schema'
import { generateDefaultEntregables } from '@/lib/contracts/defaults'

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<ContractDataInput, any, any>
}

export function DeliverablesTable({ form }: Props) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'entregables',
  })

  function handleGenerateDefaults() {
    const servicios = form.getValues('servicios')
    const defaults = generateDefaultEntregables(servicios)
    // Replace existing with defaults
    const current = form.getValues('entregables') ?? []
    defaults.forEach((row) => {
      // Only add if not already present
      const exists = current.some((c) => c.descripcion === row.descripcion)
      if (!exists) append(row)
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/50">
          {fields.length === 0 ? 'Sin entregables definidos' : `${fields.length} entregable(s)`}
        </p>
        <button
          type="button"
          onClick={handleGenerateDefaults}
          className="flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 transition-colors"
        >
          <Sparkles size={12} />
          Generar por defecto
        </button>
      </div>

      {fields.length > 0 && (
        <div className="rounded-lg border border-white/[0.08] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03]">
              <tr>
                <th className="text-left px-3 py-2 text-xs text-white/40 font-medium">Servicio</th>
                <th className="text-left px-3 py-2 text-xs text-white/40 font-medium">Descripción</th>
                <th className="text-left px-3 py-2 text-xs text-white/40 font-medium w-20">Cant.</th>
                <th className="text-left px-3 py-2 text-xs text-white/40 font-medium w-24">Unidad</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {fields.map((field, index) => (
                <tr key={field.id}>
                  <td className="px-3 py-1.5">
                    <input
                      {...form.register(`entregables.${index}.servicio`)}
                      className="w-full bg-transparent text-white/80 text-xs focus:outline-none focus:text-white"
                      placeholder="Servicio"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      {...form.register(`entregables.${index}.descripcion`)}
                      className="w-full bg-transparent text-white/80 text-xs focus:outline-none focus:text-white"
                      placeholder="Descripción del entregable"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      {...form.register(`entregables.${index}.cantidad`)}
                      className="w-full bg-transparent text-white/80 text-xs focus:outline-none focus:text-white"
                      placeholder="—"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      {...form.register(`entregables.${index}.unidad`)}
                      className="w-full bg-transparent text-white/80 text-xs focus:outline-none focus:text-white"
                      placeholder="unidad"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="text-white/20 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button
        type="button"
        onClick={() => append({ servicio: '', descripcion: '', cantidad: null, unidad: null })}
        className="flex items-center gap-2 text-xs text-white/40 hover:text-white/70 transition-colors"
      >
        <Plus size={13} />
        Agregar entregable
      </button>
    </div>
  )
}
