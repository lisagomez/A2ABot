'use client'

import { useCallback, useEffect, useState } from 'react'
import type { DiscoveryScope, Project, Workspace } from '../types'
import { getTopic } from '../data/topics'
import { estimateComplexity } from '../lib/complexity'

// Persistencia temporal en localStorage, aislada por usuario.
// Cuando migremos a Supabase, sólo cambia esta capa (las vistas no se tocan).

interface DashboardData {
  workspaces: Workspace[]
  projects: Project[]
}

const EMPTY: DashboardData = { workspaces: [], projects: [] }

function storageKey(userId: string) {
  return `a2abot:dashboard:${userId}`
}

function load(userId: string): DashboardData {
  if (typeof window === 'undefined') return EMPTY
  try {
    const raw = window.localStorage.getItem(storageKey(userId))
    return raw ? (JSON.parse(raw) as DashboardData) : EMPTY
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
      persist({
        workspaces: data.workspaces.filter((w) => w.id !== workspaceId),
        projects: data.projects.filter((p) => p.workspaceId !== workspaceId),
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

  const deleteProject = useCallback(
    (projectId: string) => {
      persist({ ...data, projects: data.projects.filter((p) => p.id !== projectId) })
    },
    [data, persist]
  )

  const projectsByWorkspace = useCallback(
    (workspaceId: string) => data.projects.filter((p) => p.workspaceId === workspaceId),
    [data.projects]
  )

  return {
    hydrated,
    workspaces: data.workspaces,
    projects: data.projects,
    createWorkspace,
    deleteWorkspace,
    createProject,
    deleteProject,
    projectsByWorkspace,
  }
}
