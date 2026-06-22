# Integraciones pendientes — estado verificado (2026-06-22)

Verificación del desfase entre el diseño (`BUSINESS_LOGIC.md`) y el código real. El proyecto
está en **Fase 0**.

## Tabla de integraciones

| Integración | Estado real | Evidencia |
|-------------|-------------|-----------|
| Auth Supabase | ✅ Implementada | `src/actions/auth.ts`, `src/lib/supabase/`, tabla `profiles` (RLS) |
| Persistencia del dashboard | ❌ In-memory | `src/features/dashboard/store/useDashboardStore.ts` → Zustand + localStorage |
| Tablas de negocio (workspaces, proyectos, clientes, agent_runs, contratos…) | ❌ No existen | Solo `supabase/migrations/0001_profiles.sql` |
| OpenRouter / LLM | ⚠️ Token configurado, sin uso | `OPENROUTER_API_KEY` en `.env.local`, 0 referencias en código |
| Telegram bot | ⚠️ Token configurado, sin uso | `TELEGRAM_BOT_TOKEN` en `.env.local`, 0 referencias en código |
| 7 agentes A2A / smart contracts / CLI generator | ❌ No implementados | No existen en `src/`; sin rutas `src/app/api` |
| Flow Advisor | ✅ Reglas deterministas (no LLM) | `src/features/dashboard/lib/flowAdvisor.ts` |

## Tokens configurados pero SIN USO
- `OPENROUTER_API_KEY` y `TELEGRAM_BOT_TOKEN` están presentes en `.env.local` pero ningún
  archivo del proyecto los consume. No asumir que la integración existe solo porque el token está.

## Supabase real
- Única migración aplicada: `0001_profiles.sql` (tabla `profiles` + RLS + trigger de creación
  de perfil al signup). Las ~12 tablas de la Sección 7 de `BUSINESS_LOGIC.md` no están creadas.

## Roadmap de fases
- **Fase 0 (actual):** auth + dashboard prototipo in-memory.
- **Fase 1 (próxima):** persistir a Supabase (`workspaces`, `proyectos`, `clientes_finales` + RLS).
- **Fase 2:** conectar LLM real vía OpenRouter (Discovery / Flow Advisor).
- **Fase 3:** integración Telegram + canales + generación de handlers.

> Fuente espejo: sección "Estado de Implementación" de `BUSINESS_LOGIC.md`.
