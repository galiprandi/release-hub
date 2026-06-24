# ReleaseHub - System Prompt

> System prompt para agentes autónomos. Solo prohibiciones duras y enrutamiento. Para detalles, seguir referencias.

## Aprendizaje de Build

- Build exitoso ejecutando `npm install` primero, luego `npm run build`
- El proyecto usa TypeScript + Vite (rolldown-vite@7.2.5)
- Build genera archivos en `dist/` con chunks optimizados
- Chunk principal grande (1.5MB) - considerar code-splitting futuro
- No hay errores de TypeScript ni warnings críticos

## Aprendizaje de Mejoras Implementadas

### Mejora #6: Reemplazar confirm() nativo con Dialog del sistema
- Se creó componente `DeleteConfirmDialog` usando Radix UI y `BaseDialog`
- Se integró en `FetcherPage` reemplazando el `confirm()` nativo
- El componente usa los tokens visuales del sistema (bg-destructive, text-destructive-foreground)
- Muestra el preview del cURL a eliminar en el mensaje de confirmación
- Build exitoso sin errores TypeScript
- Patrón: usar `BaseDialog` para diálogos de confirmación consistentes con el diseño del sistema

### Mejora #6.1: Crear componente ConfirmDialog genérico y reutilizable
- Se creó `ConfirmDialog` genérico con 4 variantes: default, destructive, warning, success
- Soporta configuración completa de botones, loading, iconos personalizados
- Documentación exhaustiva con ejemplos de uso en JSDoc
- `DeleteConfirmDialog` ahora es un wrapper simple de `ConfirmDialog`
- Reducción de código: de 76 líneas a 60 líneas en DeleteConfirmDialog
- Patrón: usar componentes genéricos bien documentados para diálogos consistentes

#### Ejemplos de uso de ConfirmDialog:

**1. Diálogo destructivo básico:**
```tsx
<ConfirmDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  onConfirm={handleDelete}
  title="Eliminar elemento"
  description="¿Estás seguro de que quieres eliminar este elemento?"
  variant="destructive"
/>
```

**2. Con acciones personalizadas:**
```tsx
<ConfirmDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  onConfirm={handleAction}
  title="Confirmar acción"
  description="Esta acción no se puede deshacer"
  variant="warning"
  actions={{
    confirmText: "Sí, continuar",
    cancelText: "No, cancelar"
  }}
/>
```

**3. Con contenido personalizado y loading:**
```tsx
<ConfirmDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  onConfirm={async () => {
    await someAsyncOperation();
  }}
  title="Procesando"
  description="Esto puede tomar unos segundos"
  isLoading={isProcessing}
>
  <div className="mt-4 p-4 bg-muted rounded">
    <p>Información adicional</p>
  </div>
</ConfirmDialog>
```

**4. Con icono personalizado:**
```tsx
<ConfirmDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  onConfirm={handleConfirm}
  title="Custom Icon"
  customIcon={<CustomIcon className="w-5 h-5" />}
  description="Mensaje con icono personalizado"
/>
```

## Limitaciones del Entorno

### Playwright E2E Tests
- Playwright no soporta navegadores en Ubuntu 26.04 (versión muy nueva)
- Error: "Playwright does not support chromium/firefox on ubuntu26.04-x64"
- Los tests E2E no pueden ejecutarse en este entorno actual
- Validación alternativa: build exitoso + revisión de código manual
- Para ejecutar tests E2E, se requiere un entorno con OS soportado por Playwright

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
- **Health Monitor**: Status dots (`w-1.5 h-1.5`), semantic badges (/20 opacity), double-line URLs. Header-based filtering and sorting (IndustrialTabs) with dynamic status counts, help ActionButton with technical dialog, and bg-muted/10 containers for ProductSections.
- **Foco**: Administrative dialogs and interactive elements must use `focus:ring-primary/20` for focus-visible states.
- **Navigation**: Prefer `IndustrialTabs` over legacy `FilterBar` or `select` for sorting/filtering. State must be synced with search params.
- **Type Hygiene**: Prohibido `any`. Interfaces explícitas o `unknown` + validación. Casts de tipo en handlers deben usar `id as typeof stateVariable`. Mocks de test deben sincronizarse con firmas reales mediante casts de interfaces (`as ExecResponse`).
- **Dashboard Data**: Usar `useRepoDashboardDetails` para acceder a datos de repositorios en el dashboard de GitHub. Prohibido duplicar tipos de `RepoDetails` o realizar casts manuales en los componentes de celda.
- **Build Log**: Zero-warning build is mandatory. Outdated hook signatures in mocks/tests must be synchronized immediately.
- **Dead Code Elimination**: Components and hooks identified as orphans must be removed immediately. Legacy hooks `usePipeline.ts`, `usePipelineDetector.ts`, `useKubectlNamespaceAccess.ts`, and `useGitHubActions.ts` have been eradicated.
- **Kubernetes**: Dashboard must sync 'tab' (favorites|projects) with search params. Use localized status labels (Saludable, Procesando, etc.). Deployment search is on-demand by namespace across all contexts in parallel (no hardcoded namespace list).
- **Dead Code Elimination**: Components and hooks identified as orphans must be removed immediately. Legacy hooks `usePipeline.ts`, `usePipelineDetector.ts`, and `useKubectlNamespaceAccess.ts` have been eradicated.
- **Kubernetes**: Dashboard must sync 'tab' (favorites|projects) with search params. Use localized status labels (Saludable, Procesando, etc.). Deployment search is on-demand by namespace across all contexts in parallel (no hardcoded namespace list). Setup page aligned with V2 standard using high-density badges, semantic tokens with 20% opacity, and technical command containers.
- **Mutaciones**: Optimistic update + revalidación selectiva. Nunca `window.location.reload()`.
- **Resiliencia**: Si CLI falla (`kubectl`, `docker`), redirigir a `<module>/setup`.
- **Novedades**: Technical header with Newspaper icon. Content encapsulated in bg-muted/10 containers with rounded-xl and p-8 padding.
- **Docker UI**: Status filtering and `ContainerSearch` are promoted to the `PageLayout` header using `IndustrialTabs` and a dedicated search input. High-density cells use semantic dots (`StatusCell`) and hover-to-reveal patterns (`ActionsCell`).
- **Fetcher UI**: Filtering, sorting, and text search (`q` param) are implemented via `IndustrialTabs` and a header search input. `UrlCell` uses a double-line pattern: Muted Domain and Foreground Path.
- **Omnisearch (RepoSearch)**: Standardized to `bg-muted/40` with `border-border/60` and `focus:ring-primary/20`. Results must include high-density technical badges (`REPO`, `FILE`).
- **Diff Viewer**: Mode selection uses `IndustrialTabs`, synchronized with the `mode` search parameter. Technical metadata headers and comparison results use `text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60`. Containers use `bg-muted/10` and `border-border/60`. Empty states use `tracking-widest` placeholders.
- **GitHub UI**: Collection navigation and management actions are in the `PageLayout` header. Dashboard-level filtering uses `IndustrialTabs` synced with `filter` search parameter. Technical metadata cels use high-density typography (`text-[10px] font-bold uppercase tracking-wider`).
- **Health Monitor V2**: Primary environment filtering (Production, Staging, Unhealthy) is moved to the PageLayout header using IndustrialTabs. Product sections use `bg-muted/10` containers with `rounded-xl` geometry and technical Box icons.
- **Novedades Page**: Implements a high-density technical header with the 'Newspaper' icon. Content is encapsulated in a 'bg-muted/10' container with 'border-border/40' and 'rounded-xl' geometry.
- **Estructura**: Los componentes de módulo viven siempre en `src/<modulo>/components/`. Prohibido usar `componentes/`.
- **Hardening**: Middleware `spawn` con `shell: false` y timeout obligatorio de 30s (`spawnAsync`). Centralización de seguridad en `src/utils/security.ts`. Allow-list estricto en `/local/exec` (shells y node prohibidos) y `/local/script`. Validación estricta de recursos Kubernetes (RFC 1123) en todos los middlewares locales. SSRF protection con DNS Rebinding protection (pre-resolución obligatoria) bloqueando 127.0.0.0/8, 169.254.0.0/16, CGNAT y IPv6 local. Proxy de salud requiere `servername` (SNI) al usar IPs resueltas.
- **Pipeline Standards**: Obligatorio usar `useUnifiedPipeline` (`src/pipeline-core`). Las interfaces de eventos (`PipelineEvent`) deben incluir `markdown` para extracción de rutas y detalles de error. El monitor de salud (`useHealthMonitor`) consume nativamente `PipelineEvent[]`, eliminando la necesidad de puentes de mapeo legacy. La nomenclatura de metadatos es estrictamente camelCase (`updatedAt`).
- **cURL Parser**: Hardened state-machine tokenizer in `src/utils/curlParser.ts` supporting compact flags (e.g., `-H'Value'`). URL normalization via `new URL().toString()` ensures consistent formatting. Verified via `src/utils/curlParser.test.ts`.
- **XSS Protection**: Mandatory HTML escaping in any component using `dangerouslySetInnerHTML`. Log utilities (`logUtils.tsx`) must escape the raw line before applying highlighting tags. Diff viewer (`DiffViewer.tsx`) must provide a safe `escapeHtml` fallback if syntax highlighting fails. Verified via `src/api/xss.test.ts`.
- **SSRF Hardening Standard**: `isInternalAddress` in `src/utils/security.ts` must account for decimal and hexadecimal IP representations to prevent bypasses. All proxy and health check middlewares must utilize this centralized utility.
- **Search State Synchronization**: Redundant local state for search inputs (e.g., `localSearch`) must be avoided. Search inputs should bind directly to URL search parameters to ensure consistency and eliminate "setState in effect" linter warnings.

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
### Mejora #11: Kubernetes Setup Resonance V2 Refactor
- **Setup Page Resonance**: Refactored `src/routes/kubernetes/setup.tsx` to align with Industrial Resonance V2 aesthetic.
- **Typography**: Applied `text-[10px] font-bold uppercase tracking-wider` to technical labels and badges.
- **Geometry**: Standardized to `rounded-xl` for cards and `rounded-md` for badges.
- **Visuals**: Used semantic tokens with 20% opacity (`bg-success/10`, `bg-destructive/10`) and technical command containers (`bg-muted/10`).
- **Hygiene**: Verified zero-warning build and lint, and implemented Playwright E2E verification.

### Mejora #10: Surgical Hygiene & Resonance V2 Alignment
- **Restore SAFE_COMMANDS**: Exported `SAFE_COMMANDS` from `src/utils/security.ts` and updated consumers to maintain strict allow-listing for local execution.
- **Health Monitor Alignment**: Implemented `handleSortChange` and fixed `handleEnvironmentChange` in `src/routes/health/index.tsx`, ensuring proper search parameter synchronization and removing orphan handlers.
- **SSRF Robustness**: Hardened `isInternalAddress` to detect and block IPv4 bypasses using decimal and hexadecimal notations.
- **Technical Hygiene**: Erradicated unused `@ts-expect-error` and refined type safety in test suites.

### Mejora #7: Refactor Kubernetes & Terminal Resonance V2
- **Kubernetes Dashboard**: Promoted Namespace filtering to the `PageLayout` header using `IndustrialTabs`, synchronized with search parameters. Removed redundant local filter bars.
- **Terminal Route**: Aligned with Industrial Resonance V2, adding a high-density technical header with session metadata (Shell, Connection Status).
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
