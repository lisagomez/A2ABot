import type { FlowStepKey } from '../types'
import { FLOW_STEPS } from '../data/topics'

// "Asistente A2A": revisa el flujo de comunicación contra la plantilla y sugiere
// arreglos. Hoy son reglas deterministas; más adelante puede respaldarse con un
// agente LLM (Discovery/Triage) que razone sobre el flujo.

export interface FlowSuggestion {
  id: string
  severity: 'warning' | 'info'
  mensaje: string
  cta: string
  apply: (flujo: FlowStepKey[]) => FlowStepKey[]
}

function insertAfter(
  flujo: FlowStepKey[],
  step: FlowStepKey,
  anchor: FlowStepKey
): FlowStepKey[] {
  const idx = flujo.indexOf(anchor)
  if (idx === -1) return [step, ...flujo]
  const next = [...flujo]
  next.splice(idx + 1, 0, step)
  return next
}

function moveBefore(
  flujo: FlowStepKey[],
  step: FlowStepKey,
  anchor: FlowStepKey
): FlowStepKey[] {
  const without = flujo.filter((s) => s !== step)
  const idx = without.indexOf(anchor)
  if (idx === -1) return [...without, step]
  without.splice(idx, 0, step)
  return without
}

// Mensaje del paso "clarificación" según la plantilla (qué hace ahí).
function clarificacionMsg(templateKey: string): string {
  switch (templateKey) {
    case 'agendar-cita':
      return 'Entre el saludo y revisar disponibilidad falta «Clarificación»: ahí el cliente elige el servicio del catálogo y se proponen los horarios. Sin este paso el bot confirma disponibilidad sin saber qué servicio.'
    case 'soporte-pedidos':
      return 'Falta «Clarificación»: el bot necesita entender la consulta del cliente antes de responder con la base de FAQs.'
    case 'faq-rrhh':
      return 'Falta «Clarificación»: el empleado debe indicar el tema antes de que el bot responda con la política.'
    default:
      return 'Falta «Clarificación»: el bot entiende la intención y pide los datos necesarios antes de actuar.'
  }
}

export function analyzeFlow(templateKey: string, flujo: FlowStepKey[]): FlowSuggestion[] {
  const has = (s: FlowStepKey) => flujo.includes(s)
  const suggestions: FlowSuggestion[] = []

  if (!has('saludo')) {
    suggestions.push({
      id: 'add-saludo',
      severity: 'warning',
      mensaje: 'El flujo no empieza con un «Saludo». Conviene recibir al usuario antes de pedir datos.',
      cta: 'Añadir Saludo al inicio',
      apply: (f) => ['saludo', ...f],
    })
  }

  if (!has('clarificacion')) {
    suggestions.push({
      id: 'add-clarificacion',
      severity: 'warning',
      mensaje: clarificacionMsg(templateKey),
      cta: 'Añadir Clarificación',
      apply: (f) => insertAfter(f, 'clarificacion', 'saludo'),
    })
  }

  if (!has('accion')) {
    suggestions.push({
      id: 'add-accion',
      severity: 'warning',
      mensaje: 'Falta «Acción / transacción»: es donde el bot resuelve la petición (p. ej. revisa disponibilidad y confirma).',
      cta: 'Añadir Acción',
      apply: (f) => (has('clarificacion') ? insertAfter(f, 'accion', 'clarificacion') : [...f, 'accion']),
    })
  }

  if (!has('cierre')) {
    suggestions.push({
      id: 'add-cierre',
      severity: 'info',
      mensaje: 'No hay «Cierre»: conviene confirmar la resolución y despedir al final.',
      cta: 'Añadir Cierre al final',
      apply: (f) => [...f, 'cierre'],
    })
  }

  // Orden: la clarificación debe ir antes de la acción.
  if (
    has('clarificacion') &&
    has('accion') &&
    flujo.indexOf('accion') < flujo.indexOf('clarificacion')
  ) {
    suggestions.push({
      id: 'reorder-clarificacion',
      severity: 'warning',
      mensaje: '«Acción» está antes de «Clarificación». El bot actuaría sin haber entendido qué necesita el cliente.',
      cta: 'Mover Clarificación antes de Acción',
      apply: (f) => moveBefore(f, 'clarificacion', 'accion'),
    })
  }

  return suggestions
}

export const STEP_LABEL = (s: FlowStepKey) => FLOW_STEPS[s].label
