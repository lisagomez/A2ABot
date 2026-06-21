'use client'

import { useMemo, useState } from 'react'
import type { Channel, DiscoveryScope, FlowStepKey } from '../types'
import {
  ALL_CHANNELS,
  CHANNEL_META,
  DEFAULT_FLOW,
  FLOW_STEPS,
  RISK_META,
  TOPICS,
  getTopic,
} from '../data/topics'
import { COMPLEXITY_META, estimateComplexity } from '../lib/complexity'

const PAISES = ['México', 'Colombia', 'Perú', 'Chile', 'Argentina', 'España', 'Estados Unidos']
const IDIOMAS = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
  { code: 'pt', label: 'Português' },
]
const FLOW_ORDER: FlowStepKey[] = [
  'saludo',
  'clarificacion',
  'accion',
  'escalamiento',
  'cierre',
  'error_recovery',
]

const STEPS = ['Tema', 'Proyecto', 'Alcance', 'Canales', 'Flujo', 'Resumen']

interface Props {
  onCancel: () => void
  onCreate: (nombre: string, scope: DiscoveryScope) => void
}

export function DiscoveryWizard({ onCancel, onCreate }: Props) {
  const [step, setStep] = useState(0)
  const [temaKey, setTemaKey] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [pais, setPais] = useState(PAISES[0])
  const [idiomas, setIdiomas] = useState<string[]>(['es'])
  const [canales, setCanales] = useState<Channel[]>([])
  const [flujo, setFlujo] = useState<FlowStepKey[]>(DEFAULT_FLOW)

  const topic = temaKey ? getTopic(temaKey) : undefined

  const scope: DiscoveryScope | null = useMemo(
    () => (temaKey ? { temaKey, pais, idiomas, canales, flujo } : null),
    [temaKey, pais, idiomas, canales, flujo]
  )

  const complejidad = scope ? estimateComplexity(scope) : null

  function selectTopic(key: string) {
    const t = getTopic(key)
    if (!t || t.riesgo === 'rojo') return
    setTemaKey(key)
    setCanales(t.canalesTipicos)
    setStep(1)
  }

  function toggle<T>(arr: T[], value: T): T[] {
    return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]
  }

  const canNext =
    (step === 0 && !!temaKey) ||
    (step === 1 && nombre.trim().length > 0) ||
    (step === 2 && idiomas.length > 0) ||
    (step === 3 && canales.length > 0) ||
    (step === 4 && flujo.length > 0) ||
    step === 5

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        {/* Header con progreso */}
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Nuevo proyecto · Discovery</h2>
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-700" aria-label="Cerrar">
              ✕
            </button>
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            {STEPS.map((label, i) => (
              <div key={label} className="flex flex-1 items-center gap-1.5">
                <span
                  className={`h-1.5 w-full rounded-full ${i <= step ? 'bg-gray-900' : 'bg-gray-200'}`}
                />
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Paso {step + 1} de {STEPS.length}: {STEPS[step]}
          </p>
        </div>

        {/* Cuerpo */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Paso 0: Tema */}
          {step === 0 && (
            <div>
              <p className="mb-4 text-sm text-gray-600">
                ¿De qué trata el bot? Elige el tema; te sugeriremos proyectos comunes.
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {TOPICS.map((t) => {
                  const blocked = t.riesgo === 'rojo'
                  const selected = temaKey === t.key
                  return (
                    <button
                      key={t.key}
                      onClick={() => selectTopic(t.key)}
                      disabled={blocked}
                      className={`rounded-xl border p-3 text-left transition ${
                        selected
                          ? 'border-gray-900 ring-1 ring-gray-900'
                          : 'border-gray-200 hover:border-gray-400'
                      } ${blocked ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">
                          {t.emoji} {t.label}
                        </span>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] ${RISK_META[t.riesgo].badge}`}>
                          {RISK_META[t.riesgo].label}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">{t.descripcion}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Paso 1: Proyecto sugerido */}
          {step === 1 && topic && (
            <div>
              <p className="mb-4 text-sm text-gray-600">
                Proyectos comunes de <span className="font-medium">{topic.label}</span>. Elige uno o
                empieza desde cero.
              </p>
              <div className="space-y-2">
                {topic.proyectosSugeridos.map((p) => (
                  <button
                    key={p.nombre}
                    onClick={() => setNombre(p.nombre)}
                    className={`block w-full rounded-xl border p-3 text-left transition ${
                      nombre === p.nombre
                        ? 'border-gray-900 ring-1 ring-gray-900'
                        : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <span className="font-medium text-gray-900">{p.nombre}</span>
                    <p className="mt-0.5 text-xs text-gray-500">{p.descripcion}</p>
                  </button>
                ))}
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">
                  Nombre del proyecto
                </label>
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Bot de soporte para tienda X"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                />
              </div>
            </div>
          )}

          {/* Paso 2: Alcance */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700">País</label>
                <select
                  value={pais}
                  onChange={(e) => setPais(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                >
                  {PAISES.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-400">
                  El tema se valida contra el catálogo permitido para ese país.
                </p>
              </div>
              <div>
                <span className="block text-sm font-medium text-gray-700">Idiomas</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {IDIOMAS.map((i) => (
                    <button
                      key={i.code}
                      onClick={() => setIdiomas((prev) => toggle(prev, i.code))}
                      className={`rounded-full border px-3 py-1.5 text-sm transition ${
                        idiomas.includes(i.code)
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-300 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      {i.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Paso 3: Canales */}
          {step === 3 && (
            <div>
              <p className="mb-3 text-sm text-gray-600">
                ¿En qué canales atenderá el bot? (más canales = mayor complejidad)
              </p>
              <div className="flex flex-wrap gap-2">
                {ALL_CHANNELS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCanales((prev) => toggle(prev, c))}
                    className={`rounded-full border px-3 py-1.5 text-sm transition ${
                      canales.includes(c)
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    {CHANNEL_META[c].emoji} {CHANNEL_META[c].label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Paso 4: Flujo de comunicación */}
          {step === 4 && (
            <div>
              <p className="mb-3 text-sm text-gray-600">
                Define el flujo del proceso de comunicación. Activa los pasos que tendrá la
                conversación.
              </p>
              <div className="space-y-2">
                {FLOW_ORDER.map((key, idx) => {
                  const meta = FLOW_STEPS[key]
                  const active = flujo.includes(key)
                  return (
                    <button
                      key={key}
                      onClick={() => setFlujo((prev) => toggle(prev, key))}
                      className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
                        active ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                          active ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <span>
                        <span className="text-sm font-medium text-gray-900">
                          {meta.label}
                          {meta.opcional && (
                            <span className="ml-2 text-[10px] font-normal text-gray-400">opcional</span>
                          )}
                        </span>
                        <p className="text-xs text-gray-500">{meta.descripcion}</p>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Paso 5: Resumen */}
          {step === 5 && topic && complejidad && (
            <div className="space-y-4">
              {topic.riesgo === 'amarillo' && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                  Este tema requiere revisión previa del equipo a2abot antes de iniciar el pipeline.
                </div>
              )}
              <dl className="divide-y divide-gray-100 rounded-xl border border-gray-200">
                <Row label="Proyecto" value={nombre} />
                <Row label="Tema" value={`${topic.emoji} ${topic.label}`} />
                <Row label="País" value={pais} />
                <Row label="Idiomas" value={idiomas.map((c) => c.toUpperCase()).join(', ')} />
                <Row
                  label="Canales"
                  value={canales.map((c) => CHANNEL_META[c].label).join(', ') || '—'}
                />
                <Row label="Flujo" value={flujo.map((f) => FLOW_STEPS[f].label).join(' → ')} />
              </dl>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Complejidad estimada:</span>
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${COMPLEXITY_META[complejidad].badge}`}>
                  {COMPLEXITY_META[complejidad].label}
                </span>
                <span className="text-xs text-gray-400">{COMPLEXITY_META[complejidad].descripcion}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
          <button
            onClick={() => (step === 0 ? onCancel() : setStep((s) => s - 1))}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            {step === 0 ? 'Cancelar' : 'Atrás'}
          </button>
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => canNext && setStep((s) => s + 1)}
              disabled={!canNext}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-40"
            >
              Continuar
            </button>
          ) : (
            <button
              onClick={() => scope && onCreate(nombre, scope)}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Crear proyecto
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-sm font-medium text-gray-900">{value}</dd>
    </div>
  )
}
