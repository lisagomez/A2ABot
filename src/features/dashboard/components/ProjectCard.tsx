'use client'

import type { Project } from '../types'
import { CHANNEL_META, RISK_META, getTopic } from '../data/topics'
import { COMPLEXITY_META } from '../lib/complexity'

const ESTADO_META: Record<Project['estado'], { label: string; badge: string }> = {
  borrador: { label: 'Borrador', badge: 'bg-gray-100 text-gray-600 border-gray-200' },
  listo: { label: 'Listo para pipeline', badge: 'bg-green-50 text-green-700 border-green-200' },
  pendiente_revision: { label: 'Pendiente de revisión', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  bloqueado: { label: 'Bloqueado', badge: 'bg-red-50 text-red-700 border-red-200' },
}

export function ProjectCard({ project, onDelete }: { project: Project; onDelete: () => void }) {
  const topic = getTopic(project.temaKey)
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-medium text-gray-900">{project.nombre}</h4>
          <p className="mt-0.5 text-xs text-gray-500">
            {topic?.emoji} {topic?.label} · {project.pais}
          </p>
        </div>
        <button
          onClick={onDelete}
          className="text-xs text-gray-300 hover:text-red-500"
          aria-label="Eliminar proyecto"
        >
          ✕
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className={`rounded-full border px-2 py-0.5 text-[10px] ${ESTADO_META[project.estado].badge}`}>
          {ESTADO_META[project.estado].label}
        </span>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] ${COMPLEXITY_META[project.complejidad].badge}`}>
          {COMPLEXITY_META[project.complejidad].label}
        </span>
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${RISK_META[project.riesgo].badge}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${RISK_META[project.riesgo].dot}`} />
          {RISK_META[project.riesgo].label}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        {project.canales.map((c) => (
          <span key={c} className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
            {CHANNEL_META[c].emoji} {CHANNEL_META[c].label}
          </span>
        ))}
      </div>
    </div>
  )
}
