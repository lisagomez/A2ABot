'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ClienteFinal, DiscoveryScope, Project, Workspace } from '../types'
import { getTopic } from '../data/topics'
import { templateKeyForTopic } from '../data/templates'
import { estimateComplexity } from '../lib/complexity'

// Persistencia temporal en localStorage, aislada por usuario.
// Cuando migremos a Supabase, sólo cambia esta capa (las vistas no se tocan).

interface DashboardData {
  workspaces: Workspace[]
  projects: Project[]
  clientesFinales: ClienteFinal[]
}

const EMPTY: DashboardData = { workspaces: [], projects: [], clientesFinales: [] }

function storageKey(userId: string) {
  return `a2abot:dashboard:${userId}`
}

function load(userId: string): DashboardData {
  if (typeof window === 'undefined') return EMPTY
  try {
    const raw = window.localStorage.getItem(storageKey(userId))
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw) as Partial<DashboardData>
    return {
      workspaces: parsed.workspaces ?? [],
      // Backfill: proyectos creados antes de la feature de plantillas no tienen
      // templateKey; se deriva del tema para que carguen la plantilla correcta.
      projects: (parsed.projects ?? []).map((p) => ({
        ...p,
        templateKey: p.templateKey || templateKeyForTopic(p.temaKey),
      })),
      clientesFinales: parsed.clientesFinales ?? [],
    }
  } catch {
    return EMPTY
  }
}

function uid() {
  return crypto.randomUUID()
}

export function useDashboardStore(userId: string) {
  const [data, setData] = useState<DashboardData>(EMPTY)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setData(load(userId))
    setHydrated(true)
  }, [userId])

  const persist = useCallback(
    (next: DashboardData) => {
      setData(next)
      try {
        window.localStorage.setItem(storageKey(userId), JSON.stringify(next))
      } catch {
        // almacenamiento no disponible: se mantiene en memoria
      }
    },
    [userId]
  )

  const createWorkspace = useCallback(
    (nombre: string) => {
      const workspace: Workspace = {
        id: uid(),
        nombre: nombre.trim() || 'Nuevo workspace',
        createdAt: new Date().toISOString(),
      }
      persist({ ...data, workspaces: [...data.workspaces, workspace] })
      return workspace
    },
    [data, persist]
  )

  const deleteWorkspace = useCallback(
    (workspaceId: string) => {
      const removedProjects = data.projects
        .filter((p) => p.workspaceId === workspaceId)
        .map((p) => p.id)
      persist({
        workspaces: data.workspaces.filter((w) => w.id !== workspaceId),
        projects: data.projects.filter((p) => p.workspaceId !== workspaceId),
        clientesFinales: data.clientesFinales.filter(
          (c) => !removedProjects.includes(c.projectId)
        ),
      })
    },
    [data, persist]
  )

  const createProject = useCallback(
    (workspaceId: string, nombre: string, scope: DiscoveryScope) => {
      const topic = getTopic(scope.temaKey)
      const riesgo = topic?.riesgo ?? 'verde'
      const estado: Project['estado'] =
        riesgo === 'rojo'
          ? 'bloqueado'
          : riesgo === 'amarillo'
            ? 'pendiente_revision'
            : 'listo'

      const project: Project = {
        id: uid(),
        workspaceId,
        nombre: nombre.trim() || topic?.label || 'Nuevo proyecto',
        temaKey: scope.temaKey,
        templateKey: templateKeyForTopic(scope.temaKey),
        riesgo,
        pais: scope.pais,
        idiomas: scope.idiomas,
        canales: scope.canales,
        flujo: scope.flujo,
        complejidad: estimateComplexity(scope),
        estado,
        createdAt: new Date().toISOString(),
      }
      persist({ ...data, projects: [...data.projects, project] })
      return project
    },
    [data, persist]
  )

  const updateProject = useCallback(
    (projectId: string, patch: Partial<Pick<Project, 'nombre' | 'flujo'>>) => {
      persist({
        ...data,
        projects: data.projects.map((p) => (p.id === projectId ? { ...p, ...patch } : p)),
      })
    },
    [data, persist]
  )

  const deleteProject = useCallback(
    (projectId: string) => {
      persist({
        ...data,
        projects: data.projects.filter((p) => p.id !== projectId),
        clientesFinales: data.clientesFinales.filter((c) => c.projectId !== projectId),
      })
    },
    [data, persist]
  )

  const projectsByWorkspace = useCallback(
    (workspaceId: string) => data.projects.filter((p) => p.workspaceId === workspaceId),
    [data.projects]
  )

  // ---- Clientes Finales (instancias de la plantilla) ----

  const clientesByProject = useCallback(
    (projectId: string) => data.clientesFinales.filter((c) => c.projectId === projectId),
    [data.clientesFinales]
  )

  const createClienteFinal = useCallback(
    (projectId: string, nombre: string) => {
      const cf: ClienteFinal = {
        id: uid(),
        projectId,
        nombre: nombre.trim() || 'Nuevo Cliente Final',
        variables: {},
        catalogos: {},
        createdAt: new Date().toISOString(),
      }
      persist({ ...data, clientesFinales: [...data.clientesFinales, cf] })
      return cf
    },
    [data, persist]
  )

  const updateClienteFinal = useCallback(
    (id: string, patch: Partial<Pick<ClienteFinal, 'nombre' | 'variables' | 'catalogos'>>) => {
      persist({
        ...data,
        clientesFinales: data.clientesFinales.map((c) =>
          c.id === id ? { ...c, ...patch } : c
        ),
      })
    },
    [data, persist]
  )

  const deleteClienteFinal = useCallback(
    (id: string) => {
      persist({
        ...data,
        clientesFinales: data.clientesFinales.filter((c) => c.id !== id),
      })
    },
    [data, persist]
  )

  return {
    hydrated,
    workspaces: data.workspaces,
    projects: data.projects,
    createWorkspace,
    deleteWorkspace,
    createProject,
    updateProject,
    deleteProject,
    projectsByWorkspace,
    clientesByProject,
    createClienteFinal,
    updateClienteFinal,
    deleteClienteFinal,
  }
}
