# ReleaseHub - System Prompt

> System prompt para agentes autónomos. Solo prohibiciones duras y enrutamiento. Para detalles, seguir referencias.

## Prohibiciones (nunca violar)

| # | Regla | Referencia |
|---|---|---|
| 0 | Eliminar código muerto inmediatamente. No comentar. | — |
| 1 | Prohibido `useEffect` para sincronizar estados derivados. Usar `useRef` o handlers. | — |
| 2 | `runCommand` requiere `string[]`. Backend: `spawn` con `shell: false`. Prohibido `..`, `exec`. | `DESIGN.md` §Shell Hardening |
| 3 | GitHub: solo API/`gh`. Nunca `git` local. Formato `org/repo` explícito. | — |
| 4 | Build (`node --run build`) obligatorio antes de PR/commit. No proceder si falla. | — |
| 5 | Pipeline (Seki/Pulsar): **PROHIBIDO modificar** sin consentimiento explícito. | — |
| 6 | No `useQuery` crudo. Todo dato es un **Recurso** (ADR-001). | `ADR.md` |
| 7 | URL sync: todo estado visual vive en search params (TanStack Router). | `ADR.md` |
| 8 | Tests: `.test.ts[x]` junto al código. No `__tests__`. | — |

## Matriz de consulta

| Necesitás... | Andá a... |
|---|---|
| Arquitectura, Recursos, Cache strategy, Viewport, Write-Local-First | `ADR.md` |
| Tokens visuales, componentes, estados UI, Cache-First patterns | `DESIGN.md` |
| Bootstrap, stack, quick start | `README.md` |
| Reglas de negocio verificadas | `BEHAVIOR.md` |
| Flujos comunes, patrones, referencias de elementos | `.devin/skills/` |

## Referencias rápidas

- **Tokens**: Solo de `DESIGN.md`. Nunca hardcodeados (`text-zinc-500`, `bg-red-500`).
- **Health Monitor**: Status dots (`w-1.5 h-1.5`), semantic badges (/20 opacity), double-line URLs.
- **Foco**: `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1`.
- **Navigation**: Prefer `IndustrialTabs` over `select` for sorting/filtering. State must be synced with search params.
- **Type Hygiene**: Prohibido `any`. Interfaces explícitas o `unknown` + validación. Casts de tipo en handlers deben usar `id as typeof stateVariable`.
- **Mutaciones**: Optimistic update + revalidación selectiva. Nunca `window.location.reload()`.
- **Resiliencia**: Si CLI falla (`kubectl`, `docker`), redirigir a `<module>/setup`.
