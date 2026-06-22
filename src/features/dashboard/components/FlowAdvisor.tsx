'use client'

import type { FlowStepKey } from '../types'
import { analyzeFlow } from '../lib/flowAdvisor'

interface Props {
  templateKey: string
  flujo: FlowStepKey[]
  onApply: (flujo: FlowStepKey[]) => void
}

// Panel del "Asistente A2A": detecta huecos en el flujo y sugiere arreglos.
export function FlowAdvisor({ templateKey, flujo, onApply }: Props) {
  const suggestions = analyzeFlow(templateKey, flujo)

  if (suggestions.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
        <span>🤖</span>
        <span>
          <span className="font-medium">Asistente A2A:</span> el flujo se ve completo. ✓
        </span>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
      <div className="flex items-center gap-2">
        <span>🤖</span>
        <span className="text-xs font-semibold text-amber-800">
          Asistente A2A · {suggestions.length}{' '}
          {suggestions.length === 1 ? 'sugerencia' : 'sugerencias'} para tu flujo
        </span>
      </div>
      <ul className="mt-2 space-y-2">
        {suggestions.map((s) => (
          <li key={s.id} className="rounded-lg bg-white/70 p-2.5">
            <p className="text-xs text-amber-900">{s.mensaje}</p>
            <button
              onClick={() => onApply(s.apply(flujo))}
              className="mt-1.5 rounded-md bg-amber-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-amber-700"
            >
              {s.cta}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
