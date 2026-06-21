'use client'

import { useEffect, useRef, useState } from 'react'
import type { FlowStepKey } from '../types'
import { FLOW_STEPS } from '../data/topics'

const ALL_STEPS: FlowStepKey[] = [
  'saludo',
  'clarificacion',
  'accion',
  'escalamiento',
  'cierre',
  'error_recovery',
]

interface Props {
  value: FlowStepKey[]
  onChange: (next: FlowStepKey[]) => void
}

// Constructor de flujo: el Cliente Desarrollador reordena los pasos arrastrando,
// y añade/quita pasos. Usa drag & drop nativo (sin dependencias).
export function FlowBuilder({ value, onChange }: Props) {
  const [items, setItems] = useState<FlowStepKey[]>(value)
  const dragIndex = useRef<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  // Sincroniza si el flujo cambia desde fuera.
  useEffect(() => setItems(value), [value])

  const available = ALL_STEPS.filter((s) => !items.includes(s))

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    const from = dragIndex.current
    if (from === null || from === index) return
    const next = [...items]
    const [moved] = next.splice(from, 1)
    next.splice(index, 0, moved)
    dragIndex.current = index
    setOverIndex(index)
    setItems(next)
  }

  function commit() {
    dragIndex.current = null
    setOverIndex(null)
    onChange(items)
  }

  function remove(step: FlowStepKey) {
    const next = items.filter((s) => s !== step)
    setItems(next)
    onChange(next)
  }

  function add(step: FlowStepKey) {
    const next = [...items, step]
    setItems(next)
    onChange(next)
  }

  return (
    <div>
      <div className="space-y-1.5">
        {items.map((step, index) => {
          const meta = FLOW_STEPS[step]
          return (
            <div
              key={step}
              draggable
              onDragStart={() => (dragIndex.current = index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={commit}
              onDragEnd={commit}
              className={`flex cursor-grab items-center gap-3 rounded-xl border bg-white px-3 py-2.5 active:cursor-grabbing ${
                overIndex === index ? 'border-gray-900 ring-1 ring-gray-900' : 'border-gray-200'
              }`}
            >
              <span className="select-none text-gray-300" aria-hidden>
                ⠿
              </span>
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-900 text-[11px] font-bold text-white">
                {index + 1}
              </span>
              <span className="flex-1">
                <span className="text-sm font-medium text-gray-900">
                  {meta.label}
                  {meta.opcional && (
                    <span className="ml-2 text-[10px] font-normal text-gray-400">opcional</span>
                  )}
                </span>
                <span className="block text-xs text-gray-500">{meta.descripcion}</span>
              </span>
              <button
                onClick={() => remove(step)}
                className="text-xs text-gray-300 hover:text-red-500"
                aria-label={`Quitar ${meta.label}`}
              >
                ✕
              </button>
            </div>
          )
        })}
      </div>

      {available.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] text-gray-400">Añadir paso:</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {available.map((step) => (
              <button
                key={step}
                onClick={() => add(step)}
                className="rounded-full border border-dashed border-gray-300 px-2.5 py-1 text-xs text-gray-600 hover:border-gray-900 hover:text-gray-900"
              >
                + {FLOW_STEPS[step].label}
              </button>
            ))}
          </div>
        </div>
      )}
      <p className="mt-2 text-[11px] text-gray-400">Arrastra ⠿ para reordenar los pasos.</p>
    </div>
  )
}
