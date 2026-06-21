import type {
  CatalogRow,
  ClienteFinal,
  FlowStepKey,
  PreviewTurn,
  ProjectTemplate,
} from '../types'

// Plantillas (Capa 1) por tema. Cada plantilla define el flujo con variables
// y catálogos vacíos que el Cliente Desarrollador rellena por Cliente Final.

const AGENDAR_CITA: ProjectTemplate = {
  key: 'agendar-cita',
  nombre: 'Agenda tu cita',
  descripcion:
    'Saluda, muestra servicios, propone horarios, revisa disponibilidad y confirma la cita.',
  variables: [
    { key: 'nombre_negocio', label: 'Nombre del negocio', placeholder: 'Clínica Dental Sonríe' },
    { key: 'direccion', label: 'Dirección', placeholder: 'Av. Reforma 123, CDMX' },
    { key: 'zona_horaria', label: 'Zona horaria', placeholder: 'America/Mexico_City' },
    {
      key: 'instrucciones_asistir',
      label: 'Instrucciones para asistir',
      placeholder: 'Llega 10 min antes y trae identificación',
    },
  ],
  catalogos: [
    {
      key: 'servicios',
      label: 'Servicios',
      descripcion: 'Los servicios que el cliente final puede agendar.',
      columnas: [
        { key: 'nombre', label: 'Servicio', tipo: 'text', placeholder: 'Limpieza dental' },
        { key: 'duracion_min', label: 'Duración (min)', tipo: 'number', placeholder: '30' },
        { key: 'descripcion', label: 'Descripción', tipo: 'text', placeholder: 'Limpieza y revisión' },
      ],
    },
    {
      key: 'horarios',
      label: 'Horarios de atención',
      descripcion: 'Días y horas en que se atiende.',
      columnas: [
        { key: 'dia', label: 'Día(s)', tipo: 'text', placeholder: 'Lun–Vie' },
        { key: 'desde', label: 'Desde', tipo: 'text', placeholder: '09:00' },
        { key: 'hasta', label: 'Hasta', tipo: 'text', placeholder: '18:00' },
      ],
    },
  ],
}

const SOPORTE_PEDIDOS: ProjectTemplate = {
  key: 'soporte-pedidos',
  nombre: 'Soporte de pedidos',
  descripcion: 'Saluda, entiende la consulta y responde con la base de preguntas frecuentes.',
  variables: [
    { key: 'nombre_negocio', label: 'Nombre de la tienda', placeholder: 'Tienda X' },
    {
      key: 'politica_devoluciones',
      label: 'Política de devoluciones',
      placeholder: '30 días para devolver con ticket',
    },
  ],
  catalogos: [
    {
      key: 'faqs',
      label: 'Preguntas frecuentes',
      descripcion: 'Pares pregunta/respuesta que el bot puede responder.',
      columnas: [
        { key: 'pregunta', label: 'Pregunta', tipo: 'text', placeholder: '¿Cuánto tarda el envío?' },
        { key: 'respuesta', label: 'Respuesta', tipo: 'text', placeholder: 'De 3 a 5 días hábiles' },
      ],
    },
  ],
}

const FAQ_RRHH: ProjectTemplate = {
  key: 'faq-rrhh',
  nombre: 'FAQ de RRHH',
  descripcion: 'Resuelve dudas internas de empleados con la base de políticas.',
  variables: [{ key: 'nombre_negocio', label: 'Nombre de la empresa', placeholder: 'Empresa X' }],
  catalogos: [
    {
      key: 'politicas',
      label: 'Políticas',
      descripcion: 'Temas internos y su contenido.',
      columnas: [
        { key: 'tema', label: 'Tema', tipo: 'text', placeholder: 'Vacaciones' },
        { key: 'contenido', label: 'Contenido', tipo: 'text', placeholder: '20 días al año' },
      ],
    },
  ],
}

const GENERICA: ProjectTemplate = {
  key: 'generica',
  nombre: 'Plantilla genérica',
  descripcion: 'Flujo conversacional base que el dev adapta por Cliente Final.',
  variables: [
    { key: 'nombre_negocio', label: 'Nombre del negocio', placeholder: 'Negocio X' },
  ],
  catalogos: [],
}

export const TEMPLATES: Record<string, ProjectTemplate> = {
  'agendar-cita': AGENDAR_CITA,
  'soporte-pedidos': SOPORTE_PEDIDOS,
  'faq-rrhh': FAQ_RRHH,
  generica: GENERICA,
}

// Mapeo tema → plantilla por defecto.
const TOPIC_TO_TEMPLATE: Record<string, string> = {
  reservaciones: 'agendar-cita',
  'soporte-ecommerce': 'soporte-pedidos',
  'rrhh-interno': 'faq-rrhh',
}

export function templateKeyForTopic(topicKey: string): string {
  return TOPIC_TO_TEMPLATE[topicKey] ?? 'generica'
}

export function getTemplate(key: string): ProjectTemplate {
  return TEMPLATES[key] ?? GENERICA
}

// Valor de una variable: el configurado o su placeholder de ejemplo.
function v(template: ProjectTemplate, cf: ClienteFinal | null, key: string): string {
  const fromCfg = cf?.variables?.[key]
  if (fromCfg && fromCfg.trim()) return fromCfg.trim()
  const def = template.variables.find((x) => x.key === key)
  return def?.placeholder ?? `{{${key}}}`
}

function rows(cf: ClienteFinal | null, catalogKey: string): CatalogRow[] {
  return cf?.catalogos?.[catalogKey]?.filter((r) => Object.values(r).some((x) => x?.trim())) ?? []
}

// Contexto que se pasa a cada constructor de paso.
interface PreviewCtx {
  template: ProjectTemplate
  cf: ClienteFinal | null
  negocio: string
}

type StepBuilder = (ctx: PreviewCtx) => PreviewTurn[]

// Constructores por paso para cada plantilla. Cada paso del flujo aporta sus
// turnos; al reordenar/quitar pasos, la conversación cambia.

const agendarCita: Partial<Record<FlowStepKey, StepBuilder>> = {
  saludo: ({ negocio }) => [
    { from: 'bot', text: `¡Hola! Bienvenido a ${negocio} 👋\nSoy tu asistente para agendar citas. ¿Cómo te llamas?` },
    { from: 'user', text: 'María López' },
  ],
  clarificacion: ({ cf }) => {
    const servicios = rows(cf, 'servicios')
    const horarios = rows(cf, 'horarios')
    const sLista =
      servicios.length > 0
        ? servicios
            .map((s, i) => `${i + 1}️⃣ ${s.nombre || 'Servicio'}${s.duracion_min ? ` (${s.duracion_min} min)` : ''}`)
            .join('\n    ')
        : '1️⃣ (agrega servicios en el catálogo)'
    const hTexto =
      horarios.length > 0
        ? horarios.map((h) => `${h.dia} ${h.desde}–${h.hasta}`).join(', ')
        : '(agrega horarios en el catálogo)'
    const primer = servicios[0]?.nombre || 'tu servicio'
    return [
      { from: 'bot', text: `Un gusto, María. Estos son nuestros servicios:\n    ${sLista}` },
      { from: 'user', text: '1' },
      { from: 'bot', text: `Perfecto, ${primer}. Nuestro horario es ${hTexto}.\n¿Qué día y hora te acomoda?` },
      { from: 'user', text: 'Jueves a las 11' },
    ]
  },
  accion: () => [
    { from: 'bot', text: '🔎 Reviso disponibilidad… ¡el jueves 26/06 a las 11:00 está libre! ¿Lo confirmo?' },
    { from: 'user', text: 'Sí' },
  ],
  escalamiento: () => [
    { from: 'bot', text: '👩‍💼 Para este caso te conecto con nuestra recepción. Un momento…' },
  ],
  cierre: ({ template, cf }) => {
    const primer = rows(cf, 'servicios')[0]?.nombre || 'tu servicio'
    return [
      {
        from: 'bot',
        text: `✅ ¡Listo, María! Tu cita:\n${primer} · jueves 26/06 11:00\n📍 ${v(template, cf, 'direccion')}\nℹ️ ${v(template, cf, 'instrucciones_asistir')}`,
      },
    ]
  },
  error_recovery: () => [
    { from: 'user', text: 'el juev a las cmo' },
    { from: 'bot', text: 'Perdona, no te entendí 🙏 ¿Me confirmas el día y la hora?' },
  ],
}

const soportePedidos: Partial<Record<FlowStepKey, StepBuilder>> = {
  saludo: ({ negocio }) => [
    { from: 'bot', text: `¡Hola! Soy el asistente de ${negocio}. ¿En qué te ayudo con tu pedido?` },
  ],
  clarificacion: ({ cf }) => [
    { from: 'user', text: rows(cf, 'faqs')[0]?.pregunta || '¿Cuánto tarda el envío?' },
  ],
  accion: ({ cf }) => [
    { from: 'bot', text: rows(cf, 'faqs')[0]?.respuesta || '(agrega preguntas frecuentes en el catálogo)' },
  ],
  escalamiento: () => [
    { from: 'bot', text: '👩‍💼 Te paso con un agente humano para revisar tu caso.' },
  ],
  cierre: ({ template, cf }) => [
    { from: 'bot', text: `¿Algo más? Recuerda: ${v(template, cf, 'politica_devoluciones')}.` },
  ],
  error_recovery: () => [
    { from: 'user', text: '???' },
    { from: 'bot', text: 'No estoy seguro de haber entendido. ¿Puedes reformular tu pregunta?' },
  ],
}

const faqRrhh: Partial<Record<FlowStepKey, StepBuilder>> = {
  saludo: ({ negocio }) => [
    { from: 'bot', text: `Hola 👋 Soy el asistente de RRHH de ${negocio}. ¿Qué necesitas?` },
  ],
  clarificacion: ({ cf }) => [{ from: 'user', text: rows(cf, 'politicas')[0]?.tema || 'Vacaciones' }],
  accion: ({ cf }) => [
    { from: 'bot', text: rows(cf, 'politicas')[0]?.contenido || '(agrega políticas en el catálogo)' },
  ],
  escalamiento: () => [{ from: 'bot', text: '👩‍💼 Te derivo con una persona del equipo de RRHH.' }],
  cierre: () => [{ from: 'bot', text: '¿Te ayudo con algo más?' }],
  error_recovery: () => [{ from: 'bot', text: 'No te entendí bien, ¿lo reformulas?' }],
}

const generico: Partial<Record<FlowStepKey, StepBuilder>> = {
  saludo: ({ negocio }) => [
    { from: 'bot', text: `¡Hola! Bienvenido a ${negocio}. ¿En qué puedo ayudarte?` },
  ],
  clarificacion: () => [{ from: 'user', text: 'Quisiera información…' }],
  accion: () => [{ from: 'bot', text: 'Con gusto, déjame ayudarte con eso.' }],
  escalamiento: () => [{ from: 'bot', text: '👩‍💼 Te conecto con una persona del equipo.' }],
  cierre: () => [{ from: 'bot', text: '¡Gracias por escribir! Que tengas buen día 👋' }],
  error_recovery: () => [{ from: 'bot', text: 'Perdón, no te entendí. ¿Puedes repetirlo?' }],
}

const STEP_BUILDERS: Record<string, Partial<Record<FlowStepKey, StepBuilder>>> = {
  'agendar-cita': agendarCita,
  'soporte-pedidos': soportePedidos,
  'faq-rrhh': faqRrhh,
  generica: generico,
}

const FALLBACK_FLOW: FlowStepKey[] = ['saludo', 'clarificacion', 'accion', 'cierre']

// Construye la conversación siguiendo el ORDEN del flujo: cada paso aporta sus
// turnos. Reordenar o quitar pasos cambia el preview.
export function buildPreview(
  templateKey: string,
  cf: ClienteFinal | null,
  flujo: FlowStepKey[] = FALLBACK_FLOW
): PreviewTurn[] {
  const template = getTemplate(templateKey)
  const builders = STEP_BUILDERS[templateKey] ?? generico
  const ctx: PreviewCtx = { template, cf, negocio: v(template, cf, 'nombre_negocio') }

  const pasos = flujo.length > 0 ? flujo : FALLBACK_FLOW
  const turns = pasos.flatMap((step) => {
    const build = builders[step] ?? generico[step]
    return build ? build(ctx) : []
  })

  return turns.length > 0
    ? turns
    : [{ from: 'bot', text: `¡Hola! Bienvenido a ${ctx.negocio}.` }]
}
