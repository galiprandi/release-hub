---
target: src/routes/docker/index.tsx
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 2
timestamp: 2026-07-25T14-59-11Z
slug: src-routes-docker-index-tsx
---
# Critique: Docker Dashboard + LogsViewer

Method: dual-agent (A: d538df7a · B: 70ebd227). Detector in parent: clean `[]`, exit 0. Static analysis (B): 14 findings residuales V2.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Status dots buenos pero "Live" sutil; sin restart count o crash loops indicator |
| 2 | Match System / Real World | 2 | Generic log viewer no mapea a Docker mental models (sin exit codes, restart markers, image context) |
| 3 | User Control and Freedom | 3 | Controles buenos pero no "clear all filters"; hover-to-reveal esconde actions |
| 4 | Consistency and Standards | 4 | Excelente adherence al canon Linear/Vercel; consistente con otros módulos |
| 5 | Error Prevention | 2 | Solo reactive error handling; no prevention (stopping critical containers) |
| 6 | Recognition Rather Than Recall | 2 | Too many toolbar controls; actions hidden behind hover; no clear primary action |
| 7 | Flexibility and Efficiency | 3 | Cmd+F bueno pero no Docker-specific efficiency patterns |
| 8 | Aesthetic and Minimalist Design | 4 | Clean, dark-first, canon perfecto; hairline borders y spacing correctos |
| 9 | Error Recovery | 2 | AI summary ayuda pero genérico; error states sin Docker-specific guidance |
| 10 | Help and Documentation | 1 | No inline help; tooltips minimales; no discovery de advanced features |
| **Total** | | **26/40** | **Typical para functional pero no specialized tool** |

## Design Specificity Verdict

Docker dashboard es un **competent generic container list con shared log viewer, no Docker-native debugging surface**. Tiene Docker-specific actions (start/stop/restart, port opening) pero LogsViewer es explícitamente shared con k8s y carece de Docker-specific affordances. Sin display de restart counts, exit codes, image tags, o resource limits en container list. Log viewer no highlights container restart markers, no muestra container metadata junto a logs, AI summary prompt genérico no Docker-aware. **Generic log viewer applied to Docker containers rather than designed for Docker operators' mental models.**

**Deterministic scan:** limpio `[]`, exit 0.
**Static analysis (B):** 14 findings residuales V2 (ver Minor Observations).
**Visual overlays:** no disponibles.

## LogsViewer Deep-Dive (Docker perspective)

1. **Generic resource selector lacks Docker context** (líneas 504-516): Dropdown muestra solo container names, no image tags o status. Multi-container app debugging necesita saber image/version. Selector debería mostrar `container-name (image:tag)`.
2. **No Docker-specific log highlighting** (líneas 151-177): Log level filter genérico (ERROR/WARN/INFO/DEBUG). Docker logs contienen exit codes, restart markers, OOM indicators no capturados. Sin highlighting para `exited (code 1)`, `OOMKilled`, `restart count`.
3. **AI summary prompt not Docker-aware** (línea 221): "Analiza los logs SOLO para identificar problemas" no instruye buscar port binding failures, volume mount errors, network connectivity. Output structure genérico no mapea a Docker troubleshooting.
4. **No container metadata in logs view**: Header muestra solo container name via dropdown. Sin image ID, restart count, exit code, container start time. Crítico para debugging — saber si es fresh container o uno restarting for hours.
5. **Auto-scroll behavior confusing for Docker logs** (líneas 419-422): Tooltip "Detener scroll automático (polling continúa)" — accurate pero confuso. Users esperan pause = stop data flow, no just scrolling. Mental mismatch.

## Priority Issues

### [P0] Status cell violates DESIGN.md typography
- **What**: Línea 286 ContainerList usa `font-bold tracking-widest uppercase` — prohibido DESIGN.md §28
- **Why**: Visual inconsistency, viola direction contract del canon
- **Fix**: `text-xs font-medium` sin uppercase/tracking-widest, con semantic color
- **Command**: `$impeccable polish src/docker/components/ContainerList.tsx`

### [P0] LogsViewer lacks Docker-specific affordances
- **What**: Sin display de image tag, restart count, exit code, container metadata en logs view
- **Why**: Docker operators necesitan este contexto para debuggear. Sin esto, flying blind — especialmente crash loops.
- **Fix**: Metadata display en logs header (image tag, restart count, last exit code) + Docker-specific log pattern highlighting
- **Command**: `$impeccable harden src/components/shared/LogsViewer.tsx`

### [P1] ActionsCell hover-to-reveal harms discoverability
- **What**: Línea 396 esconde all actions hasta hover (`opacity-0 group-hover:opacity-100`)
- **Why**: First-time users no saben que actions existen. On-call debugging, hidden controls = más time-to-resolution.
- **Fix**: Show primary actions (view logs, terminal) always; hide destructive (stop) behind hover/confirmation
- **Command**: `$impeccable shape src/docker/components/ContainerList.tsx`

### [P1] LogsViewer toolbar sin visual hierarchy
- **What**: Líneas 260-436 pack 9+ controles con equal visual weight
- **Why**: Users no pueden identificar primary action. Cognitive load aumenta con cada control.
- **Fix**: Group controls by function (filtering, navigation, actions) con visual separators; de-emphasize secondary
- **Command**: `$impeccable shape src/components/shared/LogsViewer.tsx`

### [P2] Container list missing critical Docker metadata
- **What**: ContainerList muestra solo name, status, uptime, ports (líneas 204-231)
- **Why**: Missing image tag, restart count, resource limits — info needed for triage
- **Fix**: Add columns image tag y restart count; ports cell más scannable
- **Command**: `$impeccable layout src/docker/components/ContainerList.tsx`

### [P3] AI summary prompt not Docker-aware
- **What**: Línea 221 prompt genérico no busca Docker-specific patterns
- **Why**: AI puede miss port binding errors, volume mount failures, network issues
- **Fix**: Extender prompt con Docker-specific error patterns y terminology
- **Command**: `$impeccable clarify src/components/shared/LogsViewer.tsx`

## Persona Red Flags

**Alex (DevOps on-call, 3am failing container):** Abre logs modal → sin restart count o exit code en header — no sabe si crash loop #1 o #50. Busca "error" → match counter (línea 389) tiny, hard to read en dark. AI summarize → output genérico no menciona port binding failure. Cierra modal → no indicación de cuál container fue viewed. **Extra minutes switching terminal y ReleaseHub.**

**Jordan (first-time Docker user):** Ve container list → no sabe qué "OK/ERROR/DETENIDO" badges significan — sin hover explanation. Hover row → actions aparecen sudden — startled, no sabe qué terminal icon hace. Click "Ver logs" → 9 toolbar controls — overwhelmed, no sabe dónde empezar. Tipea search → nothing happens initially — no realiza que necesita Enter. **Abandona ReleaseHub por `docker logs`.**

**Sam (platform engineer, 20+ containers):** Scans list → no image tags, no puede distinguir `api-container` v1.2 vs v1.3. No restart count column — no puede spot el container restarting all night. Filtra "ERROR" → 5 containers, no sort por most recent failure. Abre logs, switch a otro → dropdown solo names, tiene que memorizar. **Usa `docker ps -a` en terminal.**

## Minor Observations (residuales V2, static analysis B)

- `tracking-widest uppercase` en ContainerList:286 (violación typography)
- `text-[13px]` en ContainerSearch:31 (debería `text-xs`)
- `rounded-lg` en setup.tsx:106 button (debería `rounded-md`)
- `rounded-full` en ContainerList:110, ContainerSearch:44, LogsViewer:356 (debería `rounded-md`)
- `bg-muted/30` en containers/inputs (5 lugares: setup:57, 106; ContainerList:110, 269, 359; ContainerSearch:31; LogsViewer:310, 344, 508, 546)
- `text-muted-foreground/70` en ContainerList:111, ContainerSearch:31, LogsViewer:344
- `placeholder:text-muted-foreground/70` → debería `/60`
- `hover:bg-muted/60` en ContainerList:359 (debería `/30`)
- `rounded-lg` en ActionButton ContainerList:85
- "OK" en inglés vs "Detenido" en español — inconsistente (línea 288)
- Placeholder "BUSCAR (CMD+F)" uppercase — debería sentence case (línea 344)
- `max-w-7xl` modal más narrow que AGENTS.md `max-w-[1800px]` (línea 522)
- Expanded mode `w-screen h-screen` remueve rounded corners — jarring transition (línea 526)

## Questions to Consider

1. Por qué LogsViewer shared con k8s cuando Docker y k8s tienen log patterns y debugging needs fundamentalmente diferentes?
2. Container list muestra "running for" time pero no restart count — para container restarting 2 hours, cuál es más útil?
3. Si container está en crash loop, debería logs modal auto-open? O prominent "crash loop" badge que linkea a logs?
4. AI summarize button usa violet accent y placement prominente — es AI summarization realmente primary action cuando debugging logs, o secondary convenience?
5. Por qué esconder actions detrás hover-to-reveal? Qué fear de show always? Visual clutter o interaction purity?
6. Status badges uppercase tracking-widest pese a DESIGN.md prohibirlo — exception intencional para status indicators, o slip del redesign?
7. Switching containers en logs dropdown — debería log view clear inmediatamente o show loading state? Actualmente sin transition feedback.
8. Ports cell usa select dropdown — por qué no all ports como clickable badges?
9. "Live" indicator muestra cuando logs streaming, no cuando container healthy. Debería haber separate container health indicator en logs view?
10. Copy logs, close modal, paste en Slack — recipient sabrá cuál container? Sin metadata en copied text.
