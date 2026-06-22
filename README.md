# a2abot

Plataforma **A2A (Agent-to-Agent)** para construir bots conversacionales de Telegram (y otros
canales) sin escribir el bot desde cero. La idea: un desarrollador describe lo que necesita y una
cadena de agentes se entrevistan entre sí hasta producir un bot configurado y verificado, con un
humano supervisando el pipeline (HITL) sin bloquearlo.

> La **visión completa** del producto (3 actores, 7 agentes, smart contracts, modelo de datos,
> pricing, fases) está en [`BUSINESS_LOGIC.md`](./BUSINESS_LOGIC.md). Ese documento describe el
> diseño objetivo; este README describe lo que existe **hoy**.

---

## Estado actual — Fase 0

El proyecto está en una fase temprana. Lo construido:

- **Autenticación (Supabase):** login, signup, recuperación de contraseña, callback OAuth y tabla
  `profiles` con RLS.
- **Dashboard del Cliente Desarrollador — prototipo in-memory (Zustand):**
  - Workspaces y proyectos (CRUD en memoria).
  - **Discovery Wizard**: entrevista de 6 pasos (tema → proyecto → alcance → canales → flujo → resumen)
    que deriva complejidad y estado del proyecto.
  - **Flow Builder**: edición del flujo conversacional con drag & drop.
  - **Flow Advisor**: detecta huecos en el flujo y sugiere arreglos (hoy con **reglas deterministas**,
    no LLM).
  - **Conversation Preview**: previsualización en vivo de la conversación según el flujo.
  - **Editor de Cliente Final**: rellena variables y catálogos de la plantilla.

> ⚠️ El dashboard es un **prototipo 100% en memoria** (localStorage). Los datos se pierden al
> recargar y **no se persisten en Supabase** todavía. Ver el roadmap abajo.

---

## Tech Stack (real)

```yaml
Framework:  Next.js 16 (App Router, Turbopack)
UI:         React 19 + TypeScript
Styling:    Tailwind CSS 3.4
Backend:    Supabase (Auth + PostgreSQL + RLS)
Estado:     Zustand
```

---

## Quick Start

### 1. Instalar
```bash
npm install
```

### 2. Variables de entorno
```bash
cp .env.local.example .env.local
# Editar con credenciales de Supabase (y, para fases futuras, OpenRouter / Telegram)
```

### 3. Desarrollar
```bash
npm run dev   # Next.js + Turbopack
```

### Comandos
```bash
npm run dev     # Desarrollo
npm run build   # Build de producción
npm run lint    # ESLint
```

---

## Arquitectura (Feature-First)

```
src/
├── app/
│   ├── (auth)/        # login, signup, forgot/update password, callback
│   ├── (main)/        # dashboard
│   └── layout.tsx
├── features/
│   └── dashboard/     # components, store (Zustand), lib, data, types
└── lib/supabase/      # clients (client.ts, server.ts)
```

---

## Integraciones pendientes / Roadmap

Algunas integraciones están **configuradas pero aún sin uso en el código**:

| Integración | Estado |
|-------------|--------|
| Persistencia del dashboard en Supabase | ❌ Pendiente (hoy in-memory) |
| `OPENROUTER_API_KEY` (LLM) | ⚠️ Token en `.env.local`, sin uso |
| `TELEGRAM_BOT_TOKEN` | ⚠️ Token en `.env.local`, sin uso |
| Agentes A2A / smart contracts / CLI generator | ❌ No implementados |

Roadmap por fases:

- **Fase 0 (actual):** auth + dashboard prototipo in-memory.
- **Fase 1:** persistir proyectos/flujos en Supabase (+ RLS).
- **Fase 2:** conectar LLM real vía OpenRouter (Discovery / Flow Advisor).
- **Fase 3:** integración Telegram + canales + generación de handlers.

Detalle completo en la sección **"Estado de Implementación"** de
[`BUSINESS_LOGIC.md`](./BUSINESS_LOGIC.md).
