---
target: src/routes/github/index.tsx
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 2
timestamp: 2026-07-25T14-51-33Z
slug: src-routes-github-index-tsx
---
# Critique: GitHub Dashboard (src/routes/github/index.tsx)

Method: dual-agent (A: 3ee43138 · B: 868dfacf). Detector run in parent (B had no shell): clean `[]`, exit 0.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | No revalidation indicators, no stale timestamps, no "Live" pulse a pesar de arquitectura cache-first |
| 2 | Match System / Real World | 3 | "Pendientes" es jerga — devs piensan "unreleased commits" o "deploy gap" |
| 3 | User Control and Freedom | 3 | No undo en tag creation, no confirmation en freeze/unfreeze destructivos |
| 4 | Consistency and Standards | 3 | `rounded-lg` en buttons (líneas 357, 374, 382) viola DESIGN.md `rounded-md` |
| 5 | Error Prevention | 2 | PromoteDialog muestra warning de permisos DESPUÉS de entrar al form, no antes |
| 6 | Recognition Rather Than Recall | 2 | RepoSearch requiere descubrir Cmd+K — no hay hint visible en estado colapsado |
| 7 | Flexibility and Efficiency | 3 | Keyboard shortcuts existen pero no documentados inline; hover-to-reveal requiere descubrimiento |
| 8 | Aesthetic and Minimalist Design | 2 | Header amontonado: tabs + divider + search + divider + 2 labeled buttons en 56px |
| 9 | Error Recovery | 3 | Error states existen pero genéricos; no hay guía específica para permission failures |
| 10 | Help and Documentation | 1 | No onboarding, no tooltips explicando "Pendientes" o health states |
| **Total** | | **24/40** | **Below average — necesita trabajo** |

## Design Specificity Verdict

**LLM assessment:** El dashboard se siente category-interchangeable. Ejecuta el canon Linear/Vercel competentemente pero no hay nada que no podría pertenecer a cualquier GitHub management tool. El org grouping, table layout, y action patterns son standard SaaS dashboard fare. La integración AI (CommitsModal summary, PromoteDialog auto-generation) es la única DNA product-specific, pero está enterrada detrás de clicks en lugar de visible en el surface design. El thesis "cache-first" de PRODUCT.md no se manifiesta visualmente — no revalidation indicators, no stale timestamps, no animated diffs como especifica DESIGN.md §Cache-First UI Patterns. Esto podría ser un clone del dashboard de GitHub con diferentes colores.

**Deterministic scan:** Detector limpio (`[]`, exit 0). Sin findings automáticos. Static analysis de Assessment B encontró 6 categorías de residuales V2 que el detector no captura (ver Minor Observations).

**Visual overlays:** No disponibles — Assessment B no tuvo browser tool. Sin overlay inyectado.

## Overall Impression

El redesign al canon Linear/Vercel se ejecutó mecánicamente bien — paleta, geometría, borders limpios. Pero el redesign fue cosmético, no estratégico. La superficie no demuestra el thesis del producto (cache-first, AI ubicua). El header está amontonado, las acciones high-stakes no tienen gravitas, y el filter "Pendientes" es opaco. La mayor oportunidad: hacer que el cache-first sea VISIBLE — que el usuario sienta la ventaja de no clonar.

## What's Working

1. **Org grouping con collapsible sections** (líneas 394-456) — thoughtful para devs que trabajan跨-org. Count badges dan at-a-glance context.
2. **AI integration en PromoteDialog** (líneas 59-69, 257-267) — auto-generar release notes desde pending commits es product-specific y un genuine time-saver.
3. **Keyboard-first search** (RepoSearch líneas 110-153) con Cmd+K, arrow nav, Enter — respeta al dev audience y el commitment "keyboard-first" de DESIGN.md.

## Priority Issues

### [P0] Header crowding viola hierarchy
- **What:** PageLayout header apila 5 zonas interactivas (tabs, search, divider, 2 labeled buttons) en 56px
- **Why it matters:** Viola DESIGN.md §Layout "header minimal con título + filtros integrados." Carga cognitiva, sin jerarquía visual clara
- **Fix:** Mover "Gestionar Proyectos" a posición secundaria (kebab menu), combinar Refresh en icon-only, eliminar label "Colecciones:"
- **Suggested command:** `$impeccable layout src/routes/github/index.tsx`

### [P0] PromoteDialog usa destructive color para production release
- **What:** Líneas 192, 319 usan `bg-destructive` para el botón primario de publicar
- **Why it matters:** Emocionalmente wrong — production release debe sentirse confidente, no peligroso. Crea ansiedad en un momento high-stakes
- **Fix:** Usar `bg-primary` para publish, reservar `bg-destructive` para rollback/delete
- **Suggested command:** `$impeccable polish src/github/components/PromoteDialog.tsx`

### [P1] No cache-first visual patterns a pesar de la arquitectura
- **What:** DESIGN.md §Cache-First UI Patterns especifica revalidation indicators, stale timestamps, animated diffs — ninguno implementado
- **Why it matters:** El core differentiator del producto es invisible. El usuario no puede saber si data es fresh o stale
- **Fix:** Revalidation pulse dot en header cuando `isFetching && !!data`, timestamp relativo cuando `dataUpdatedAt > staleTime`, `bg-primary/5` highlight en items nuevos
- **Suggested command:** `$impeccable delight src/routes/github/index.tsx`

### [P1] "Pendientes" filter es jerga opaca
- **What:** Línea 289 etiqueta el filter como "Pendientes" sin explicación
- **Why it matters:** Devs no usan este término — piensan "unreleased commits" o "deploy gap." Viola Nielsen #2
- **Fix:** Cambiar a "Sin deploy" con tooltip "commits después del tag de producción"
- **Suggested command:** `$impeccable clarify src/routes/github/index.tsx`

### [P2] Empty state action ambiguity
- **What:** Líneas 363-388 muestran 2 buttons para "Proyecto vacío" sin primary action clara
- **Why it matters:** Usuario no sabe si añadir repos o gestionar proyecto primero. Decision paralysis
- **Fix:** "Añadir Repositorios" primary (bg-primary), "Gestionar Proyecto" como secondary text link
- **Suggested command:** `$impeccable onboard src/routes/github/index.tsx`

### [P3] No confirmation en freeze/unfreeze destructivo
- **What:** FreezeDialog togglea branch protection sin confirmation step
- **Why it matters:** High-stakes action que puede bloquear team workflow. Viola Nielsen #3
- **Fix:** Confirmation step: "¿Estás seguro? Esto bloqueará todos los merges y pushes."
- **Suggested command:** `$impeccable harden src/github/components/FreezeDialog.tsx`

## Persona Red Flags

**Alex (power-user, release-day sprint):** Abre el dashboard a las 5PM del release day. Ve "Pendientes" pero no sabe qué significa — filtra por "Todos" y escanea manual. Clickea "Promocionar" y ve un botón rojo `bg-destructive` — se pone nerviosa, siente que va a romper algo. Tiene que clickear "X commits a promocionar" para ver qué se releasea, pero el AI summary está auto-generando y espera 3s. Publica, pero no hay celebración ni confirmación de que el team fue notificado. Experiencia ansiosa y flat.

**Jordan (first-timer, onboarding):** Abre ReleaseHub por primera vez. Ve "Sin favoritos" y dos buttons: "Descubrir Repositorios" y "Gestionar Proyecto." No sabe cuál clickear — ni siquiera sabe qué es un "project" en este contexto. Prueba el search pero no pasa nada hasta tipear 2 caracteres. No sabe de Cmd+K. Eventualmente añade un repo pero no entiende el org grouping — por qué están colapsados? Siente que hace algo mal. Se va confundida.

**Sam (release-manager, freeze day):** Necesita freezar main antes del holiday freeze. Clickea "Bloquear" y el dialog muestra un form con "main" pre-filled. Clickea "Bloquear" de nuevo y está hecho — sin confirmation, sin "you're about to block your team." Ve un checkmark y "Branch Bloqueado" pero no reassurance de que la protección está activa. No sabe si el team fue notificado vía Discord. Experiencia demasiado light para una acción de infraestructura crítica.

## Minor Observations

- **Detector estático encontró residuales V2 que el detector automático no captura:**
  - `focus:ring-primary/20` en RepoSearch:192, ProjectManagementDialog (6 lugares), CommitsModal:148
  - `uppercase text-[11px]` en ProjectManagementDialog:132, 167
  - `text-[11px]` en ProjectManagementDialog:132, 140
  - `shadow-[0_0_8px_rgba(...)]` halos en index.tsx:975, 978 y PageLayout:604
  - `border-warning/20`, `border-primary/20`, `border-destructive/20` en badges (6 lugares)
  - `tracking-[0.1em]` en ProjectManagementDialog:167
- Table.tsx:174 header usa `bg-muted/20` pero DESIGN.md §Table especifica "fondo transparente o `bg-background`"
- IndustrialTabs.tsx:36 inactive tabs usan `hover:bg-accent` pero DESIGN.md §Tabs especifica `hover:bg-muted/30`
- EmptyState.tsx:15 usa `border-dashed` — añade visual noise no especificado
- CommitsModal.tsx:146 placeholder "FILTRAR COMMITS" es uppercase — prohibido
- Footer summary (index.tsx:261) "X repos accesibles" no explica qué significa "accesibles"
- No loading skeletons — DESIGN.md §Loading especifica "Skeleton solo si `!data`" pero muestra LoadingSpinner

## Questions to Consider

1. Why does the "Colecciones:" label exist if the tabs are self-describing? Developer habit or intentional hierarchy?
2. El thesis es "cache-first app for inspecting pipelines/releases without cloning" — donde en la UI siente el usuario esta ventaja? Qué visual cue dice "this data is already here, no network round-trip"?
3. PromoteDialog genera AI summaries automáticamente pero solo los muestra después de clickear "X commits a promocionar." Por qué esconder el value? No debería ser visible por default para build trust?
4. El org grouping es collapsible, pero cuál es el use case de colapsar? No debería haber un "favorite repos within org" pattern?
5. Why does freeze use a dialog at all? Es un binary toggle — no podría ser direct action con undo, como un switch? El dialog añade fricción sin safety (no confirmation step).
6. El header muestra "Actualizar" y "Gestionar Proyectos" como primary actions. Cuál es más importante? Por qué son equal weight?
7. DESIGN.md especifica "dark mode default" pero PageLayout incluye theme switcher. Debería existir, o el producto debería commitear a dark-first como brand promise?
8. La tabla muestra 7 columnas pero la acción más importante (promote/freeze) está hidden en hover-to-reveal. Por qué no hacer la primary action visible, con secondary en hover?
