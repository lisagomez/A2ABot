# Dashboard del Cliente Desarrollador — estado (verificado 2026-06-22)

Iniciativa en curso: el dashboard web del **Cliente Desarrollador** (HITL 1), donde
arma y revisa el flujo de sus bots antes de generarlos.

## Estado actual (re-verificado 2026-06-22)
- **Es un prototipo 100% en memoria.** No hay API routes ni capa de servicios.
  Los datos viven en Zustand (`src/features/dashboard/store/useDashboardStore.ts`,
  persistidos solo en localStorage) + data estática (`data/templates.ts`, `data/topics.ts`).
  Nada se persiste en BD; los datos se pierden entre dispositivos/limpiezas.
- **Supabase NO está conectado al dashboard.** La única migración es
  `supabase/migrations/0001_profiles.sql` (auth/profiles). Las tablas reales del
  pipeline (proyectos, scope, flujos) todavía no existen.
- **Features reales del dashboard:** workspaces + proyectos (CRUD en memoria),
  Discovery Wizard (6 pasos → deriva complejidad/estado), Flow Builder (drag & drop),
  Flow Advisor (reglas), Conversation Preview, editor de Cliente Final (variables + catálogos).
- **Tokens sin uso:** `OPENROUTER_API_KEY` y `TELEGRAM_BOT_TOKEN` existen en `.env.local`
  pero ningún código los consume. Ver `reference/integraciones-pendientes.md`.

## Flow Advisor / "Asistente A2A" (última feature, rama `feat/flow-advisor`)
- `lib/flowAdvisor.ts`: revisa el flujo armado contra la plantilla y sugiere arreglos
  (insertar/mover pasos). Hoy son **reglas deterministas**, no LLM.
- Intención de diseño explícita: más adelante respaldarlo con un agente LLM
  (Discovery/Triage) que razone sobre el flujo en vez de reglas fijas.
- Componente UI: `components/FlowAdvisor.tsx`; el flujo se edita con drag & drop en
  `components/FlowBuilder.tsx` y se previsualiza en `components/ConversationPreview.tsx`.

## Próximos pasos naturales (no decididos aún)
- Persistir proyectos/flujos en Supabase (hoy se pierden al recargar).
- Conectar el Flow Advisor a un agente LLM real.
