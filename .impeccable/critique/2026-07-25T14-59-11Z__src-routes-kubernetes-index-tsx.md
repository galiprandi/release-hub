---
target: src/routes/kubernetes/index.tsx
total_score: 22
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 2
timestamp: 2026-07-25T14-59-11Z
slug: src-routes-kubernetes-index-tsx
---
# Critique: Kubernetes Dashboard + LogsViewer

Method: dual-agent (A: bce3cf11 · B: d82f02c9). Detector in parent: clean `[]`, exit 0. Static analysis (B): 32 findings residuales V2.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Live indicator bueno, pero sin connection status, sin pod health en logs header, sin timestamp de última línea |
| 2 | Match System / Real World | 2 | Resource selector muestra `context/namespace/name` pero log viewer no muestra de qué pod/container vienen los logs |
| 3 | User Control and Freedom | 3 | Pause/play funciona, pero no clear logs, no ajustar polling interval, no jump to timestamp |
| 4 | Consistency and Standards | 2 | Usa `IndustrialTabs` (V2 branding) — DESIGN.md dice renombrar a `Tabs` |
| 5 | Error Prevention | 2 | No guard contra logs vacíos antes de AI summarization, sin indicación de CrashLoopBackOff vs healthy |
| 6 | Recognition Rather Than Recall | 2 | Log level filter es native `<select>` — no preview visual de ERROR count antes de filtrar |
| 7 | Flexibility and Efficiency | 3 | Cmd+F bueno, pero no regex, no multi-term, no saved queries |
| 8 | Aesthetic and Minimalist Design | 3 | Header denso con 8+ controles sin agrupación visual |
| 9 | Error Recovery | 2 | AI summary enterrado abajo, no prominente cuando hay errores |
| 10 | Help and Documentation | 1 | No in-context help para k8s patterns, no keyboard shortcuts legend |
| **Total** | | **22/40** | **Functional pero no world-class para k8s operators** |

## Design Specificity Verdict

Mixed specificity. DeploymentList es k8s-aware (namespace, age, images, status cells) pero LogsViewer es un **componente genérico repurposed para k8s**. Resource selector muestra `context/namespace/name` (k8s-specific) pero la experiencia de lectura de logs no tiene convenciones de k8s operators: sin pod selection dentro del log viewer, sin container selection, sin timestamp formatting, sin k8s event correlation. AI prompt genérico ("Analiza los logs SOLO para identificar problemas") sin mencionar CrashLoopBackOff, OOMKilled, ImagePullBackOff. **Tool-agnostic log viewer wearing k8s clothes, not k8s-native.**

**Deterministic scan:** limpio `[]`, exit 0.
**Static analysis (B):** 32 findings residuales V2 (ver Minor Observations).
**Visual overlays:** no disponibles.

## LogsViewer Deep-Dive (k8s perspective)

1. **Missing pod/container selection**: Resource selector muestra deployments, no pods. Terminal modal TIENE pod selection (líneas 345-357 DeploymentList) pero LogsViewer NO. Durante rolling updates o CrashLoopBackOff, operators necesitan comparar logs across pods — imposible ahora.
2. **Log level filtering client-side y opaco**: Filtra después de fetch, sin preview de ERROR/WARN count, solo chequea primera línea de cada grupo (multi-line stack traces pueden filtrarse mal).
3. **AI summarization no k8s-contextual**: Prompt genérico, no menciona CrashLoopBackOff, OOMKilled, ImagePullBackOff, LivenessProbeFailed, restart patterns, k8s events, configmap issues.
4. **Search sin power features k8s**: No regex (crítico para resource IDs, timestamps, error patterns), no case-insensitive toggle, no multi-term, no saved queries.
5. **No log timestamp controls**: Sin show/hide timestamps, sin format options (ISO, relative, TZ), sin jump to time range, sin highlight de time gaps (pod restarts).

## Priority Issues

### [P0] Missing pod/container selection in LogsViewer
- **What**: LogsViewer solo permite switching entre deployments, no pods/containers
- **Why**: Durante rolling updates, CrashLoopBackOff, multi-pod deployments, operators necesitan comparar logs across pods. Workflow crítico k8s faltante.
- **Fix**: Add pod selector dropdown (similar a Terminal modal) + container selector si multi-container
- **Command**: `$impeccable harden src/components/shared/LogsViewer.tsx`

### [P0] AI summary not prominent during incidents
- **What**: AI summary renderizado abajo de logs (líneas 465-475), no visible si operator scrolleó down
- **Why**: Durante production incidents, AI summary es el insight más valioso. Operators no deberían hunt for it.
- **Fix**: AISummaryCard sticky en top del viewport, o collapsible side panel. Prominencia visual (border, bg) cuando hay errores.
- **Command**: `$impeccable polish src/components/shared/LogsViewer.tsx`

### [P1] No k8s-specific error detection
- **What**: Sin detección automática de k8s failure patterns (CrashLoopBackOff, OOMKilled, ImagePullBackOff)
- **Why**: Generic error detection miss k8s-specific failure modes. Operators a las 3am necesitan visibilidad inmediata.
- **Fix**: K8s pattern matching en log preprocessing. Dedicated badges/alerts para k8s failure states. Integrate con deployment status.
- **Command**: `$impeccable delight src/components/shared/LogsViewer.tsx`

### [P1] Log level filter es native select, no canon-compliant
- **What**: Native `<select>` (líneas 307-318 LogsViewer), rompe canon Linear/Vercel
- **Why**: DESIGN.md §Tabs especifica custom tabs para filtering. Native selects se sienten out of place.
- **Fix**: Replace con custom dropdown o Tabs
- **Command**: `$impeccable shape src/components/shared/LogsViewer.tsx`

### [P2] No timestamp/last-log-line indicator
- **What**: Sin timestamp de última línea, sin connection status
- **Why**: Operators no pueden saber si logs son stale o streaming. Incertidumbre durante incidents.
- **Fix**: Timestamp de última línea en header ("Last log: 2s ago"). Connection status indicator.
- **Command**: `$impeccable harden src/components/shared/LogsViewer.tsx`

### [P3] Search lacks regex and case-insensitive toggle
- **What**: Search básico text-only
- **Why**: K8s operators necesitan regex para resource IDs, timestamps, error patterns
- **Fix**: Regex toggle, case-insensitive toggle, search history
- **Command**: `$impeccable polish src/components/shared/LogsViewer.tsx`

## Persona Red Flags

**Alex (SRE-on-call, 3am production incident):** Abre LogsViewer → "No hay logs disponibles" sin explicación (pod crashing? terminating? permissions?). Tiene que cerrar modal, checkear deployment table, reabrir. **Valley.** Scrollea logs buscando errores → sin preview de error count, filtra ERROR a ciegas. **Cognitive load.** Clickea "Resumir" → AI summary abajo de miles de líneas, tiene que scrollear up. **Peak buried.** Necesita comparar pods en rolling update → no puede seleccionar pods en LogsViewer. **Workflow friction.**

**Jordan (first-time k8s user):** Ve `context/namespace/name` → no entiende "context". Sin tooltip. **Recognition vs recall fail.** Clickea log level filter → native dropdown inconsistente con resto UI. **Consistency violation.** Busca "error" → 50 matches, match counter "1/50" pero no puede saltar a match #25. **Efficiency issue.** No sabe si logs son live → "Live" indicator verde pero sin timestamp. **System status gap.**

**Sam (platform engineer, multi-cluster):** Abre LogsViewer → sin indicación de cuál cluster/context. **Match real world gap.** Busca resource ID con regex → no soportado. **Flexibility issue.** Copia logs → strip ANSI pero no option de preserve formatting. **Efficiency issue.** Switches deployments → no loading state, no indicación de cuál está seleccionado si lista larga. **System status gap.**

## Minor Observations (residuales V2, static analysis B)

- `text-muted-foreground/70` en DeploymentSearch (5 lugares: 202, 236, 240, 246, 252)
- `text-muted-foreground/20` en index.tsx:121
- `placeholder:text-muted-foreground/70` en LogsViewer:344
- `bg-muted/30` en containers/inputs (16 lugares across setup, DeploymentSearch, DeploymentList, LogsViewer)
- `hover:bg-muted/50` en DeploymentSearch:155, 222 (debería ser /30)
- `bg-muted/60` en DeploymentSearch:281
- `text-primary/60` en DeploymentSearch:228, `text-primary/40` en DeploymentList:422
- `border-success/30`, `border-info/30`, `border-destructive/30` en DeploymentList:511-513
- `border-destructive/30` en LogsViewer:447
- `text-destructive/80`, `text-destructive/90` en LogsViewer:456, 462
- `IndustrialTabs` naming (V2 branding) en index.tsx:6, 88, 102
- StatusCell en DeploymentList:520 usa `uppercase` (violación DESIGN.md:28)
- Empty state button index.tsx:135 usa `rounded-lg` (debería `rounded-md`)
- Setup button setup.tsx:70 usa `rounded-lg`
- Search input `w-48` narrow para k8s patterns — considerar `w-64`
- No keyboard shortcut legend visible en LogsViewer modal

## Questions to Consider

1. Por qué Terminal modal tiene pod selection pero LogsViewer no? Logs son más críticos para debugging pod issues que terminal access.
2. AI prompt prohíbe mencionar "configuración, rutas, startup" — muy restrictivo para k8s operators que necesitan saber si configmap change causó el incident?
3. Log level filter solo chequea primera línea de cada grupo — multi-line stack traces con ERROR en línea 3 se filtran mal?
4. Resource selector muestra solo deployment names cuando ID incluye context/namespace — operators multi-cluster necesitan ver cuál cluster seleccionan.
5. Live indicator muestra "Conexión en vivo activa" — si kubectl se desconecta, seguirá mostrando "Live"? Sin error handling para connection failures.
6. Logs hardcoded `--tail=100` — qué si operator necesita 1000 líneas durante incident? Sin way to adjust.
7. Por qué AI summary abajo de logs cuando es el insight más valioso durante incident?
8. LogsViewer shared entre k8s y Docker — la abstracción está costando k8s operator value?
