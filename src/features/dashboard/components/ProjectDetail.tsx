'use client'

import { useState } from 'react'
import type { ClienteFinal, Project } from '../types'
import { FLOW_STEPS, getTopic } from '../data/topics'
import { getTemplate } from '../data/templates'
import { COMPLEXITY_META } from '../lib/complexity'
import { ClienteFinalEditor } from './ClienteFinalEditor'

interface StoreSlice {
  clientesByProject: (projectId: string) => ClienteFinal[]
  createClienteFinal: (projectId: string, nombre: string) => ClienteFinal
  updateClienteFinal: (
    id: string,
    patch: Partial<Pick<ClienteFinal, 'nombre' | 'variables' | 'catalogos'>>
  ) => void
  deleteClienteFinal: (id: string) => void
}

export function ProjectDetail({
  project,
  store,
  onBack,
}: {
  project: Project
  store: StoreSlice
  onBack: () => void
}) {
  const topic = getTopic(project.temaKey)
  const template = getTemplate(project.templateKey)
  const clientes = store.clientesByProject(project.id)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [nombre, setNombre] = useState('')

  const editing = clientes.find((c) => c.id === editingId) ?? null

  function addCliente() {
    if (!nombre.trim()) return
    const cf = store.createClienteFinal(project.id, nombre)
    setNombre('')
    setAdding(false)
    setEditingId(cf.id)
  }

  function configuradas(c: ClienteFinal) {
    const vars = Object.values(c.variables).filter((x) => x?.trim()).length
    const filas = Object.values(c.catalogos).reduce(
      (acc, rows) => acc + rows.filter((r) => Object.values(r).some((x) => x?.trim())).length,
      0
    )
    return { vars, filas }
  }

  return (
    <div className="space-y-6">
      <div>
        <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-900">
          ← Proyectos
        </button>
        <div className="mt-2 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">{project.nombre}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {topic?.emoji} {topic?.label} · {project.pais}
            </p>
          </div>
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${COMPLEXITY_META[project.complejidad].badge}`}>
            {COMPLEXITY_META[project.complejidad].label}
          </span>
        </div>
      </div>

      {/* Plantilla (Capa 1) */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-900">Plantilla · {template.nombre}</h2>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">
            reutilizable
          </span>
        </div>
        <p className="mt-1 text-xs text-gray-500">{template.descripcion}</p>

        {/* Flujo */}
        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Flujo</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {project.flujo.map((f, i) => (
              <span key={f} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-gray-300">→</span>}
                <span className="rounded-lg bg-gray-100 px-2 py-1 text-xs text-gray-700">
                  {FLOW_STEPS[f].label}
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* Variables + catálogos (huecos a rellenar) */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Variables ({template.variables.length})
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {template.variables.map((v) => (
                <span key={v.key} className="rounded bg-gray-50 px-1.5 py-0.5 text-[11px] text-gray-600 ring-1 ring-gray-200">
                  {`{{${v.key}}}`}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Catálogos ({template.catalogos.length})
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {template.catalogos.length > 0 ? (
                template.catalogos.map((c) => (
                  <span key={c.key} className="rounded bg-gray-50 px-1.5 py-0.5 text-[11px] text-gray-600 ring-1 ring-gray-200">
                    {c.label}
                  </span>
                ))
              ) : (
                <span className="text-[11px] text-gray-400">—</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Clientes Finales (Capa 2) */}
      <section>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Clientes Finales</h2>
            <p className="text-xs text-gray-500">
              Cada uno personaliza la plantilla con sus propios datos.
            </p>
          </div>
          <button
            onClick={() => setAdding(true)}
            className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            + Añadir Cliente Final
          </button>
        </div>

        {adding && (
          <div className="mt-3 flex gap-2 rounded-xl border border-gray-900 bg-white p-3">
            <input
              autoFocus
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addCliente()
                if (e.key === 'Escape') setAdding(false)
              }}
              placeholder="Ej. Clínica Dental Sonríe"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
            <button onClick={addCliente} className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800">
              Crear
            </button>
            <button onClick={() => setAdding(false)} className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:text-gray-900">
              Cancelar
            </button>
          </div>
        )}

        {clientes.length === 0 && !adding ? (
          <div className="mt-3 rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <p className="text-sm text-gray-500">
              Aún no hay Clientes Finales. Añade uno y personaliza la plantilla con su nombre,
              servicios y horarios; verás la conversación al instante.
            </p>
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {clientes.map((c) => {
              const { vars, filas } = configuradas(c)
              return (
                <div key={c.id} className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{c.nombre}</h4>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {vars} variables · {filas} filas de catálogo
                      </p>
                    </div>
                    <button
                      onClick={() => store.deleteClienteFinal(c.id)}
                      className="text-xs text-gray-300 hover:text-red-500"
                      aria-label="Eliminar Cliente Final"
                    >
                      ✕
                    </button>
                  </div>
                  <button
                    onClick={() => setEditingId(c.id)}
                    className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Personalizar
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {editing && (
        <ClienteFinalEditor
          template={template}
          cliente={editing}
          onClose={() => setEditingId(null)}
          onSave={(patch) => {
            store.updateClienteFinal(editing.id, patch)
            setEditingId(null)
          }}
        />
      )}
    </div>
  )
}
