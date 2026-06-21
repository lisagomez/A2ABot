import type { Channel, FlowStepKey, RiskLevel, Topic } from '../types'

// Catálogo de temas permitidos (Topic Allowlist) — sección 12 de BUSINESS_LOGIC.
// En producción lo gestiona a2abot en Supabase (modificable sin redeploy).
// Aquí va una versión estática para el prototipo del dashboard.

export const TOPICS: Topic[] = [
  {
    key: 'soporte-ecommerce',
    label: 'Soporte e-commerce',
    emoji: '🛍️',
    riesgo: 'verde',
    descripcion: 'FAQ, estado de pedidos, devoluciones y reembolsos.',
    canalesTipicos: ['whatsapp', 'telegram', 'webchat'],
    proyectosSugeridos: [
      { nombre: 'Bot de FAQ de pedidos', descripcion: 'Responde estado de pedidos y dudas frecuentes.' },
      { nombre: 'Gestión de devoluciones', descripcion: 'Guía el proceso de devolución y reembolso.' },
      { nombre: 'Seguimiento de envíos', descripcion: 'Rastrea paquetes y notifica cambios de estado.' },
    ],
  },
  {
    key: 'reservaciones',
    label: 'Reservaciones',
    emoji: '📅',
    riesgo: 'verde',
    descripcion: 'Restaurantes, hoteles y citas con confirmación y recordatorios.',
    canalesTipicos: ['whatsapp', 'telegram', 'webchat'],
    proyectosSugeridos: [
      { nombre: 'Reservas de restaurante', descripcion: 'Toma, confirma y recuerda reservas.' },
      { nombre: 'Agenda de citas', descripcion: 'Agenda citas con recordatorios automáticos.' },
      { nombre: 'Reservas de hotel', descripcion: 'Consulta disponibilidad y reserva habitaciones.' },
    ],
  },
  {
    key: 'rrhh-interno',
    label: 'RRHH interno',
    emoji: '👥',
    riesgo: 'verde',
    descripcion: 'FAQ de empleados, onboarding y políticas internas.',
    canalesTipicos: ['slack', 'telegram'],
    proyectosSugeridos: [
      { nombre: 'Onboarding de empleados', descripcion: 'Guía a nuevos empleados en su primera semana.' },
      { nombre: 'FAQ de RRHH', descripcion: 'Resuelve dudas de vacaciones, nómina y políticas.' },
    ],
  },
  {
    key: 'seguros',
    label: 'Cotización de seguros',
    emoji: '🛡️',
    riesgo: 'amarillo',
    descripcion: 'Auto, vida y gastos médicos. Requiere revisión por riesgo regulatorio.',
    canalesTipicos: ['whatsapp', 'webchat'],
    proyectosSugeridos: [
      { nombre: 'Cotizador de auto', descripcion: 'Recoge datos del vehículo y genera cotización.' },
      { nombre: 'Cotizador de gastos médicos', descripcion: 'Calcula primas según perfil del cliente.' },
    ],
  },
  {
    key: 'tramites-fiscales',
    label: 'Trámites / orientación fiscal',
    emoji: '🧾',
    riesgo: 'amarillo',
    descripcion: 'Orientación de trámites. Revisión previa por riesgo de asesoría sin licencia.',
    canalesTipicos: ['webchat', 'whatsapp'],
    proyectosSugeridos: [
      { nombre: 'Guía de trámites', descripcion: 'Orienta sobre requisitos y pasos de un trámite.' },
    ],
  },
  {
    key: 'cobranza',
    label: 'Cobranza / negociación',
    emoji: '💰',
    riesgo: 'amarillo',
    descripcion: 'Recordatorios y negociación de deuda. Leyes de cobranza estrictas por país.',
    canalesTipicos: ['whatsapp', 'telegram'],
    proyectosSugeridos: [
      { nombre: 'Recordatorios de pago', descripcion: 'Notifica vencimientos y opciones de pago.' },
    ],
  },
  {
    key: 'diagnostico-medico',
    label: 'Diagnóstico médico',
    emoji: '⛔',
    riesgo: 'rojo',
    descripcion: 'Bloqueado en toda la plataforma por riesgo de salud.',
    canalesTipicos: [],
    proyectosSugeridos: [],
  },
  {
    key: 'asesoria-legal',
    label: 'Asesoría legal vinculante',
    emoji: '⛔',
    riesgo: 'rojo',
    descripcion: 'Bloqueado: ejercicio ilegal de la abogacía.',
    canalesTipicos: [],
    proyectosSugeridos: [],
  },
  {
    key: 'trading-cripto',
    label: 'Trading / criptomonedas',
    emoji: '⛔',
    riesgo: 'rojo',
    descripcion: 'Bloqueado salvo jurisdicciones con sandbox regulatorio.',
    canalesTipicos: [],
    proyectosSugeridos: [],
  },
]

export function getTopic(key: string): Topic | undefined {
  return TOPICS.find((t) => t.key === key)
}

export const RISK_META: Record<RiskLevel, { label: string; badge: string; dot: string }> = {
  verde: {
    label: 'Habilitado',
    badge: 'bg-green-50 text-green-700 border-green-200',
    dot: 'bg-green-500',
  },
  amarillo: {
    label: 'Requiere revisión',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  rojo: {
    label: 'Bloqueado',
    badge: 'bg-red-50 text-red-700 border-red-200',
    dot: 'bg-red-500',
  },
}

export const CHANNEL_META: Record<Channel, { label: string; emoji: string }> = {
  telegram: { label: 'Telegram', emoji: '✈️' },
  whatsapp: { label: 'WhatsApp', emoji: '💬' },
  slack: { label: 'Slack', emoji: '#️⃣' },
  discord: { label: 'Discord', emoji: '🎮' },
  webchat: { label: 'Web chat', emoji: '🌐' },
}

export const ALL_CHANNELS: Channel[] = ['telegram', 'whatsapp', 'slack', 'discord', 'webchat']

export const FLOW_STEPS: Record<
  FlowStepKey,
  { label: string; descripcion: string; opcional?: boolean }
> = {
  saludo: { label: 'Saludo', descripcion: 'Recibe al usuario y presenta el bot.' },
  clarificacion: { label: 'Clarificación', descripcion: 'Entiende la intención y pide datos faltantes.' },
  accion: { label: 'Acción / transacción', descripcion: 'Resuelve la petición o ejecuta la operación.' },
  escalamiento: { label: 'Escalamiento (HITL)', descripcion: 'Deriva a un humano cuando hace falta.', opcional: true },
  cierre: { label: 'Cierre', descripcion: 'Confirma resolución y despide.' },
  error_recovery: { label: 'Recuperación de error', descripcion: 'Maneja respuestas no entendidas o fallos.', opcional: true },
}

export const DEFAULT_FLOW: FlowStepKey[] = ['saludo', 'clarificacion', 'accion', 'cierre']
