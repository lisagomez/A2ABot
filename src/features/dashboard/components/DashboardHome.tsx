'use client'

import { useState } from 'react'
import { useDashboardStore } from '../store/useDashboardStore'
import { DiscoveryWizard } from './DiscoveryWizard'
import { ProjectCard } from './ProjectCard'

export function DashboardHome({ userId, nombre }: { userId: string; nombre: string }) {
  const store = useDashboardStore(userId)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creatingWorkspace, setCreatingWorkspace] = useState(false)
  const [wsName, setWsName] = useState('')
  const [wizardOpen, setWizardOpen] = useState(false)

  const selected = store.workspaces.find((w) => w.id === selectedId) ?? null

  if (!store.hydrated) {
    return <p className="text-sm text-gray-400">Cargando tu espacio…</p>
  }

  function submitWorkspace() {
    if (!wsName.trim()) return
    const ws = store.createWorkspace(wsName)
    setWsName('')
    setCreatingWorkspace(false)
    setSelectedId(ws.id)
  }

  // ---- Vista de un workspace (sus proyectos) ----
  if (selected) {
    const projects = store.projectsByWorkspace(selected.id)
    return (
      <div className="space-y-6">
        <div>
          <button
            onClick={() => setSelectedId(null)}
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            ← Workspaces
          </button>
          <div className="mt-2 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">{selected.nombre}</h1>
              <p className="mt-1 text-sm text-gray-500">
                {projects.length} {projects.length === 1 ? 'proyecto' : 'proyectos'}
              </p>
            </div>
            <button
              onClick={() => setWizardOpen(true)}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              + Crear proyecto
            </button>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <p className="text-sm text-gray-500">
              Aún no hay proyectos. Crea uno: te haremos una breve entrevista para identificar el
              tema, sugerir proyectos comunes y definir el flujo de comunicación.
            </p>
            <button
              onClick={() => setWizardOpen(true)}
              className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              + Crear proyecto
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} onDelete={() => store.deleteProject(p.id)} />
            ))}
          </div>
        )}

        {wizardOpen && (
          <DiscoveryWizard
            onCancel={() => setWizardOpen(false)}
            onCreate={(nombre, scope) => {
              store.createProject(selected.id, nombre, scope)
              setWizardOpen(false)
            }}
          />
        )}
      </div>
    )
  }

  // ---- Vista de workspaces ----
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Hola, {nombre} 👋</h1>
        <p className="mt-1 text-sm text-gray-500">
          Organiza tu trabajo en workspaces. Dentro de cada uno creas los proyectos de bots.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {store.workspaces.map((w) => {
          const count = store.projectsByWorkspace(w.id).length
          return (
            <button
              key={w.id}
              onClick={() => setSelectedId(w.id)}
              className="group rounded-2xl border border-gray-200 bg-white p-5 text-left transition hover:border-gray-400 hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-900 text-sm font-bold text-white">
                  {w.nombre.charAt(0).toUpperCase()}
                </span>
                <span
                  onClick={(e) => {
                    e.stopPropagation()
                    store.deleteWorkspace(w.id)
                  }}
                  className="text-xs text-gray-300 hover:text-red-500"
                  role="button"
                  aria-label="Eliminar workspace"
                >
                  ✕
                </span>
              </div>
              <h3 className="mt-3 font-semibold text-gray-900">{w.nombre}</h3>
              <p className="mt-0.5 text-xs text-gray-500">
                {count} {count === 1 ? 'proyecto' : 'proyectos'}
              </p>
            </button>
          )
        })}

        {/* Tarjeta crear workspace */}
        {creatingWorkspace ? (
          <div className="rounded-2xl border border-gray-900 bg-white p-5">
            <input
              autoFocus
              value={wsName}
              onChange={(e) => setWsName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitWorkspace()
                if (e.key === 'Escape') setCreatingWorkspace(false)
              }}
              placeholder="Nombre del workspace"
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={submitWorkspace}
                className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
              >
                Crear
              </button>
              <button
                onClick={() => setCreatingWorkspace(false)}
                className="rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:text-gray-900"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setCreatingWorkspace(true)}
            className="flex min-h-[132px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white p-5 text-gray-500 transition hover:border-gray-900 hover:text-gray-900"
          >
            <span className="text-2xl">+</span>
            <span className="mt-1 text-sm font-medium">Crear workspace</span>
          </button>
        )}
      </div>
    </div>
  )
}
