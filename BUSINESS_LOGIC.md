# BUSINESS_LOGIC.md — a2abot

> Generado por SaaS Factory V4 | Fecha: 2026-06-21

---

## Estado de Implementación (2026-06-22)

> ⚠️ **Importante:** todo lo que sigue a partir de la Sección 0 describe la **visión de
> diseño objetivo** de a2abot, NO el estado actual del código. Esta sección es la única que
> refleja lo que existe hoy. El proyecto está en **Fase 0**: la mayor parte de la
> arquitectura (agentes A2A, smart contracts, generación CLI, multi-canal, billing) aún no
> está construida.

### Verificación de integraciones

| Integración | Estado real | Evidencia |
|-------------|-------------|-----------|
| Auth Supabase | ✅ Implementada | `src/actions/auth.ts`, `src/lib/supabase/`, tabla `profiles` con RLS |
| Persistencia del dashboard | ❌ In-memory | `src/features/dashboard/store/useDashboardStore.ts` → Zustand + localStorage, sin Supabase |
| Tablas de negocio (workspaces, proyectos, clientes, agent_runs, contratos…) | ❌ No existen | Solo `supabase/migrations/0001_profiles.sql`; ninguna de las ~12 tablas de la Sección 7 está creada |
| OpenRouter / LLM | ⚠️ Token configurado, sin uso | `OPENROUTER_API_KEY` presente en `.env.local`, 0 referencias en el código |
| Telegram bot | ⚠️ Token configurado, sin uso | `TELEGRAM_BOT_TOKEN` presente en `.env.local`, 0 referencias en el código |
| 7 agentes A2A / smart contracts / CLI generator | ❌ No implementados | No existen en `src/`; no hay rutas `src/app/api` |
| Flow Advisor | ✅ Implementado con **reglas deterministas** (no LLM) | `src/features/dashboard/lib/flowAdvisor.ts` |

### Lo que SÍ existe hoy (Fase 0)
- Autenticación completa de Supabase (login, signup, reset, callback) + tabla `profiles`.
- Dashboard del Cliente Desarrollador como **prototipo 100% in-memory** (Zustand): workspaces,
  proyectos, clientes finales, discovery wizard, flow builder (drag & drop), flow advisor por
  reglas, conversation preview y editor de Cliente Final. Los datos se pierden al recargar.

### Roadmap de fases
- **Fase 0 (actual):** auth + dashboard prototipo in-memory.
- **Fase 1 (próxima):** persistir a Supabase (`workspaces`, `proyectos`, `clientes_finales` + RLS).
- **Fase 2:** conectar LLM real vía OpenRouter (Discovery / Flow Advisor razonando, no reglas fijas).
- **Fase 3:** integración Telegram + canales + generación de handlers (CLI generator).

> El detalle vivo de este estado se mantiene en `.claude/memory/` (ver
> `reference/integraciones-pendientes.md` y `project/dashboard-flow-advisor.md`).

---

## 0. Actores y Canales de Comunicación

> Tres actores distintos. Canales no intercambiables. La arquitectura multi-canal es nativa desde Fase 1.

| Actor | Quién es | Canal con la plataforma | Canal con el bot |
|-------|---------|------------------------|-----------------|
| **a2abot** (mi empresa) | Opera la plataforma, supervisa soporte | — | — |
| **Cliente Desarrollador** | Dev freelance/agencia que construye bots | **Telegram** (interactúa con Discovery Agent, Triage Agent) + Dashboard web (HITL 1, pipeline) | N/A — él construye, no usa el bot final |
| **Cliente Final** | Empresa que compra el bot al Cliente Desarrollador | **Dashboard personalizado** por caso de uso (acceso propio, no el mismo del desarrollador) | **Multi-canal**: Telegram, WhatsApp, Slack, Discord, web chat — definido en el scope del proyecto |

### Planos de conversación

```
Plano 1 — Construcción (A2A):
  Cliente Desarrollador (Telegram) ↔ Discovery Agent / Triage Agent
  → resultado: bot configurado para el Cliente Final

Plano 2 — Operación (multi-canal):
  Usuario final del Cliente Final ↔ Bot en producción
  → canales: los definidos en scope.json del proyecto

Plano 3 — Supervisión:
  Cliente Desarrollador (HITL 1 web) → observa pipeline de sus bots
  Cliente Final (dashboard personalizado) → observa métricas de su bot
  a2abot (HITL 2 web, cross-tenant) → soporte y supervisión global
```

### Implicaciones arquitecturales

- **a2abot necesita su propio bot de Telegram** como interfaz primaria del Cliente Desarrollador con los agentes (Discovery, Triage). El dashboard web es complementario.
- **CLI Generator produce handlers multi-canal desde el inicio** — no adaptadores posteriores. El canal es una dimensión del scope, no un add-on.
- **El dashboard del Cliente Final es un artefacto del proyecto**, no una vista del dashboard del desarrollador. Se genera/configura como parte del pipeline de construcción.
- Los tres dashboards (HITL 1 del desarrollador, HITL 2 interno, dashboard del Cliente Final) comparten Supabase pero tienen RLS completamente distintos.

---

## 1. Problema de Negocio

**Dolor:** Construir y mantener un bot conversacional confiable es lento, frágil y riesgoso para desarrolladores que los venden a empresas. Cada proyecto se construye desde cero, los bugs aparecen en producción frente a usuarios reales, y cualquier cambio de negocio requiere ciclos manuales de especificación → código → prueba → deploy.

**Costo actual (tarifa base $45 USD/hora):**

| Categoría | Estimado/mes |
|-----------|-------------|
| Reparación de errores (3 incidentes × 6h) | ~$810 USD |
| Mantenimiento por cambios de negocio (3 cambios × 4h) | ~$540 USD |
| Costo de oportunidad sin mejora continua (100 conv escaladas × $2.50) | ~$250 USD |
| **Total mensual sin plataforma** | **~$1,600 USD** |

**Comparación directa:**

| | Sin plataforma | Con plataforma |
|--|---------------|---------------|
| Construcción inicial | ~$9,000 (10 semanas) | Fee por complejidad (ver Sección 10) |
| Costo mensual recurrente | ~$1,600/mes | $49–499/mes + overage marginal |

---

## 2. Solución

**Propuesta de valor:** Una plataforma A2A que convierte la construcción de bots de Telegram de "código que se escribe" en una cadena de agentes que se entrevistan entre sí hasta producir un artefacto verificado — con el humano observando pero sin bloquear el pipeline.

**Decisiones de arquitectura confirmadas:**

| Decisión | Elección | Razón |
|----------|---------|-------|
| MVP: estructura de agentes | Orquestador único con contratos Zod | Valida el flujo antes de pagar costo de distribución. Listo para extraer a microservicios en Fase 2 |
| Motor de auto-mejora | Learning Agent propio (sin Hermes) | Sin dependencia externa en el núcleo del producto. Formato agentskills.io para portabilidad |
| Multi-tenant | Agentes compartidos + contextId por proyecto | 50 clientes = 1 infraestructura. Aislamiento de datos via RLS, no de procesos |
| Discovery | Una sola vez por proyecto | Discovery es un contrato, no un documento vivo. El contextId cierra al terminar |
| Learnings → formato | CLIs ejecutables via cli-printing-press | La memoria es código que el sistema se escribe a sí mismo, no solo registros en BD |

---

## 3. Los Siete Agentes

| # | Agente | Skill A2A | Responsabilidad |
|---|--------|-----------|-----------------|
| 1 | Discovery Agent | `scope-discovery` | Negocia alcance en lenguaje natural → scope.json validado con Zod. Corre una sola vez por proyecto |
| 2 | Token Optimization Agent | `token-routing` | Web search de precios y benchmarks vigentes en OpenRouter → routing_plan.json. También corre como cron periódico |
| 3 | Conversation Designer Agent | `flow-design` | Máquina de estados conversacional + patrones reutilizables + variantes ES/EN |
| 4 | CLI Generator Agent | `cli-generation` | cli-printing-press → motor conversacional agnóstico de canal + adaptadores por canal (Telegram, WhatsApp, Slack, Discord, web chat). También traduce skills aprendidas en Fase 3 |
| 5 | QA/Validator Agent | `qa-validate` | A2A TCK + Playwright E2E. Ciclo de corrección A2A sin intervención humana |
| 6 | Learning Agent | `feedback-to-skill` | Trazas → patrones → agentskills.io → CLI Generator |
| 7 | Triage Agent | `support-triage` | Router A2A: clasifica peticiones del cliente desarrollador y delega en agentes existentes |

**Protocolo:** JSON-RPC, AgentCards, estados `submitted → working → completed`, SSE streaming. AgentCards y prompts internos en inglés. Contenido conversacional del bot en ES/EN.

---

## 4. Flujo Principal (Happy Path)

### Onboarding

```
1. Cliente desarrollador se autentica → JWT: { cliente_id, rol: 'supervisor' }
2. Crea nuevo proyecto → sistema genera contextId único
   → Clasificación: (país, idioma, tema del catálogo controlado)
   → Complejidad detectada automáticamente por Discovery (simple | standard | complex)
   → Fee de construcción calculado y cobrado antes de iniciar pipeline
3. Discovery Agent (una sola vez)
   → Entrevista en lenguaje natural
   → scope.json validado con Zod
   → complexity_signals.json (ver Sección 10)
   → contextId pasa a estado 'scoped'
```

### Pipeline de construcción A2A

```
4. Token Optimization Agent
   → Web search de precios OpenRouter vigentes
   → routing_plan.json (modelo económico vs avanzado por paso)
   → Validado Zod → entregado al Designer

5. Conversation Designer Agent
   → scope.json + routing_plan.json
   → Máquina de estados conversacional con variantes ES/EN
   → Patrones del catálogo: saludo, clarificación, escalamiento, cierre, error recovery
   → flow.json validado con Zod

6. CLI Generator Agent
   → flow.json → motor conversacional agnóstico de canal (núcleo)
   → Genera adaptador por cada canal definido en scope.json:
      - telegram_adapter.ts
      - whatsapp_adapter.ts
      - slack_adapter.ts
      - discord_adapter.ts
      - webchat_adapter.ts
   → Si client_dashboard_required: genera scaffold del dashboard del Cliente Final
   → Hereda CLIs del catálogo de conocimiento base del vertical
   → Output: CLI ejecutable del bot + adaptadores + dashboard (si aplica)

7. QA/Validator Agent
   → A2A Inspector/TCK (validación protocolo)
   → Playwright: conversaciones simuladas contra bot real de Telegram
   → Falla → regresa al Designer (ciclo A2A, sin humano)
   → Pasa → aprueba deploy

8. Deploy Agent
   → Publica a Vercel + registra en Telegram
   → Notifica al dashboard HITL 1
   → contextId pasa a estado 'deployed'
```

### Auto-mejora continua

```
9. Bot en producción → trazas en conversation_traces
10. Learning Agent (cron)
    → Trazas → patrones (OpenRouter económico)
    → agentskills.io → skills_aprendidas
11. CLI Generator Agent
    → Skills → CLIs reales (cli-printing-press)
    → CLIs al repositorio de conocimiento base
    → Equipo interno aprueba antes de promover al catálogo compartido
12. Siguiente proyecto mismo vertical hereda CLIs probadas
```

---

## 5. Los Dos HITL

| | HITL 1 | HITL 2 |
|---|--------|--------|
| **Conversación** | Agentes A2A entre sí | Cliente desarrollador ↔ Triage Agent |
| **Observador** | Cliente desarrollador (supervisor) | Equipo interno de la plataforma |
| **Qué supervisa** | Pipeline de construcción de su bot | Soporte/troubleshooting cross-tenant |
| **Scope RLS** | Per-client (filtrado por cliente_id) | Cross-tenant (equipo interno ve todos) |
| **Modo** | Solo lectura, puede pausar | Observación + intervención cuando Triage escala |

### Triage Agent — lógica de delegación

```
Petición del cliente desarrollador (texto libre, ES/EN)
  ↓ clasificación Zod estructurada
  ├── Bug lógica conversacional → Designer (modo diagnóstico, nodo específico)
  ├── Falla despliegue/generación → Generator o QA (re-validación)
  ├── Duda costos/modelo → Token Optimization Agent
  └── No automatizable → ticket escalado al equipo interno (HITL 2 activo)
```

---

## 6. Usuario Objetivo

**Rol:** Desarrollador freelance o de agencia que construye y vende bots de Telegram a empresas.

**Escala:** Global — múltiples países, múltiples desarrolladores, múltiples proyectos por desarrollador, todos contribuyendo al catálogo central de skills por vertical (de forma curada, nunca automática entre clientes).

**Modelo workspace:**
- Un workspace por cliente desarrollador
- N proyectos por workspace (controlado por plan de suscripción)
- Rol `supervisor` ve todos sus proyectos con selector + vista resumen de salud
- `activeProjectId` en Zustand para el estado de navegación del dashboard

---

## 7. Arquitectura de Datos (Supabase)

```sql
-- Identidad
workspaces
  id, cliente_id (FK), nombre, created_at

usuarios
  id, auth_uid, cliente_id, rol ('supervisor' | 'equipo_interno_hitl' | 'admin')

-- Suscripción y límites
suscripciones
  id, workspace_id (FK), plan ('starter'|'growth'|'agency'|'enterprise'),
  limite_proyectos, conversaciones_incluidas_mes,
  regeneraciones_mayores_incluidas_anio,
  periodo_inicio, periodo_fin

-- Proyectos
proyectos
  id, workspace_id (FK), context_id (A2A),
  pais, idioma, tema (catálogo controlado),
  complejidad ('simple'|'standard'|'complex'),
  estado ('scoped'|'building'|'deployed'|'archived'),
  routing_plan (jsonb), created_at

-- Facturación de eventos
eventos_facturacion
  id, workspace_id (FK), proyecto_id (FK),
  tipo ('construccion'|'regeneracion_menor'|'regeneracion_mayor'|'overage_conv'),
  monto_usd, metadata (jsonb), created_at

-- Trazas de agentes
agent_runs
  id, proyecto_id (FK), agent_type, status,
  input (jsonb), output (jsonb), created_at

-- Conversaciones del bot en producción
conversation_traces
  id, proyecto_id (FK), session_id, messages (jsonb),
  escalated (bool), idioma, created_at

-- Skills aprendidas
skills_aprendidas
  id, proyecto_id (FK), tema, contenido_skill (jsonb, agentskills.io),
  version, origen ('feedback'|'manual'),
  promovida_al_catalogo (bool), created_at

-- AgentCards
agent_cards
  id, proyecto_id (FK), agent_type, card_json (jsonb), created_at

-- HITL 2 soporte
hilos_soporte
  id, proyecto_id (FK), cliente_desarrollador_id, idioma,
  clasificacion, agente_delegado,
  estado ('abierto'|'escalado'|'resuelto'), created_at

mensajes_soporte
  id, hilo_id (FK), emisor ('cliente_dev'|'agente_triage'|'agente_delegado'),
  contenido, created_at
```

### Políticas RLS clave

```sql
-- Supervisor: solo su workspace
CREATE POLICY "supervisor_own_workspace" ON proyectos
  USING (workspace_id IN (
    SELECT id FROM workspaces
    WHERE cliente_id = (auth.jwt() ->> 'cliente_id')::uuid
  ));

-- Equipo interno: cross-tenant
CREATE POLICY "equipo_interno_cross_tenant" ON hilos_soporte
  USING ((auth.jwt() ->> 'rol') = 'equipo_interno_hitl');

-- Check antes de crear proyecto nuevo
SELECT COUNT(*) FROM proyectos
WHERE workspace_id = $1 AND estado != 'archived';
-- Si >= suscripciones.limite_proyectos → bloqueo con mensaje de upgrade
```

**Nota:** `equipo_interno_hitl` es un rol separado en Supabase Auth, no un flag dentro del rol de cliente.

**Campo `tema`:** Catálogo controlado (no texto libre). Skills del mismo tema se pueden sugerir entre proyectos del mismo cliente (opt-in simple) o entre clientes distintos (aprobación curada por equipo interno).

---

## 8. Multi-proyecto por workspace

- Proyectos del mismo cliente comparten `workspace_id` pero **no** comparten `contextId`, memoria ni skills automáticamente
- Promoción de skills entre proyectos del mismo cliente: opt-in simple (mismo dueño de datos)
- Promoción cross-cliente: siempre curada por equipo interno
- Vista interna (HITL 2): agrupación `workspace → N proyectos → estado` — un `GROUP BY workspace_id` sobre `proyectos`

---

## 9. Bilingüe ES/EN

| Capa | Estrategia |
|------|-----------|
| Conversación del bot (usuario final) | Flow con variantes ES/EN; detección automática por primer mensaje |
| AgentCards y prompts A2A internos | Inglés (máxima interoperabilidad del protocolo) |
| Dashboard HITL 1 y 2 | next-intl — switch ES/EN independiente del idioma del bot supervisado |

---

## 10. Modelo de Pricing

### Dimensiones de complejidad

El Discovery Agent produce `complexity_signals.json` al cerrar la entrevista. Este JSON determina el tier de complejidad del proyecto y el fee de construcción.

```typescript
// complexity_signals.json (validado con Zod)
{
  intent_count: number,           // intents reconocidos
  integration_count: number,      // integraciones externas (CRM, ERP, APIs)
  compliance_flags: string[],     // ['PII', 'GDPR', 'HIPAA', 'financiero']
  conversation_depth: 'simple' | 'standard' | 'complex',  // turnos promedio
  languages: number,              // idiomas soportados
  handoff_required: boolean,      // requiere escalamiento a humano
  channels: string[],             // ['telegram', 'whatsapp', 'slack', 'discord', 'webchat']
  channel_count: number,          // número de canales activos (impacta complejidad)
  client_dashboard_required: boolean  // si el Cliente Final necesita dashboard propio
}
```

**Algoritmo de clasificación:**

| Tier | Criterios |
|------|-----------|
| **Simple** | intents ≤ 10, integrations = 0, sin compliance, depth = 'simple', 1 idioma, 1 canal, sin dashboard Cliente Final |
| **Standard** | intents 11–30, integrations 1–2, compliance básico (PII), depth = 'standard', hasta 2 canales |
| **Complex** | intents > 30, integrations ≥ 3, compliance regulado (GDPR/HIPAA/financiero), depth = 'complex', multilenguaje, handoff requerido, 3+ canales o dashboard Cliente Final personalizado |

---

### Fee de Construcción (evento único por proyecto)

> Cubre: Discovery → Token Optimization → Designer → Generator → QA → Deploy inicial.
> Se cobra antes de iniciar el pipeline. No es parte de la suscripción mensual.

| Complejidad | Fee de Construcción |
|-------------|-------------------|
| Simple | $199 USD |
| Standard | $499 USD |
| Complex | $999 USD |

**Fee de regeneración mayor** (cambio estructural que dispara un nuevo ciclo parcial Designer → Generator → QA):

| Complejidad del proyecto | Fee por regeneración mayor |
|--------------------------|--------------------------|
| Simple | $49 USD |
| Standard | $99 USD |
| Complex | $199 USD |

**Fee de regeneración menor** (cambio en 1–3 nodos, QA solamente):

| Complejidad del proyecto | Fee por regeneración menor |
|--------------------------|--------------------------|
| Simple | $19 USD |
| Standard | $39 USD |
| Complex | $79 USD |

---

### Suscripción Mensual (uso recurrente)

> Cubre: conversaciones incluidas + acceso al dashboard + Learning Agent + soporte via Triage.

| Plan | Proyectos activos | Conversaciones incluidas/mes | Regeneraciones mayores incluidas/año | Precio/mes |
|------|-------------------|-----------------------------|------------------------------------|-----------|
| **Starter** | 1 | 500 | 0 (pago por evento) | $49 |
| **Growth** | 3 | 2,000 | 1 por proyecto | $149 |
| **Agency** | 10 | 10,000 | 2 por proyecto | $499 |
| **Enterprise** | Ilimitado | Custom | Custom | Custom |

**Overage de conversaciones:** $0.06 USD/conversación adicional (~$0.044 costo + 36% margen).

**Límite de proyectos:** Bloqueo duro al intentar crear un proyecto que excede el límite del plan. El sistema muestra opción de upgrade antes de bloquear.

---

### Modelo para Agencias (sub-clientes)

La agencia paga:
1. **Fee de construcción** por cada nuevo sub-cliente que incorpora (evento)
2. **Suscripción mensual** según el volumen real de conversaciones de todos sus sub-clientes

Esto separa limpiamente el costo de adquisición de clientes (construcción = ráfaga) del costo de operación (recurrente = variable con el uso real).

---

### Pricing por Volumen de Transacciones

> Una conversación y una transacción son eventos de distinto valor. Las conversaciones son intercambios de mensajes; las transacciones son ejecuciones de `BusinessContract.execute()` — acciones con consecuencia real (cotización emitida, póliza generada, pago procesado, expediente abierto). Se cobran por separado porque su costo y valor varían independientemente del volumen conversacional.

**Tipos de evento:**

| Tipo | Qué es | Ejemplo |
|------|--------|---------|
| **Conversación** | Intercambio de mensajes LLM — ya cubierto por suscripción + overage | FAQ, captura de datos, clarificación |
| **Validación** (`validate()`) | Contrato ejecuta reglas, no produce artefacto externo | Verificar elegibilidad, chequear invariantes |
| **Transacción** (`execute()`) | Contrato produce artefacto con consecuencia real + audit trail | Emitir cotización, procesar pago, abrir expediente |

**Validaciones incluidas por plan** (sin costo adicional):

| Plan | Validaciones incluidas/mes | Excedente |
|------|--------------------------|-----------|
| Starter | 200 | $0.05 c/u |
| Growth | 1,000 | $0.04 c/u |
| Agency | 5,000 | $0.03 c/u |
| Enterprise | Custom | Negociado |

**Transacciones — precio por tier de complejidad del proyecto:**

| Tier del proyecto | Precio por transacción ejecutada |
|-------------------|--------------------------------|
| Simple | $0.10 USD |
| Standard | $0.25 USD |
| Complex | $0.50 USD |

**Transacciones de alto valor** (consecuencia financiera o legal directa — ej. pago procesado, póliza emitida, endoso firmado):

| Tier del proyecto | Precio |
|-------------------|--------|
| Simple | $0.30 USD |
| Standard | $0.75 USD |
| Complex | $1.50 USD |

> La distinción entre transacción estándar y de alto valor se define en el `scope.json` por el Designer Agent (`high_value: true` en el nodo de ejecución). El Cliente Desarrollador la revisa y confirma antes del deploy.

**¿Por qué este modelo escala bien con complejidad variable?**

Un bot de FAQ e-commerce (Simple) puede tener 0 transacciones de alto valor y 5,000 conversaciones/mes — paga principalmente por overage de conversación. Un bot de seguros (Complex) puede tener 300 conversaciones/mes pero 280 cotizaciones + 50 pólizas emitidas — paga principalmente por transacciones. El modelo captura el valor real en cada caso sin subsidiar uno con el otro.

---

### Proyección de Unit Economics (caso Starter con uso real)

| Escenario | Ingresos | Costo estimado | Margen |
|-----------|---------|---------------|--------|
| 1 proyecto Simple + 500 conv/mes | $199 (construcción) + $49/mes | ~$80/mes operación | ~39% recurrente |
| 1 proyecto Standard + 2,000 conv/mes (Growth) | $499 + $149/mes | ~$120/mes | ~19% recurrente |
| Agencia con 10 proyectos + 10,000 conv/mes | fees construcción + $499/mes | ~$350/mes | ~30% recurrente |

> Estos números son estimados del piloto — el objetivo es reemplazarlos con datos medidos al cerrar el primer cliente.

---

## 11. Smart Contracts (Business Logic Services)

> Capa determinística entre el LLM y las acciones sensibles. El modelo nunca ejecuta directamente una acción con consecuencia real — solo conduce la conversación hasta el punto donde delega al contrato.

### Principio

```
LLM → conduce conversación → nodo sensible → invoca BusinessContract.validate()
                                                    ↓
                              'approved' → ejecuta acción
                              'blocked'  → escala a humano o respuesta de rechazo
                              'pending'  → solicita dato faltante al usuario
```

Esto convierte el riesgo #5 (alucinación en cotización) de *"¿el modelo recordó el precio correcto?"* en *"¿el contrato implementó las reglas correctamente?"* — y eso se verifica con pruebas unitarias normales de TypeScript, no con evaluación de comportamiento de LLM.

### Interfaz base (generada por CLI Generator Agent)

```typescript
// Validado con Zod. Generado por cli-printing-press a partir del scope.json del proyecto.
export interface ContractInput {
  context: Record<string, unknown>   // datos capturados por el LLM hasta ese nodo
  actor: 'agente_diseñador' | 'agente_generador' | 'humano_hitl'
  task_id: string                    // contextId A2A de la tarea en curso
}

export type ContractResult =
  | { status: 'approved'; payload: Record<string, unknown>; reason: string }
  | { status: 'blocked';  reason: string; escalate_to: 'human' | 'error_node' }
  | { status: 'pending';  missing_fields: string[] }

export abstract class BusinessContract {
  abstract name: string
  abstract version: string
  abstract tema: string              // clave del catálogo controlado

  // Valida invariantes de negocio — nunca tiene efectos secundarios
  abstract validate(input: ContractInput): Promise<ContractResult>

  // Ejecuta la acción sensible solo si validate() retornó 'approved'
  abstract execute(
    approved: Extract<ContractResult, { status: 'approved' }>,
    input: ContractInput
  ): Promise<void>
}
```

### Quién genera y quién valida

| Agente | Rol en Smart Contracts |
|--------|----------------------|
| **Discovery Agent** | Extrae reglas de negocio del cliente → `invariantes[]` en scope.json |
| **Designer Agent** | Marca nodos del grafo conversacional como `contract_required: true` + `contract_type` |
| **CLI Generator** | Escafolda clase TypeScript concreta por cada contrato vía cli-printing-press |
| **QA Agent** | Corre pruebas deterministas contra el contrato (TS normal, no evaluación de LLM) |

### Ejemplo: contrato de cotización de seguros de auto

```typescript
// Generado automáticamente. Reglas extraídas del Discovery del cliente.
export class CotizacionAutoContract extends BusinessContract {
  name = 'cotizacion-auto'
  version = '1.0.0'
  tema = 'seguros-auto'

  async validate(input: ContractInput): Promise<ContractResult> {
    const { vehicle_year, coverage_type, driver_age } = input.context

    // Invariante: no asegurar vehículos con más de 15 años
    if (new Date().getFullYear() - Number(vehicle_year) > 15) {
      return { status: 'blocked', reason: 'vehicle_too_old', escalate_to: 'human' }
    }
    // Invariante regulatorio MX: menores de 21 años requieren aprobación manual
    if (Number(driver_age) < 21) {
      return { status: 'blocked', reason: 'underage_driver_requires_human', escalate_to: 'human' }
    }
    // Campos faltantes
    if (!coverage_type) {
      return { status: 'pending', missing_fields: ['coverage_type'] }
    }

    return { status: 'approved', payload: { quote_id: crypto.randomUUID(), ... }, reason: 'all_invariants_passed' }
  }

  async execute(approved, input) {
    // Persiste en contract_executions — audit trail inmutable
  }
}
```

### Contratos como activo del catálogo

Los contratos de negocio genéricos (ej. "cotización de auto compliant con regulación mexicana") son reutilizables entre clientes del mismo `tema` **sin restricción de confidencialidad** — son lógica de negocio genérica, no aprendizaje derivado de datos de un cliente específico. Esto los diferencia del catálogo de skills y los hace un activo comercializable de marca blanca con menor fricción.

### Ajuste al esquema de Supabase

```sql
-- Catálogo de tipos de contrato, reutilizable por tema
contratos_negocio
  id, tema, nombre, version,
  invariantes (jsonb),  -- reglas extraídas del Discovery, auditables
  created_at

-- Audit trail inmutable — solo INSERT, nunca UPDATE
contract_executions
  id, proyecto_id (FK), contrato_id (FK), task_id (A2A),
  estado ('pending' | 'approved' | 'blocked' | 'executed'),
  input (jsonb), output (jsonb), ejecutado_por, created_at

-- Guards de invocación por rol
contrato_permisos
  id, contrato_id (FK),
  rol_permitido ('agente_diseñador' | 'agente_generador' | 'humano_hitl')
```

`contract_executions` es append-only. Es el registro que demuestra ante un regulador o en una disputa que la cotización siguió las reglas vigentes en ese momento exacto.

---

## 12. Catálogo de Temas Permitidos (Topic Allowlist)

> Antes de iniciar cualquier pipeline, el sistema valida si el tema solicitado está habilitado para ese país. Gestionado exclusivamente por a2abot. Modificable sin redeploy.

### TopicAllowlistContract — la primera validación del pipeline

```
Cliente Desarrollador solicita nuevo proyecto (tema + país)
  ↓
🔒 [TOPIC_ALLOWLIST] — TopicAllowlistContract.validate()
  ├── rojo (global)      → 'blocked' → FIN
  ├── amarillo (global)  → 'pending' → notificación a equipo a2abot para revisión manual
  │                                    pipeline inicia solo tras aprobación
  ├── verde + override bloqueado para ese país → 'blocked' → FIN
  ├── verde + override amarillo para ese país  → 'pending' → revisión manual
  └── verde sin override restrictivo           → 'approved' → Discovery Agent arranca
```

### Esquema de riesgo (C: global + override por país)

| Nivel | Color | Significado | Quién decide |
|-------|-------|-------------|-------------|
| Global verde | ✅ | Habilitado en todos los países por defecto | a2abot |
| Global amarillo | ⚠️ | Permitido con revisión previa por proyecto | a2abot |
| Global rojo | 🚫 | Bloqueado en toda la plataforma | a2abot |
| Override verde | ✅ | Habilitado en ese país (excepción a amarillo/rojo global) | a2abot |
| Override amarillo | ⚠️ | Revisión extra en ese país aunque sea verde global | a2abot |
| Override rojo | 🚫 | Bloqueado en ese país aunque sea verde global | a2abot |

### Clasificación inicial de temas

| Tema | Riesgo global | Override ejemplo | Razón |
|------|--------------|-----------------|-------|
| Soporte e-commerce (FAQ, pedidos, devoluciones) | ✅ verde | — | Bajo riesgo legal/fiscal |
| Reservaciones (restaurantes, hoteles, citas) | ✅ verde | — | Bajo riesgo |
| RRHH interno (FAQ empleados, onboarding) | ✅ verde | — | Bajo riesgo |
| Cotización de seguros (auto, vida, gastos médicos) | ⚠️ amarillo | 🚫 países sin regulación definida | Riesgo regulatorio CNSF/SBS/SSF |
| Trámites gubernamentales / orientación fiscal | ⚠️ amarillo | ✅ MX con restricciones | Riesgo asesoría fiscal sin licencia |
| Cobranza / negociación de deuda | ⚠️ amarillo | 🚫 PE, CO | Leyes de cobranza estrictas |
| Diagnóstico médico / recomendación de medicamentos | 🚫 rojo | — | Riesgo de salud, sin excepciones |
| Asesoría legal vinculante | 🚫 rojo | — | Ejercicio ilegal de la abogacía |
| Trading / inversiones / criptomonedas | 🚫 rojo | ✅ jurisdicciones con sandbox regulatorio | Riesgo CNBV/SEC |

> Catálogo actualizado por a2abot conforme la empresa crece, entra a nuevos mercados o identifica nuevos riesgos. Solo requiere actualización de registros en Supabase por rol `admin` — sin redeploy.

### Supabase

```sql
temas_permitidos
  id, tema, nombre_display,
  riesgo_global ('verde' | 'amarillo' | 'rojo'),
  notas_legales text, activo bool, updated_at, updated_by

temas_overrides_pais
  id, tema_id (FK), pais_iso2,
  riesgo_override ('verde' | 'amarillo' | 'rojo'),
  notas text, activo bool, updated_at, updated_by

topic_reviews
  id, proyecto_id (FK), tema_id (FK), pais_iso2,
  estado ('pendiente' | 'aprobado' | 'rechazado'),
  revisado_por, notas_revision, created_at, updated_at
```

```typescript
// Algoritmo de resolución en TopicAllowlistContract
function resolveRisk(tema: string, pais: string): 'verde' | 'amarillo' | 'rojo' {
  const global = temas_permitidos.find(tema).riesgo_global
  const override = temas_overrides_pais.find(tema, pais)?.riesgo_override
  return override ?? global  // override siempre gana sobre global
}
```

---

## 13. Diagrama de Flujo — Patrón Genérico (cualquier vertical)

> El Conversation Designer genera este grafo para cada proyecto a partir del `scope.json` del Discovery. El ejemplo de seguros de auto es una instancia de referencia, no el único caso.

### Leyenda

```
🤖 [NODO]   LLM conduce la conversación libremente
🔒 [NODO]   Contrato determinístico — el contrato valida/ejecuta, el LLM no decide
👤          Escalado a agente humano — bot transfiere contexto y se detiene
```

### Patrón base

```
ENTRADA (canal definido en scope.json: Telegram / WhatsApp / Slack / Discord / webchat)
  ↓
🤖 [SALUDO]
    Detecta idioma, saluda, detecta intent principal
    ↓
🤖 [CAPTURA_CONTEXTO]
    Recopila datos necesarios para el intent (campos definidos en scope.json)
    Iteraciones de clarificación si respuesta ambigua o incompleta
    ↓
🔒 [VALIDACION_ELEGIBILIDAD]   ← ¿puede el sistema atender este caso?
    ├── 'blocked' (fuera de scope)   → 🤖 [EXPLICACION_LIMITE] → FIN o 👤
    ├── 'pending' (datos faltantes)  → 🤖 [CLARIFICACION] → vuelve a CAPTURA_CONTEXTO
    └── 'approved'
          ↓
    🤖 [PRESENTACION_OPCIONES]
        LLM explica opciones, responde preguntas libres, maneja objeciones
        ↓ usuario elige y confirma
        ↓
    🔒 [VALIDACION_NEGOCIO]   ← ¿la elección cumple invariantes de negocio?
        ├── 'blocked' (regla de negocio)  → 🤖 [RECHAZO_EXPLICADO] → alternativa
        ├── 'blocked' (requiere humano)   → 👤 [ESCALADO_HUMANO]
        ├── 'pending' (dato faltante)     → 🤖 [CLARIFICACION] → vuelve
        └── 'approved'
              ↓
        🤖 [CONFIRMACION_FINAL]
            Resume la acción a ejecutar, pide confirmación explícita
            ↓ usuario confirma
            ↓
        🔒 [EJECUCION_ACCION]   ← acción con consecuencia real
            Persiste en contract_executions (audit trail inmutable)
            ├── error técnico → 🤖 [MANEJO_ERROR] → reintento o 👤
            └── éxito
                  ↓
            🤖 [CIERRE_EXITOSO]
                Confirma resultado, entrega comprobante/referencia, próximos pasos
                → FIN de sesión
```

### Nodos globales (presentes en todo proyecto)

```
🤖 [ERROR_RECOVERY]
    Activa tras 2 respuestas fuera de contexto o intentos fallidos consecutivos
    → ofrece reiniciar o 👤 escalado

🤖 [DESPEDIDA]
    Cierre por inactividad (timeout configurable por proyecto en scope.json)

👤 [ESCALADO_HUMANO]   nodo terminal para el bot en esa sesión
    Transfiere al agente humano:
      - Historial completo de mensajes
      - Nodo donde se detuvo el flujo
      - contract_executions pendientes o bloqueados
      - Motivo del escalado (clasificado por el contrato)
    El bot no re-interviene hasta que el humano cierra el escalado
```

### Cómo se instancia por proyecto

```
scope.json (Discovery)
  └── intents[]         → Designer genera un sub-flujo por intent
  └── contract_rules[]  → Generator escafolda un BusinessContract por nodo sensible
  └── channels[]        → Generator produce adaptador por canal
  └── handoff_required  → si true, ESCALADO_HUMANO siempre disponible

Grafo final = patrón base × N intents × M contratos × K canales
```

### Instancia de referencia: seguros de auto (MX)

```
scope.json del proyecto:
  intents: ['cotizar', 'modificar_poliza', 'reportar_siniestro', 'pagar']
  channels: ['telegram', 'webchat']
  client_dashboard_required: true
  complejidad: 'complex' → fee de construcción $999

Contratos generados por el CLI Generator:
  CotizacionAutoContract      → VALIDACION_NEGOCIO en flujo 'cotizar'
  RegulacionMXContract        → VALIDACION_ELEGIBILIDAD (restricción CNSF)
  EmisionPolizaContract       → EJECUCION_ACCION en flujo 'cotizar'
  PagoContract                → EJECUCION_ACCION en flujos 'cotizar' y 'pagar'
  PolizaVerificacionContract  → VALIDACION_ELEGIBILIDAD en 'modificar_poliza'
  ModificacionContract        → VALIDACION_NEGOCIO en 'modificar_poliza'
  SiniestroContract           → VALIDACION_ELEGIBILIDAD en 'reportar_siniestro'
  ExpedienteContract          → EJECUCION_ACCION en 'reportar_siniestro'
```

---

## 14. Capa de Control y Trazabilidad de Tokens

> Tres vistas distintas del mismo gasto en tokens. Cada actor ve solo lo que le corresponde. El Token Optimization Agent ya decide qué modelo usar — esta capa registra, controla y hace visible ese consumo.

### Los tres niveles de visibilidad

```
a2abot (mi empresa)
  └── Vista: TODOS los workspaces, todos los proyectos, todos los modelos
      Objetivo: controlar margen, detectar proyectos fuera de parámetro, facturar correctamente

Cliente Desarrollador
  └── Vista: solo su workspace → sus proyectos
      Objetivo: entender qué fase consume más, optimizar su propio uso, anticipar overage

Cliente Final
  └── Vista: solo su bot en producción → conversaciones de sus usuarios finales
      Objetivo: transparencia de uso, posible reporte para su propio cliente interno
```

### Qué se mide y quién paga cada tipo de token

| Tipo de token | Cuándo ocurre | Quién paga | Visible para |
|---------------|--------------|-----------|-------------|
| **Construcción** (Discovery, Designer, Generator, QA) | Pipeline inicial del proyecto | Cliente Desarrollador (fee de construcción) | Cliente Desarrollador + a2abot |
| **Regeneración** (ciclo parcial Designer → QA) | Cambio de scope | Cliente Desarrollador (fee de regeneración) | Cliente Desarrollador + a2abot |
| **Conversación** (bot en producción) | Cada mensaje del usuario final | Cliente Desarrollador (suscripción + overage) | Cliente Desarrollador + Cliente Final + a2abot |
| **Learning Agent** (análisis de trazas) | Cron periódico | a2abot absorbe (costo de plataforma) | Solo a2abot |
| **Token Optimization Agent** (web search + routing) | Creación de proyecto + cron | a2abot absorbe | Solo a2abot |
| **Triage Agent** (soporte desarrollador) | Canal de soporte | a2abot absorbe hasta umbral; overage al Cliente Desarrollador | Cliente Desarrollador + a2abot |

### Supabase — tablas de trazabilidad

```sql
-- Consumo por ejecución de agente (construcción, regeneración, learning, triage)
token_usage_agent
  id, proyecto_id (FK), agent_run_id (FK),
  agent_type, model_id, fase ('construccion'|'regeneracion'|'learning'|'triage'|'optimization'),
  tokens_input int, tokens_output int, tokens_total int,
  costo_usd numeric(10,6),   -- calculado al insertar con precio del modelo en ese momento
  created_at

-- Consumo por conversación del bot en producción
token_usage_conversacion
  id, proyecto_id (FK), session_id,
  model_id, canal ('telegram'|'whatsapp'|'slack'|'discord'|'webchat'),
  tokens_input int, tokens_output int, tokens_total int,
  costo_usd numeric(10,6),
  created_at

-- Presupuestos y alertas por workspace (gestionado por a2abot + Cliente Desarrollador)
token_budgets
  id, workspace_id (FK), proyecto_id (FK nullable),  -- null = límite global del workspace
  fase ('construccion'|'produccion'|'total'),
  limite_usd numeric(10,2),
  alerta_pct int default 80,   -- alerta cuando se alcanza este % del límite
  accion_al_limite ('alertar'|'bloquear'),
  activo bool, updated_at

-- Log de alertas disparadas
token_alerts
  id, workspace_id (FK), proyecto_id (FK nullable),
  tipo ('alerta_80pct'|'limite_alcanzado'|'overage_iniciado'),
  monto_consumido_usd numeric(10,2), limite_usd numeric(10,2),
  notificado_en ('dashboard'|'telegram'|'email'), created_at
```

### Vistas materializadas para dashboards (sin queries pesadas en tiempo real)

```sql
-- Vista a2abot: costo total por workspace este mes
CREATE MATERIALIZED VIEW mv_costo_workspace_mes AS
SELECT
  p.workspace_id,
  date_trunc('month', t.created_at) as mes,
  SUM(t.costo_usd) as costo_total_usd,
  SUM(t.tokens_total) as tokens_total,
  t.fase
FROM token_usage_agent t
JOIN proyectos p ON p.id = t.proyecto_id
GROUP BY p.workspace_id, mes, t.fase;

-- Vista Cliente Desarrollador: desglose por proyecto y fase
CREATE MATERIALIZED VIEW mv_costo_proyecto_fase AS
SELECT
  proyecto_id,
  date_trunc('month', created_at) as mes,
  fase, model_id,
  SUM(costo_usd) as costo_usd,
  SUM(tokens_total) as tokens
FROM token_usage_agent
GROUP BY proyecto_id, mes, fase, model_id;

-- Vista Cliente Final: conversaciones de su bot este mes
CREATE MATERIALIZED VIEW mv_costo_conversaciones_bot AS
SELECT
  proyecto_id, canal,
  date_trunc('month', created_at) as mes,
  COUNT(DISTINCT session_id) as conversaciones,
  SUM(tokens_total) as tokens,
  SUM(costo_usd) as costo_usd
FROM token_usage_conversacion
GROUP BY proyecto_id, canal, mes;
```

### Integración con el Token Optimization Agent

El routing plan que genera el Token Optimization Agent ya determina qué modelo usa cada paso. Ahora ese routing plan se convierte en **presupuesto estimado** antes de iniciar el pipeline:

```typescript
// Al generar el routing_plan.json, el Token Optimization Agent también produce:
{
  routing_plan: { ... },
  presupuesto_estimado: {
    construccion_usd: 2.40,    // suma de costo estimado por agente × tokens esperados
    produccion_usd_por_1k_conv: 0.044,
    modelo_economico: 'openrouter/mistral-7b',
    modelo_avanzado: 'openrouter/claude-sonnet-4-6',
    breakdown: [
      { agente: 'discovery',  modelo: 'avanzado', tokens_estimados: 8000 },
      { agente: 'designer',   modelo: 'avanzado', tokens_estimados: 12000 },
      { agente: 'generator',  modelo: 'economico', tokens_estimados: 5000 },
      { agente: 'qa',         modelo: 'economico', tokens_estimados: 3000 }
    ]
  }
}
```

El Cliente Desarrollador ve este presupuesto estimado **antes de confirmar** el inicio del pipeline. Si lo supera, puede ajustar el scope o aceptar el costo.

### Controles por nivel

**a2abot (admin):**
- Ve consumo real vs estimado por proyecto en tiempo real
- Puede fijar `token_budgets` globales por workspace
- Recibe alerta cuando un proyecto supera 2× el presupuesto estimado (posible bug o loop)
- Detecta proyectos con costo de producción que erosiona margen → señal para repricing

**Cliente Desarrollador (supervisor):**
- Ve desglose por fase: cuánto costó construir vs cuánto cuesta operar
- Ve consumo mensual acumulado vs límite del plan
- Recibe alerta vía Telegram cuando alcanza 80% del overage incluido
- Puede fijar `limite_usd` por proyecto para no sorprenderse en la factura

**Cliente Final (dashboard personalizado):**
- Ve conversaciones totales de sus usuarios este mes
- Ve distribución por canal (cuántas en Telegram vs webchat)
- Ve tasa de escalado a humano (correlacionada con tokens gastados en Triage)
- No ve costos en USD (es métrica operativa, no financiera, salvo acuerdo contractual específico)

### Ventajas de optimización de tokens para a2abot (la empresa)

> Los tokens que a2abot absorbe como costo de plataforma (Learning Agent, Token Optimization Agent, Triage Agent) son el margen que se come si no se gestionan. Estas son las palancas de optimización propias.

**1. Routing plan como activo compartido entre proyectos del mismo vertical**

El Token Optimization Agent genera un routing plan por proyecto, pero los proyectos del mismo `tema` tienden a converger al mismo plan óptimo. a2abot puede mantener un **routing plan base por vertical** en `temas_permitidos`, que se usa como punto de partida en lugar de redescubrir precios desde cero en cada proyecto nuevo. Esto reduce tokens consumidos por el Token Optimization Agent en ~60% para proyectos de verticales ya conocidos.

```sql
-- Se agrega a temas_permitidos
routing_plan_base (jsonb)  -- plan óptimo actual para este vertical
routing_plan_updated_at    -- fecha del último cron de actualización
```

**2. Prompt caching entre proyectos del mismo vertical**

Los prompts del sistema del Designer Agent y del Discovery Agent son casi idénticos para proyectos del mismo `tema`. Activar prompt caching en OpenRouter para estos prompts compartidos puede reducir el costo de tokens de construcción en 40–70% (el precio del cache hit es una fracción del precio full).

```typescript
// En el orquestador: detecta si el prompt del sistema ya tiene cache_control activo
// para el vertical actual y lo reutiliza en vez de enviar el prompt completo
const systemPrompt = verticalBasePrompts[tema] // prompt cacheado por vertical
```

**3. Detección de proyectos fuera de margen antes de que erosionen la cuenta**

Con `token_usage_agent` y `eventos_facturacion` correlacionados, a2abot puede calcular en tiempo real:

```
margen_por_proyecto = ingresos_proyecto - costo_tokens_absorbidos_proyecto

Si margen_por_proyecto < umbral_minimo:
  → alerta interna al equipo a2abot
  → revisar si el routing plan está suboptimizado
  → evaluar si el tier de complejidad fue mal clasificado (subiría el fee)
```

Esto convierte la trazabilidad de tokens en una herramienta de **pricing activo**: si un proyecto Complex consistentemente consume más de lo esperado, es señal de que el fee de construcción o el precio de transacciones necesita ajuste para ese vertical.

**4. Cron del Token Optimization Agent como ventaja competitiva de plataforma**

Mientras los clientes individuales pagan precios de lista en OpenRouter, a2abot corre el cron del Token Optimization Agent para *toda la plataforma* y actualiza los routing plans base de todos los verticales simultáneamente. Cuando OpenRouter lanza un modelo más barato o un modelo económico mejora su benchmark, a2abot lo captura automáticamente y todos los proyectos activos se benefician — sin que ningún Cliente Desarrollador tenga que hacer nada. Esta velocidad de reacción es difícil de replicar para un desarrollador individual.

**5. Modelo económico para tareas internas repetitivas**

Los costos absorbidos por a2abot (Learning Agent, Triage Agent, Token Optimization Agent) corren por defecto en el modelo económico del routing plan. El único que sube al modelo avanzado es cuando el Learning Agent detecta un patrón complejo que vale la pena consolidar como skill nueva — y eso ocurre con baja frecuencia. El resto del tiempo es procesamiento de trazas con Mistral o equivalente.

```
Distribución estimada del costo absorbido por a2abot:
  Learning Agent:           ~$0.002/proyecto/mes  (modelo económico)
  Token Optimization cron:  ~$0.010/vertical/mes  (web search + análisis)
  Triage Agent:             ~$0.015/ticket        (modelo económico hasta escalado)
```

**6. Visibilidad de eficiencia por agente**

a2abot puede identificar qué agente es el más costoso del pipeline y si ese costo es proporcional al valor que aporta:

```sql
SELECT agent_type,
       AVG(tokens_total) as tokens_promedio,
       AVG(costo_usd)    as costo_promedio,
       COUNT(*)          as ejecuciones
FROM token_usage_agent
WHERE created_at > now() - interval '30 days'
GROUP BY agent_type
ORDER BY costo_promedio DESC;
```

Si el Designer Agent consume 3× más que el Discovery en promedio, puede ser señal de que los prompts del Designer están sobredimensionados para proyectos Simple — candidato para un prompt más corto en ese tier.

**7. CLIs reutilizables como palanca de optimización compuesta**

Los CLIs generados por el CLI Generator Agent no son artefactos de un solo uso — son activos versionados del catálogo de conocimiento base, reutilizables en proyectos con casos de uso similares. Esta reutilización impacta directamente en tres costos simultáneos:

```
Proyecto nuevo del mismo vertical
  ↓
CLI Generator calcula "herencia score": % de CLIs ya existentes en el catálogo
  ├── herencia 0%   → generación completa  → costo base de tokens
  ├── herencia 50%  → generación parcial   → ~50% de tokens del Generator
  └── herencia 80%+ → solo delta nuevo     → ~20% de tokens del Generator
                                           + QA Agent corre solo sobre el delta
                                           + tiempo de construcción cae proporcionalmente
```

**Qué se reutiliza exactamente:**

| Artefacto CLI | Condición de reutilización | Tag en catálogo |
|---------------|--------------------------|-----------------|
| Adaptadores de canal (`telegram_adapter.ts`, etc.) | Siempre — son agnósticos al vertical | `canal:telegram`, `canal:whatsapp`, etc. |
| Patrones conversacionales base (saludo, error_recovery, despedida) | Siempre — son del patrón genérico | `patron:base` |
| Nodos de intent por vertical (`cotizar`, `reportar_siniestro`) | Mismo `tema` en el catálogo | `tema:seguros-auto`, `intent:cotizar` |
| Smart Contracts por vertical (`CotizacionAutoContract`) | Mismo `tema` + mismo país | `tema:seguros-auto`, `pais:MX` |
| Nodos de integración (CRM connector, webhook de pago) | Mismo tipo de integración | `integracion:stripe`, `integracion:hubspot` |

**Cómo impacta el pricing:**

El `herencia_score` se calcula antes de mostrar el fee de construcción al Cliente Desarrollador. Un proyecto Standard que hereda 70% de CLIs de proyectos anteriores puede costar menos en tokens reales que un proyecto Simple construido desde cero en un vertical nuevo — y eso se puede trasladar como descuento:

```typescript
// En el cálculo del fee de construcción
const feeBase = FEES_CONSTRUCCION[complejidad]          // $199 / $499 / $999
const descuentoHerencia = herencia_score * 0.3          // hasta 30% de descuento
const feeAplicado = feeBase * (1 - descuentoHerencia)   // se muestra al Cliente Desarrollador
const costoRealTokens = costoEstimado * (1 - herencia_score * 0.8)  // ahorro interno de a2abot
```

El margen de a2abot mejora con cada proyecto nuevo del mismo vertical: el fee baja moderadamente (atractivo para el cliente), pero el costo real de tokens baja mucho más. **El catálogo de CLIs es el activo que hace que la plataforma se vuelva más rentable con el tiempo, no solo más grande.**

**Supabase — extensión del catálogo de conocimiento base:**

```sql
-- Ya existente, se extiende con tags de herencia
skills_aprendidas
  ...
  tags (text[])          -- ['canal:telegram', 'tema:seguros-auto', 'intent:cotizar', 'pais:MX']
  herencia_count int     -- cuántos proyectos lo han heredado (signal de confiabilidad)
  qa_validated bool      -- si el QA Agent lo validó en al menos un proyecto

-- Nuevo: índice de herencia por proyecto
project_cli_herencia
  id, proyecto_id (FK), skill_id (FK), tipo ('heredado'|'generado'|'modificado'),
  created_at
```

**Query de herencia score al crear un proyecto:**

```sql
SELECT
  COUNT(*) FILTER (WHERE s.qa_validated = true AND s.tags && $tags_del_proyecto) as reutilizables,
  COUNT(*) as total_skills_requeridas,
  ROUND(COUNT(*) FILTER (WHERE s.qa_validated = true AND s.tags && $tags_del_proyecto)
    / COUNT(*)::numeric * 100) as herencia_score_pct
FROM skills_requeridas_estimadas($scope_json) s;
```

---

## 15. KPIs del Piloto y Operación Continua

> Cinco dimensiones de medición. Las primeras dos son financieras (¿vale la pena?), las últimas tres son operacionales (¿funciona bien?). Todos los KPIs se miden desde datos reales en Supabase — no hay encuestas manuales.

---

### KPI 1 — ROI del Cliente Desarrollador

**Qué mide:** Si la plataforma genera retorno real frente al proceso manual anterior.

```
ROI = (Ahorro mensual - Costo plataforma) / Costo plataforma × 100

Ahorro mensual = horas manuales ahorradas × tarifa del desarrollador ($45/h)
  = (horas_reparacion_antes - horas_reparacion_despues)
  + (horas_mantenimiento_antes - horas_mantenimiento_despues)
  + (conversaciones_escaladas_antes × $2.50 - conversaciones_escaladas_despues × $2.50)

Costo plataforma = suscripción_mensual + overage_conversaciones + overage_transacciones
```

**Baseline del piloto:** ~$1,600/mes de costo manual → objetivo $149–250/mes con plataforma.

**Target:** ROI > 500% en los primeros 3 meses de operación.

**Fuente de datos:** `token_usage_agent`, `eventos_facturacion`, `contract_executions`, `conversation_traces`.

---

### KPI 2 — Eficiencia en Costo de Tokens

**Qué mide:** Qué tan preciso es el presupuesto estimado del Token Optimization Agent vs el costo real.

```
Eficiencia = (1 - |costo_real - costo_estimado| / costo_estimado) × 100
```

**Target:** Desviación < 15% entre presupuesto estimado (routing_plan) y costo real.

**Por qué importa:** Una desviación alta significa que el routing plan está mal calibrado — el modelo económico se está usando cuando debería ir el avanzado, o viceversa. Señal de que el Token Optimization Agent necesita actualizar sus benchmarks (cron no está corriendo o los precios de OpenRouter cambiaron).

**Señales de alerta:**
- Proyecto > 2× el presupuesto estimado → posible loop o bug en un agente
- Proyecto < 50% del presupuesto → el scope fue sobreestimado (oportunidad de repricing)

**Fuente de datos:** `token_usage_agent.costo_usd` vs `proyectos.routing_plan.presupuesto_estimado`.

---

### KPI 3 — Bugs y Tiempo de Reparación

**Qué mide:** Velocidad de detección y resolución de fallos en el bot en producción.

| Métrica | Definición | Target |
|---------|-----------|--------|
| **MTTD** (Mean Time to Detect) | Tiempo desde que ocurre el bug hasta que el QA Agent o el monitoring lo detecta | < 5 minutos |
| **MTTR** (Mean Time to Repair) | Tiempo desde detección hasta que el fix está desplegado | < 2 horas |
| **Tasa de recurrencia** | % de bugs que ocurren más de una vez (mismo tipo, mismo proyecto) | < 10% |
| **Bugs detectados en QA vs producción** | Ratio de fallos capturados antes del deploy vs después | > 90% detectados en QA |

**Cómo se mide:** El QA Agent registra cada fallo en `agent_runs` con `status: 'failed'` y el motivo. Los bugs en producción se detectan por `conversation_traces` con `escalated: true` sin acción previa del humano (escalado forzado por fallo del bot).

**Fuente de datos:** `agent_runs`, `conversation_traces`, `contract_executions` con `estado: 'blocked'` no esperado.

---

### KPI 4 — Tickets de Atención al Cliente (Triage Agent)

**Qué mide:** Volumen y velocidad del canal de soporte del Cliente Desarrollador con la plataforma.

| Métrica | Definición | Target |
|---------|-----------|--------|
| **Tickets por mes** | Total de hilos en `hilos_soporte` por workspace | Tendencia decreciente (el sistema se autorepara) |
| **Tiempo de primera respuesta** | Tiempo desde creación del hilo hasta primera clasificación del Triage Agent | < 30 segundos |
| **Tasa de resolución automática** | % de tickets resueltos por el Triage Agent sin escalar al equipo interno | > 70% |
| **Tiempo de resolución escalada** | Tiempo desde escalado hasta cierre por el equipo a2abot | < 4 horas en horario laboral |
| **Tasa de reincidencia** | % de tickets del mismo tipo en el mismo proyecto en 30 días | < 15% |

**Señal clave:** Si la tasa de resolución automática del Triage Agent baja de 70%, significa que hay un patrón de soporte que el sistema no está manejando — candidato para que el Learning Agent genere una nueva skill o el equipo actualice un agente.

**Fuente de datos:** `hilos_soporte`, `mensajes_soporte`.

---

### KPI 5 — Calidad del Flujo Conversacional

**Qué mide:** Qué tan bien el bot en producción conduce las conversaciones de los usuarios finales.

| Métrica | Definición | Target |
|---------|-----------|--------|
| **Tasa de completion** | % de conversaciones que llegan a `[CIERRE_EXITOSO]` vs abandonos | > 65% |
| **Tasa de escalado a humano** | % de conversaciones que terminan en `👤 [ESCALADO_HUMANO]` | < 20% (o el definido en scope.json del cliente) |
| **Tasa de error recovery** | % de conversaciones que pasan por `[ERROR_RECOVERY]` | < 10% |
| **Intent recognition accuracy** | % de sesiones donde el `[SALUDO]` detectó el intent correcto en el primer intento | > 85% |
| **Turnos promedio por transacción** | Mensajes promedio hasta llegar a `[EJECUCION_ACCION]` | Decrece con el tiempo (el Learning Agent optimiza el flujo) |
| **Tasa de contratos bloqueados** | % de `contract_executions` con `estado: 'blocked'` sobre total | Depende del vertical — se establece baseline en el piloto |

**Indicador de mejora continua:** Los `turnos promedio por transacción` deben decrecer mes a mes a medida que el Learning Agent refina los flujos y el CLI Generator actualiza los patrones del catálogo. Si no decrece, el Learning Agent no está generando skills útiles.

**Fuente de datos:** `conversation_traces`, `contract_executions`, vistas materializadas `mv_costo_conversaciones_bot`.

---

**Métrica principal:** Construir un bot completo y verificado en **5–7 días** vs 8–12 semanas actuales.

**Métricas secundarias:**
- % del pipeline completado sin intervención humana (target: >90%)
- Ciclos QA → Designer resueltos A2A sin escalar a HITL
- Skills del Learning Agent que el siguiente proyecto hereda
- Reducción de costo mensual: ~$1,600 → ~$149

---

## 16. Stack Técnico

| Capa | Tecnología | Rol |
|------|-----------|-----|
| Frontend HITL 1 y 2 + onboarding | Next.js 16 + React 19 + TS + shadcn/ui | Dashboards separados por rol, blanco por tenant |
| i18n | next-intl | Switch ES/EN en panel |
| Validación contratos A2A | Zod | Valida payloads entre agentes + complexity_signals |
| Estado cliente | Zustand | activeProjectId + estado UI |
| Persistencia multi-tenant | Supabase Auth + DB + RLS | contextId por proyecto, roles separados, SSE streaming |
| Routing de modelos | OpenRouter | Económico (QA, learning) vs avanzado (Discovery, Designer) |
| Testing E2E | Playwright CLI + MCP | Conversaciones simuladas contra bot real de Telegram |
| Deploy | Vercel | Dashboard + runtime serverless del bot |
| Generación de CLIs | cli-printing-press | Traduce flows y skills en CLIs ejecutables |
| Protocolo A2A | a2aproject/A2A | JSON-RPC, AgentCards, task states, SSE streaming |
| Portabilidad skills | agentskills.io format | Skills reutilizables entre proyectos del mismo vertical |

---

## 17. Estructura de Features

```
src/features/
├── auth/              # Email/Password + RLS + claims de rol en JWT
├── workspaces/        # Gestión workspace, proyectos, límites de plan
├── billing/           # Fees de construcción, suscripción, overage, eventos_facturacion
├── agents/            # Orquestador + 7 agentes (MVP: funciones con contratos Zod)
├── hitl-dashboard/    # HITL 1: streaming SSE, estado agentes, historial pipeline
├── support/           # HITL 2: Triage Agent + tickets escalados + vista equipo interno
├── knowledge-base/    # Catálogo skills y CLIs por vertical, flujo de aprobación
└── learning/          # Learning Agent + Token Optimization cron
```

---

## 18. Fases de Implementación

```
FASE 1 — MVP (validar el flujo conversacional)
[ ] Setup Next.js + Supabase + Auth + RLS base
[ ] Orquestador: Discovery + Designer fusionados (contratos Zod)
[ ] complexity_signals.json + cálculo automático de tier
[ ] CLI Generator básico (cli-printing-press)
[ ] Deploy bot de Telegram simple
[ ] Dashboard HITL 1 mínimo (logs de agent_runs)
[ ] Pricing: fee de construcción + Starter plan

FASE 2 — A2A Real
[ ] Separar agentes en servidores independientes con AgentCards
[ ] Token Optimization Agent + cron periódico
[ ] Triage Agent + HITL 2 (vista equipo interno cross-tenant)
[ ] QA/Validator Agent con A2A TCK + Playwright
[ ] Streaming SSE al dashboard
[ ] Billing completo: overage, regeneraciones, eventos_facturacion

FASE 3 — Auto-Mejora
[ ] Learning Agent (cron: trazas → agentskills.io → CLI Generator)
[ ] Flujo de aprobación para promover skills al catálogo
[ ] Repositorio de conocimiento base versionado por vertical
[ ] Promoción de skills entre proyectos del mismo cliente (opt-in)

FASE 4 — Escala Global
[ ] Catálogo curado cross-cliente (mismo tema, aprobación interna)
[ ] Onboarding self-serve para desarrolladores
[ ] Métricas de piloto → pricing refinado con datos reales
[ ] Enterprise plan + SLAs
```

---

*"El bot no se escribe. Se negocia, se diseña, se genera y se verifica — todo agente a agente. El humano observa; el sistema aprende y se escribe a sí mismo mejores herramientas."*
