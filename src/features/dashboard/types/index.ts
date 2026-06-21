// Tipos del dashboard del Cliente Desarrollador.
// Modelo simplificado y alineado con BUSINESS_LOGIC.md (workspaces, proyectos,
// Discovery). Por ahora persiste en localStorage; se migrará a Supabase.

export type RiskLevel = 'verde' | 'amarillo' | 'rojo'

export type Channel = 'telegram' | 'whatsapp' | 'slack' | 'discord' | 'webchat'

export type Complexity = 'simple' | 'standard' | 'complex'

/** Paso del flujo conversacional (patrones del catálogo). */
export type FlowStepKey =
  | 'saludo'
  | 'clarificacion'
  | 'accion'
  | 'escalamiento'
  | 'cierre'
  | 'error_recovery'

export interface SuggestedProject {
  nombre: string
  descripcion: string
}

/** Tema del catálogo controlado (allowlist). Lo gestiona a2abot. */
export interface Topic {
  key: string
  label: string
  emoji: string
  riesgo: RiskLevel
  descripcion: string
  canalesTipicos: Channel[]
  proyectosSugeridos: SuggestedProject[]
}

export interface Workspace {
  id: string
  nombre: string
  createdAt: string
}

/** Borrador que produce la entrevista Discovery antes de crear el proyecto. */
export interface DiscoveryScope {
  temaKey: string
  pais: string
  idiomas: string[]
  canales: Channel[]
  flujo: FlowStepKey[]
}

export interface Project {
  id: string
  workspaceId: string
  nombre: string
  temaKey: string
  riesgo: RiskLevel
  pais: string
  idiomas: string[]
  canales: Channel[]
  flujo: FlowStepKey[]
  complejidad: Complexity
  estado: 'borrador' | 'bloqueado' | 'pendiente_revision' | 'listo'
  createdAt: string
}
