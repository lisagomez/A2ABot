'use client'

import { useMemo, useState } from 'react'
import type { CatalogRow, ClienteFinal, ProjectTemplate } from '../types'
import { buildPreview } from '../data/templates'
import { ConversationPreview } from './ConversationPreview'

interface Props {
  template: ProjectTemplate
  cliente: ClienteFinal
  onClose: () => void
  onSave: (patch: Pick<ClienteFinal, 'nombre' | 'variables' | 'catalogos'>) => void
}

export function ClienteFinalEditor({ template, cliente, onClose, onSave }: Props) {
  const [nombre, setNombre] = useState(cliente.nombre)
  const [variables, setVariables] = useState<Record<string, string>>(cliente.variables ?? {})
  const [catalogos, setCatalogos] = useState<Record<string, CatalogRow[]>>(
    cliente.catalogos ?? {}
  )

  const previewTurns = useMemo(
    () => buildPreview(template.key, { ...cliente, nombre, variables, catalogos }),
    [template.key, cliente, nombre, variables, catalogos]
  )

  function setVar(key: string, value: string) {
    setVariables((prev) => ({ ...prev, [key]: value }))
  }

  function getRows(catKey: string): CatalogRow[] {
    return catalogos[catKey] ?? []
  }

  function addRow(catKey: string) {
    setCatalogos((prev) => ({ ...prev, [catKey]: [...(prev[catKey] ?? []), {}] }))
  }

  function setCell(catKey: string, idx: number, colKey: string, value: string) {
    setCatalogos((prev) => {
      const rowsCopy = [...(prev[catKey] ?? [])]
      rowsCopy[idx] = { ...rowsCopy[idx], [colKey]: value }
      return { ...prev, [catKey]: rowsCopy }
    })
  }

  function removeRow(catKey: string, idx: number) {
    setCatalogos((prev) => ({
      ...prev,
      [catKey]: (prev[catKey] ?? []).filter((_, i) => i !== idx),
    }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Personalizar Cliente Final</h2>
            <p className="text-xs text-gray-500">
              Plantilla: {template.nombre} · rellena variables y catálogos
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700" aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-0 overflow-hidden md:grid-cols-2">
          {/* Formulario */}
          <div className="space-y-6 overflow-y-auto border-r border-gray-100 px-6 py-5">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nombre del Cliente Final</label>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              />
            </div>

            {template.variables.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Variables de marca
                </h3>
                {template.variables.map((variable) => (
                  <div key={variable.key}>
                    <label className="block text-sm font-medium text-gray-700">
                      {variable.label}
                      {variable.opcional && (
                        <span className="ml-1 text-[10px] font-normal text-gray-400">opcional</span>
                      )}
                    </label>
                    <input
                      value={variables[variable.key] ?? ''}
                      onChange={(e) => setVar(variable.key, e.target.value)}
                      placeholder={variable.placeholder}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                    />
                  </div>
                ))}
              </div>
            )}

            {template.catalogos.map((cat) => (
              <div key={cat.key} className="space-y-2">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {cat.label}
                  </h3>
                  <p className="text-xs text-gray-400">{cat.descripcion}</p>
                </div>
                <div className="space-y-2">
                  {getRows(cat.key).map((row, idx) => (
                    <div key={idx} className="flex items-start gap-1.5">
                      <div className="grid flex-1 gap-1.5" style={{ gridTemplateColumns: `repeat(${cat.columnas.length}, minmax(0,1fr))` }}>
                        {cat.columnas.map((col) => (
                          <input
                            key={col.key}
                            value={row[col.key] ?? ''}
                            onChange={(e) => setCell(cat.key, idx, col.key, e.target.value)}
                            placeholder={col.placeholder}
                            inputMode={col.tipo === 'number' ? 'numeric' : 'text'}
                            className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                          />
                        ))}
                      </div>
                      <button
                        onClick={() => removeRow(cat.key, idx)}
                        className="mt-1 text-xs text-gray-300 hover:text-red-500"
                        aria-label="Quitar fila"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => addRow(cat.key)}
                    className="rounded-md border border-dashed border-gray-300 px-3 py-1.5 text-xs text-gray-500 hover:border-gray-900 hover:text-gray-900"
                  >
                    + Añadir {cat.label.toLowerCase()}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Preview en vivo */}
          <div className="overflow-y-auto bg-gray-50 px-6 py-5">
            <ConversationPreview turns={previewTurns} />
            <p className="mt-3 text-xs text-gray-400">
              La conversación se actualiza con lo que escribes. Es el mismo flujo que verán los
              usuarios del Cliente Final.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-6 py-4">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:text-gray-900">
            Cancelar
          </button>
          <button
            onClick={() => onSave({ nombre, variables, catalogos })}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}
