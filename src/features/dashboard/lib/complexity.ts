import type { Complexity, DiscoveryScope } from '../types'
import { getTopic } from '../data/topics'

// Heurística simplificada de la Sección 10 (complexity_signals.json).
// Deriva el tier de complejidad del scope de la entrevista Discovery.
export function estimateComplexity(scope: DiscoveryScope): Complexity {
  const topic = getTopic(scope.temaKey)
  const compliance = topic?.riesgo === 'amarillo'
  const channelCount = scope.canales.length
  const languages = scope.idiomas.length
  const hasEscalation = scope.flujo.includes('escalamiento')

  // Señales que empujan a "complex"
  if (compliance || channelCount >= 3 || languages >= 3) {
    return 'complex'
  }

  // Señales que empujan a "standard"
  if (channelCount >= 2 || languages >= 2 || hasEscalation) {
    return 'standard'
  }

  return 'simple'
}

export const COMPLEXITY_META: Record<
  Complexity,
  { label: string; badge: string; descripcion: string }
> = {
  simple: {
    label: 'Simple',
    badge: 'bg-gray-100 text-gray-700 border-gray-200',
    descripcion: '1 canal, 1 idioma, sin compliance.',
  },
  standard: {
    label: 'Standard',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    descripcion: 'Varios canales/idiomas o con escalamiento.',
  },
  complex: {
    label: 'Complex',
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
    descripcion: 'Compliance, multicanal o multi-idioma.',
  },
}
