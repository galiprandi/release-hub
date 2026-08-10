# ReleaseHub - System Prompt

> System prompt para agentes autónomos. Solo prohibiciones duras y enrutamiento. Para detalles, seguir referencias.

## Aprendizaje de Build

- Build exitoso ejecutando `npm install` primero, luego `npm run build`
- El proyecto usa TypeScript + Vite (rolldown-vite@7.2.5)
- Build genera archivos en `dist/` con chunks optimizados
- Chunk principal grande (1.5MB) - considerar code-splitting futuro
- No hay errores de TypeScript ni warnings críticos

## Aprendizaje de Mejoras Implementadas

### Mejora #18: Seki Token Auto-Refresh CTA
- **CLI Integration**: `seki auth get --token-only` devuelve el JWT directamente en stdout (~723 chars). Comando agregado a `SAFE_COMMANDS` en `src/utils/security.ts`.
- **Hook**: `useSekiTokenRefresh` (`src/hooks/useSekiTokenRefresh.ts`) ejecuta el comando via `runCommand(['seki', 'auth', 'get', '--token-only'])`, valida formato JWT (3 partes separadas por dots) y guarda el token via `useSettings.setSekiToken` + `useToken.saveToken`.
- **UI CTA**: `SettingsDialog` ahora tiene dos botones: "Actualizar Token" (token existente) y "Obtener automáticamente" (sin token). Ambos ejecutan el refresh automático con feedback visual (success/error).
- **Security**: `seki` agregado a la allow-list de `SAFE_COMMANDS`. El comando se ejecuta via `spawn` con `shell: false`, sin riesgo de inyección.
- **Verificación**: Build zero-warning, 274 tests exitosos.

### Mejora #15: Diff Viewer Evolution & Architectural Alignment
- **Architectural Alignment**: Relocación de `EmptyState.tsx` a `src/components/shared/` cumpliendo con el estándar de componentes compartidos.
- **Diff Viewer Evolution**: Integración de `EmptyState` V2 para estados iniciales, estandarización de badges técnicos y aplicación de tipografía de alta densidad.
- **DiffPanel Refinement**: Integración de `CopyButton` compartido, actualización al Focus Ring Standard (`focus:ring-primary/20`) y decoradores visuales V2.
- **DiffControls Optimization**: Implementación de anchos responsivos (`w-full sm:w-[620px]`) para `IndustrialTabs` y consistencia iconográfica.
- **Verificación Global**: Zero-warning build log, validación de higiene técnica AAA y cumplimiento de indentación de 2 espacios.

### Mejora #14: Setup Unification & Resonance V2 Centralization
- **Setup Centralization**: Unified setup pages for Docker, Fetcher, GitHub, and Kubernetes using the shared `SetupCard` component.
- **OS Detection**: Centralized OS detection logic in `src/utils/os.ts` and integrated OS badges in setup headers.
- **Shared Components**: Created `SetupCard` and `CopyButton` to eliminate code duplication across setup routes.
- **Resonance V2 Alignment**: Standardized navigation buttons and action buttons to `rounded-lg` with `text-[10px]` typography.
- **Hygiene**: Verified zero-warning build and passed all unit and E2E tests.

### Mejora #13: Surgical Hygiene & Linter Audit V12
- **Linter Saneamiento**: Erradicación de error de "setState in effect" en `src/routes/fetcher/index.tsx` mediante la eliminación de `localSearch` y vinculación directa a search params.
- **Dependency Hygiene**: Resolución de advertencia `exhaustive-deps` en `FetcherPage` sincronizando el hook `useMemo` con los parámetros de búsqueda.
- **Test Hygiene**: Remoción de variable no utilizada `kubectlCard` en `e2e/kubernetes-setup.spec.ts`.
- **Verificación Global**: Zero-warning build log, lint impecable y 230 tests exitosos.

### Mejora #12: Surgical Hygiene & Entropy Audit V11
- **Linter Cleanup**: Resolved warnings in `src/api/security.test.ts` by replacing `any` with `@ts-expect-error` in type violation tests.
- **Entropy Reduction**: Eradicated duplicated test blocks in the security suite to maintain a lean and efficient test pipeline.
- **Dead Code Removal**: Deleted the orphaned hook `src/hooks/useGitHubActions.ts` after confirming it had no external dependencies or imports.
- **Build Integrity**: Verified zero-warning build state and global test pass (227 tests) following refactor.

### Mejora #11: Inter Font Adoption
- **Font**: Replaced default browser font with Inter (Google Fonts, variable opsz 14-32, weights 300-700).
- **Loading**: `preconnect` to `fonts.googleapis.com` + `fonts.gstatic.com` with `display=swap` in `index.html`.
- **Rendering**: `font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11'` (alternate glyphs) + antialiased smoothing in `index.css`.

### Mejora #10: Surgical Hygiene & Resonance V2 Alignment
- **Restore SAFE_COMMANDS**: Exported `SAFE_COMMANDS` from `src/utils/security.ts` and updated consumers to maintain strict allow-listing for local execution.
- **Health Monitor Alignment**: Implemented `handleSortChange` and fixed `handleEnvironmentChange` in `src/routes/health/index.tsx`, ensuring proper search parameter synchronization and removing orphan handlers.

### Mejora #8: Refactor Docker Resonance V2
- **Header Promotion**: Promoted container status filtering to the `PageLayout` header using `IndustrialTabs` (synchronized with `status` search param). Integrated technical `Boxes` icon in the title.
- **High-Density Cells**: Implemented `StatusCell` with semantic dots/pulse and high-density labels. Refined `StartedCell` and `PortsCell` typography.

### Mejora #7: Refactor Kubernetes & Terminal Resonance V2
- **Kubernetes Dashboard**: Promoted Namespace filtering to the `PageLayout` header using `IndustrialTabs`, synchronized with search parameters. Removed redundant local filter bars.
- **Terminal Route**: Aligned with Industrial Resonance V2, adding a high-density technical header with session metadata (Shell, Connection Status).

### Mejora #6.1: Crear componente ConfirmDialog genérico y reutilizable
- Se creó `ConfirmDialog` genérico con 4 variantes: default, destructive, warning, success
- Soporta configuración completa de botones, loading, iconos personalizados

## Limitaciones del Entorno

### Playwright E2E Tests
- Playwright no soporta navegadores en Ubuntu 26.04 (versión muy nueva)
- Error: "Playwright does not support chromium/firefox on ubuntu26.04-x64"
- Los tests E2E no pueden ejecutarse en este entorno actual

## Prohibiciones (nunca violar)

| # | Regla | Referencia |
|---|---|---|
| 0 | Eliminar código muerto inmediatamente. No comentar. | — |
| 1 | Prohibido `useEffect` para sincronizar estados derivados. Usar `useRef` o handlers. | — |
| 2 | `runCommand` requiere `string[]`. Backend: `spawn` con `shell: false`. Prohibido `..`, `exec`. | `DESIGN.md` §Shell Hardening |
| 3 | GitHub: solo API/`gh`. Nunca `git` local. Formato `org/repo` explícito. | — |
| 4 | Build (`node --run build`) obligatorio antes de PR/commit. No proceder si falla. | — |
| 5 | Seki Pipeline (`src/plugins/pipeline/seki/`): **PROHIBIDO modificar** sin consentimiento explícito. | — |
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
- **Canon Visual**: Linear/Vercel — dark-first, neutral, keyboard-first, denso pero ordenado. Reemplaza Industrial Resonance V2. Ver `DESIGN.md`.
- **Tipografía**: Jerarquía por size + weight + color. **Prohibido** `text-[10px] font-bold uppercase tracking-wider` y `tracking-[0.2em]`. Labels: `text-xs font-medium text-muted-foreground`.
- **Geometría**: `rounded-md` (containers/cards/buttons), `rounded` (badges), `rounded-lg` (dialogs/panels grandes). **Prohibido** `rounded-xl` y `rounded-2xl`.
- **Borders**: Hairline `border border-border`. **Prohibido** `border-border/40`, `border-border/60` — el border es el border.
- **Containers**: `border border-border rounded-md bg-card`. **Prohibido** `bg-muted/40`, `bg-muted/10` para cards.
- **Shadows**: `shadow-sm`, `shadow-md` con offset. **Prohibido** `shadow-[0_0_15px_rgba(...)]` (halo decoration V2).
- **Foco**: `focus:ring-2 focus:ring-primary/30 focus:border-primary` para focus-visible states.
- **Navigation**: Prefer `IndustrialTabs` (conceptualmente Tabs) over legacy `FilterBar` or `select` for sorting/filtering. State must be synced with search params.
- **Type Hygiene**: Prohibido `any`. Interfaces explícitas o `unknown` + validación. Casts de tipo en handlers deben usar `id as typeof stateVariable`. Mocks de test deben sincronizarse con firmas reales mediante casts de interfaces (`as ExecResponse`).
- **Dashboard Data**: Usar `useRepoDashboardDetails` para acceder a datos de repositorios en el dashboard de GitHub.
- **Build Log**: Zero-warning build is mandatory. Outdated hook signatures in mocks/tests must be synchronized immediately.
- **Dead Code Elimination**: Components and hooks identified as orphans must be removed immediately. Legacy hooks `usePipeline.ts`, `usePipelineDetector.ts`, `useKubectlNamespaceAccess.ts`, and `useGitHubActions.ts` have been eradicated. Excepción: la ruta `/dev/seki-preview` y sus archivos en `src/plugins/pipeline/seki/dev/` son un sandbox permanente de iteración visual y NO deben ser borrados.
- **Kubernetes**: Dashboard must sync 'tab' (favorites|projects) with search params. Setup page uses `SetupCard` with `rounded-md` and `text-xs font-medium` labels.
- **Setup Unification Standard**: Setup pages must use the centralized `SetupCard` component (`src/components/shared/SetupCard.tsx`) and `detectOS` utility (`src/utils/os.ts`). Navigation buttons use `rounded-md` geometry and `text-sm font-medium` typography.
- **Mutaciones**: Optimistic update + revalidación selectiva. Nunca `window.location.reload()`.
- **Resiliencia**: Si CLI falla (`kubectl`, `docker`), redirigir a `<module>/setup`.
- **Novedades**: Header with `Newspaper` icon + `text-lg font-semibold`. Content in `border border-border rounded-md bg-card p-6`.
- **Docker UI**: Status filtering and `ContainerSearch` in the `PageLayout` header using `IndustrialTabs` and a dedicated search input. Cells use semantic dots (`StatusCell`) and hover-to-reveal patterns (`ActionsCell`).
- **Fetcher UI**: Filtering, sorting, and text search (`q` param) via `IndustrialTabs` and a header search input. `UrlCell` uses a double-line pattern: domain (`text-xs text-muted-foreground`), path (`text-sm font-medium`).
- **Omnisearch (RepoSearch)**: `bg-background border border-border rounded-md`. Focus: `focus:ring-2 focus:ring-primary/30`. Results include `text-xs font-medium` badges.
- **AI Chat Standard**: Message bubbles use `rounded-lg` geometry. User messages: `bg-primary text-primary-foreground`. Assistant messages: `bg-muted/30 border border-border`. Input area: `bg-background border border-border rounded-md`.
- **Feedback Dialog Standard**: Stepper buttons use `shadow-sm` when active/completed. Form inputs use `bg-background border border-border`. Success/Error states use semantic tokens with `/15` opacity.
- **Diff Viewer**: Mode selection uses `IndustrialTabs`, synchronized with the `mode` search parameter. Panel headers use `text-xs text-muted-foreground`. Containers use `border border-border rounded-md bg-card`. Code viewport: `bg-zinc-950/30`.
- **GitHub UI**: Collection navigation and management actions in the `PageLayout` header. Dashboard-level filtering uses `IndustrialTabs` synced with `filter` search parameter. Metadata cells use `text-xs font-medium text-muted-foreground`. Organization groups are collapsible.
- **Health Monitor**: Primary environment filtering (Production, Staging, Unhealthy) in the PageLayout header using IndustrialTabs. Product sections use `border border-border rounded-md bg-card` containers with `Box` icons.
- **Novedades Page**: Header with `Newspaper` icon + `text-lg font-semibold`. Content in `border border-border rounded-md bg-card p-6`.
- **Estructura**: Los componentes de módulo viven siempre en `src/<modulo>/components/`. Globales en `src/components/shared/` o `src/components/ui/`. El directorio raíz `src/components/` debe permanecer libre de archivos `.tsx` directos.
- **Hardening**: Middleware `spawn` con `shell: false` y timeout obligatorio de 30s (`spawnAsync`). Centralización de seguridad en `src/utils/security.ts`. Allow-list estricto en `/local/exec` (shells y node prohibidos) y `/local/script`. Validación estricta de recursos Kubernetes (RFC 1123) en todos los middlewares locales. SSRF protection con DNS Rebinding protection (pre-resolución obligatoria) bloqueando 127.0.0.0/8, 169.254.0.0/16, CGNAT y IPv6 local. Proxy de salud requiere `servername` (SNI) al usar IPs resueltas.
- **Seki Pipeline Standards**: Obligatorio usar `useSekiPipelinesByEnv` (`src/plugins/pipeline/seki/`). Las interfaces de eventos (`SekiPipelineEvent`) deben incluir `markdown` para extracción de rutas y detalles de error. El monitor de salud (`useHealthMonitor`) consume nativamente `SekiPipelineEvent[]`, eliminando la necesidad de puentes de mapeo legacy. La nomenclatura de metadatos es estrictamente camelCase (`updatedAt`).
- **cURL Parser**: Hardened state-machine tokenizer in `src/utils/curlParser.ts` supporting compact flags (e.g., `-H'Value'`). URL normalization via `new URL().toString()` ensures consistent formatting. Verified via `src/utils/curlParser.test.ts`.
- **XSS Protection**: Mandatory HTML escaping in any component using `dangerouslySetInnerHTML`. Log utilities (`logUtils.tsx`) must escape the raw line before applying highlighting tags. Diff viewer (`DiffViewer.tsx`) must provide a safe `escapeHtml` fallback if syntax highlighting fails. Verified via `src/api/xss.test.ts`.
- **SSRF Hardening Standard**: `isInternalAddress` in `src/utils/security.ts` must account for decimal and hexadecimal IP representations to prevent bypasses. All proxy and health check middlewares must utilize this centralized utility.
- **Search State Synchronization**: Redundant local state for search inputs (e.g., `localSearch`) must be avoided. Search inputs should bind directly to URL search parameters to ensure consistency and eliminate "setState in effect" linter warnings.
- **Unified Project Management Architecture**: Replaced legacy duplicated dialogs (`ProjectSelectionDialog`, `DeploymentProjectSelectionDialog`) with a single `ItemProjectSelectionDialog.tsx` in `src/components/shared/`. It handles both `repo` and `deployment` types, reducing entropy and ensuring visual consistency across GitHub and Kubernetes flows.

### Mejora #17: Visual Redesign — Linear/Vercel Canon
- **Redesign Completo**: Reemplazo total de Industrial Resonance V2 por el canon Linear/Vercel — dark-first, neutral, keyboard-first, denso pero ordenado.
- **Paleta**: Neutral dark-first (near-black bg, near-white fg, hairline borders). Accent cambiado de cyan-teal (oklch hue 190) a indigo (oklch hue 265). Dark mode como default.
- **Tipografía**: Jerarquía por size + weight + color. Erradicación total de `text-[10px] font-bold uppercase tracking-wider` (312+272 ocurrencias). Labels ahora `text-xs font-medium text-muted-foreground`.
- **Geometría**: `rounded-md` reemplaza `rounded-xl` (32 ocurrencias). Hairline borders sin opacidad. Shadows sutiles con offset reemplazan halos decorativos.
- **Containers**: `border border-border rounded-md bg-card` reemplaza `bg-muted/40` y `bg-muted/10` (116 ocurrencias).
- **Focus**: `focus:ring-primary/30` reemplaza `focus:ring-primary/20` (28 ocurrencias).
- **Diff Viewer**: Inset shadows reemplazados por `border-l-2` semántico. `bg-zinc-950/30` reemplaza `bg-zinc-950/20`.
- **PRODUCT.md**: Brand commitment actualizado — canon Linear/Vercel vinculante.
- **DESIGN.md**: Reescrito completamente con direction contract y reglas del nuevo canon.
- **Verificación**: Build zero-warning, 0 patrones V2 residuales en código.

### Mejora #16: Unified Project Management & Table V2 Refinement
- **Unified Dialog**: Implementation of `ItemProjectSelectionDialog.tsx` in `src/components/shared/` to centralize project assignment logic.
- **UX Friction Reduction**: Added a quick-create project feature directly within the selection dialog.
- **Table V2 Refinement**: Implemented explicit vertical dividers between columns and refined hover states in `Table.tsx`.
- **Entropy Reduction**: Eradication of legacy `ProjectSelectionDialog.tsx` and `DeploymentProjectSelectionDialog.tsx`.
- **Validation**: Zero-warning build, passing unit tests (211) and successful E2E verification via Playwright.

### Mejora #15: Architecture Realignment & Type System Hardening V14
- **Architecture Realignment**: Consolidación total de la localidad de componentes. Relocación de componentes compartidos (`EmptyState`, `LoadingSpinner`, `DisplayInfo`, `SettingsDialog`, `FeedbackDialog`, `AIChatModal`, `AISummaryCard`, `DeleteConfirmDialog`) a `src/components/shared/`.
- **Module Locality**: Migración de componentes específicos de GitHub (`FreezeDialog`, `ForceRedeployDialog`, `ProjectSelector`, `ProjectManagementDialog`) a `src/github/components/`.
- **Type Hardening**: Erradicación de `any` en suites de tests críticas (`security.test.ts`, `terminalMiddleware.test.ts`) mediante tipado técnico estricto y casts seguros.
- **Hygiene AAA**: Eliminación de código muerto y mantenimiento de estado zero-warning en build y lint.
- **Verificación**: Zero-warning build log, lint impecable y 230 tests exitosos.

### Mejora #13: Surgical Hygiene & Linter Audit V12
- **Linter Cleanup**: Resolved warnings in `src/api/security.test.ts` by replacing `any` with `@ts-expect-error` in type violation tests.
- **Entropy Reduction**: Eradicated duplicated test blocks in the security suite to maintain a lean and efficient test pipeline.
- **Dead Code Removal**: Deleted the orphaned hook `src/hooks/useGitHubActions.ts` after confirming it had no external dependencies or imports.
- **Build Integrity**: Verified zero-warning build state and global test pass (227 tests) following refactor.
### Mejora #14: Setup Unification & Resonance V2 Centralization
- **Setup Centralization**: Unified setup pages for Docker, Fetcher, GitHub, and Kubernetes using the shared `SetupCard` component.
- **OS Detection**: Centralized OS detection logic in `src/utils/os.ts` and integrated OS badges in setup headers.
- **Shared Components**: Created `SetupCard` and `CopyButton` to eliminate code duplication across setup routes.
- **Resonance V2 Alignment**: Standardized navigation buttons and action buttons to `rounded-lg` with `text-[10px]` typography.
- **Hygiene**: Verified zero-warning build and passed all unit and E2E tests.

### Mejora #10: Surgical Hygiene & Resonance V2 Alignment
- **Restore SAFE_COMMANDS**: Exported `SAFE_COMMANDS` from `src/utils/security.ts` and updated consumers to maintain strict allow-listing for local execution.
- **Health Monitor Alignment**: Implemented `handleSortChange` and fixed `handleEnvironmentChange` in `src/routes/health/index.tsx`, ensuring proper search parameter synchronization and removing orphan handlers.
- **SSRF Robustness**: Hardened `isInternalAddress` to detect and block IPv4 bypasses using decimal and hexadecimal notations.
- **Technical Hygiene**: Erradicated unused `@ts-expect-error` and refined type safety in test suites.

### Mejora #7: Refactor Kubernetes & Terminal Resonance V2
- **Kubernetes Dashboard**: Promoted Namespace filtering to the `PageLayout` header using `IndustrialTabs`, synchronized with search parameters. Removed redundant local filter bars.
- **Terminal Route**: Aligned with Industrial Resonance V2, adding a high-density technical header with session metadata (Shell, Connection Status, OS detection). Aligned with V2 typography (`text-[10px] font-bold uppercase tracking-wider`).
- **Deployment Search**: Enhanced results with technical metadata (Ready, Up-to-date, Available counts) using standard badges.
- **Health Monitor**: Corrected `HealthHelpDialog` implementation to use `BaseDialog` correctly.

### Mejora #8: Technical Hygiene & Entropy Cleanup
- **Entropy Removal**: Eradicated orphan hook `useKubectlNamespaceAccess.ts` to reduce codebase complexity and maintain AAA standards.
- **Type Safety**: Replaced `: any` with explicit `ChildProcess` mock typing in `security.test.ts`, ensuring full linter compliance and type resilience.
- **Build Integrity**: Maintained zero-warning build and lint state across the entire repository.
### Mejora #8: Refactor Docker Resonance V2
- **Header Promotion**: Promoted container status filtering to the `PageLayout` header using `IndustrialTabs` (synchronized with `status` search param). Integrated technical `Boxes` icon in the title.
- **High-Density Cells**: Implemented `StatusCell` with semantic dots/pulse and high-density labels. Refined `StartedCell` and `PortsCell` typography.
- **Visual Hygiene**: Applied hover-to-reveal pattern in `ActionsCell` to maintain a clean layout.
- **Empty State**: Updated to Industrial Resonance V2 technical aesthetic with centered layout and bold tracking-wider typography.
- **Setup Page**: Aligned OS detection badges and command containers with the V2 technical style.

### Mejora #11: Inter Font Adoption
- **Font**: Replaced default browser font with Inter (Google Fonts, variable opsz 14-32, weights 300-700).
- **Loading**: `preconnect` to `fonts.googleapis.com` + `fonts.gstatic.com` with `display=swap` in `index.html`.
- **Rendering**: `font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11'` (alternate glyphs) + antialiased smoothing in `index.css`.
- **Fallback**: `system-ui, -apple-system, sans-serif`.
- **DESIGN.md**: Updated Industrial Resonance V2 section with Font standard.
- **AI Chat Standard**: Message bubbles use `rounded-xl` geometry. Assistant messages: `bg-ai/5 border border-ai/10`. Input area uses `bg-muted/40` with `focus-within:ring-primary/20`.
- **Feedback Dialog Standard**: Stepper buttons use `shadow-[0_0_15px_rgba(var(--primary),0.2)]` when active/completed. Success/Error states use semantic tokens with 20% opacity and technical shadows.
- **Diff Viewer V2**: Mode selection uses `IndustrialTabs` (`w-full sm:w-[620px]`). Technical metadata and comparison results use `text-[10px] font-bold uppercase tracking-wider`. Panel headers include pulsating semantic dots with shadows and `bg-zinc-950/20` code viewports. Semantic line highlights (added/removed/changed) use 20% opacity with inset markers.
- **GitHub UI**: Collection navigation and management actions are in the `PageLayout` header. Dashboard-level filtering uses `IndustrialTabs` synced with `filter` search parameter. Technical metadata cels use high-density typography (`text-[10px] font-bold uppercase tracking-wider`).
- **Estructura**: Los componentes de módulo viven siempre en `src/<modulo>/components/`. Componentes compartidos en `src/components/shared/`.
- **Hardening**: Middleware `spawn` con `shell: false` y timeout obligatorio de 30s (`spawnAsync`). Centralización de seguridad en `src/utils/security.ts`. SSRF protection con DNS Rebinding protection (pre-resolución obligatoria) bloqueando 127.0.0.0/8, 169.254.0.0/16, CGNAT y IPv6 local, incluyendo representaciones decimales y hexadecimales.
- **Seki Pipeline Standards**: Obligatorio usar `useSekiPipelinesByEnv` (`src/plugins/pipeline/seki/`). Las interfaces de eventos (`SekiPipelineEvent`) deben incluir `markdown` para extracción de rutas y detalles de error.
- **cURL Parser**: Hardened state-machine tokenizer in `src/utils/curlParser.ts` supporting compact flags.
- **XSS Protection**: Mandatory HTML escaping in any component using `dangerouslySetInnerHTML`. Log utilities (`logUtils.tsx`) must escape the raw line. Diff viewer (`DiffViewer.tsx`) must provide a safe `escapeHtml` fallback.
- **Search State Synchronization**: Redundant local state for search inputs must be avoided. Bind directly to URL search parameters.

### Mejora #16: Surgical Hygiene Audit V15
- **Linter Saneamiento**: Erradicación de advertencia `exhaustive-deps` en `SekiPipelineMonitor.tsx` mediante el uso de dependencias desestructuradas en `useEffect`.
- **Type Hardening**: Eliminación total de `as any` en `src/config/terminalMiddleware.test.ts`, migrando a tipado estricto con `ReturnType<typeof vi.fn>` y directivas `@ts-expect-error` para acceso a mocks internos.
- **Hygiene AAA**: Auditoría de entropía técnica confirmando la ausencia de código muerto y statements de depuración en el núcleo del sistema.
- **Verificación Global**: Zero-warning build log, lint audit impecable y 230 tests exitosos.

### Mejora #17: V2 Mechanical Cleanup + Design Critique Fixes
- **V2 Cleanup**: 47 residuales V2 erradicados en 3 surfaces (Repo Detail, Health Monitor, Fetcher) basados en critiques dual-agent con `impeccable` skill.
- **Confirmation Steps**: Los 3 dialogs high-stakes (PromoteDialog, FreezeDialog, ForceRedeployDialog) ahora tienen step 'confirm' antes de ejecutar. Pattern: config → confirm → success.
- **Health Monitor SRE**: ErrorCell expandible (no más truncado a 50 chars), status dots w-2.5 h-2.5, response time thresholds decoupled de health (<200ms=success, 200-500ms=warning, >500ms=destructive), "All systems operational" banner, stats summary en header.
- **PipelineSummaryBar**: Nuevo componente en repo detail con chips compactos de status por ambiente (staging/production) usando useSekiPipelinesByEnv + usePulsarBuilds.
- **NoPipelineDataHint**: Empty state informativo cuando un repo no tiene Seki ni Pulsar configurado.
- **Success Links**: PromoteDialog success incluye link al tag en GitHub. FreezeDialog success incluye link a branch settings.
- **Fetcher**: isTokenExpired dead code removido. Re-run action siempre visible (no hover). Header simplificado sin labels redundantes.
- **ForceRedeployDialog**: Pasos del proceso collapsibles con `<details>/<summary>`. Hardcoded bg-blue-600 reemplazado por bg-primary.
- **Verificación Global**: Zero-warning build, 270 tests exitosos.
