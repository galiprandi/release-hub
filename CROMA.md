# CROMA.md - Bitácora de Uma

## Historial de Misiones

### 2026-06-18: Surgical Hygiene & Resonance V3
- **Agente**: Fiona 🐜
- **Rama**: `🐜-Fiona-refactor-hygiene-resonance-v3`
- **Estado**: Finalizado ✅
- **Cambios**:
  - [x] Saneamiento de `usePipelineWithHealth.ts`: erradicación de syntax errors y entropía técnica.
  - [x] Consolidación de imports y eliminación de declaraciones de variables duplicadas/shadowed.
  - [x] Desmantelamiento de `mapToSekiEvent` (puente obsoleto) y eliminación de `any` casts.
  - [x] Corrección de referencia a variable indefinida (`pipeline` -> `pipelineResult`).
  - [x] Streamlining de `useEffect`: consumo nativo de `PipelineEvent[]` en el monitor de salud.
  - [x] Zero-warning build log y lint audit exitoso.
- **Resultado**: Núcleo de sincronización de pipelines restaurado a un estado AAA, libre de ruido técnico y 100% resiliente.

### 2026-06-13: Security Hardening (Script Allow-list) & Type Resilience Audit
- **Agente**: Vesper 🐜
- **Rama**: `🐜-Vesper-refactor-security-hardening-and-type-resilience`
- **Estado**: Finalizado ✅
- **Cambios**:
  - [x] Implementación de allow-list estricto para el parámetro `action` en el middleware de ejecución de scripts (`vite.config.ts`).
  - [x] Auditoría profunda de tipos para erradicar `any` en `src/`.
  - [x] Actualización de `DESIGN.md` y `AGENTS.md` con los nuevos estándares de hardening.
  - [x] Expansión de tests de seguridad en `src/api/security.test.ts` para verificar el allow-list de scripts.
  - [x] Zero-warning build y type-check exitoso.
- **Resultado**: Blindaje del dev server contra ejecución de scripts no autorizados y garantía de integridad de tipos en todo el repositorio.

### 2026-06-07: Refactor Resonance V2 (Health & Fetcher)
- **Rama**: `🐜-Uma-refactor-health-resonance`
- **Estado**: Finalizado ✅
- **Cambios**:
  - [x] Migración de `sortBy` a search params en Health Monitor.
  - [x] Estandarización de `IndustrialTabs` para ordenamiento.
  - [x] Refinamiento de opacidad en `ActionButton` (20%) en Fetcher.
  - [x] Actualización de `DESIGN.md` y `AGENTS.md`.
  - [x] Hardening de tipos en `validateSearch` de Health Monitor.
  - [x] Eliminación de código muerto (ExternalLink en ContainerList.tsx).
- **Resultado**: Dashboard más intuitivo, persistente y alineado con Industrial Resonance V2. Zero-warning build logrado.

### 2026-06-12: Technical Hygiene & Unified Pipeline Standardization
- **Agente**: Fiona 🐜
- **Rama**: `🐜-Fiona-refactor-hygiene-standardization-v2`
- **Estado**: Finalizado ✅
- **Cambios**:
  - [x] Desmantelamiento de hooks heredados (`usePipeline.ts`, `usePipelineDetector.ts`).
  - [x] Migración de `usePipelineWithHealth` a la arquitectura de `UnifiedPipeline`.
  - [x] Implementación del hook `useRepoDashboardDetails` para centralizar datos del dashboard con tipado estricto.
  - [x] Erradicación de duplicación de tipos e implicit `any` en el dashboard de GitHub.
  - [x] Zero-warning build logrado.
- **Resultado**: Sistema más ligero, modular y 100% tipado, preparado para múltiples proveedores de pipeline.

### 2026-06-12: DNS Rebinding Protection & Type Hygiene V2
- **Agente**: Vesper 🐜
- **Rama**: `🐜-Vesper-refactor-security-hardening-v2`
- **Estado**: Finalizado ✅
- **Cambios**:
  - [x] Implementación de protección DNS Rebinding en `healthProxyHandler` mediante pre-resolución de hostnames y validación de IPs.
  - [x] Sincronización de `AIChatModal.tsx` con la interfaz `useAIPrompt` (progress, contextUsage).
  - [x] Hardening de tipos en `QueryModal.tsx` para eliminar entropía técnica.
  - [x] Expansión de tests de seguridad en `src/api/security.test.ts` con escenarios de DNS Rebinding.
  - [x] Zero-warning build logrado.
- **Resultado**: Blindaje total del proxy de salud contra ataques de re-vinculación DNS y tipos 100% resilientes.

### 2026-06-08: Security Hardening & Type Hygiene
- **Agente**: Vesper 🐜
- **Rama**: `🐜-Vesper-refactor-security-hardening-and-type-hygiene`
- **Estado**: Finalizado ✅
- **Cambios**:
  - [x] Endurecimiento de protección SSRF en `vite.config.ts` (127.0.0.0/8, 169.254.0.0/16, CGNAT, IPv6).
  - [x] Normalización de IPv4-mapped IPv6 para prevenir bypasses.
  - [x] Erradicación de `any` y casts manuales en `QueryModal.tsx` y `AIChatModal.tsx`.
  - [x] Sincronización de tipos en mocks de tests (`pulsarAdapter.test.ts`, `AIChatModal.test.tsx`).
  - [x] Actualización de `DESIGN.md` y `AGENTS.md` con estándares de hardening.
  - [x] Zero-warning build logrado.
- **Resultado**: Superficie de ataque reducida significativamente y entropía técnica eliminada en componentes críticos.

### 2026-06-10: Technical Hygiene & Type Standardization
- **Agente**: Fiona 🐜
- **Rama**: `🐜-Fiona-refactor-hygiene-standardization`
- **Estado**: Finalizado ✅
- **Cambios**:
  - [x] Sincronización de mocks de `useAIPrompt` con la interfaz real de `@galiprandi/react-tools`.
  - [x] Restauración del build (zero-warning log).
  - [x] Migración total de `FilterBar` a `IndustrialTabs` en el dashboard de GitHub.
  - [x] Eliminación de `FilterBar.tsx` (código muerto).
  - [x] Validación E2E con Playwright y capturas de pantalla.
## Historial de Carol

### 2026-06-22: Refactor GitHub Detail & Dashboard Resonance V2
- **Agente**: Carol 🐜
- **Rama**: `🐜-Carol-refactor-github-resonance-v2`
- **Estado**: Finalizado ✅
- **Cambios**:
  - [x] Refactor de Repository Detail View: promoción de navegación (Commits/Tags) y enlaces externos (PRs, Actions) al header y acciones de `PageLayout`.
  - [x] Estandarización de `ProjectSelector` en el header de detalle para mayor densidad visual.
  - [x] Dashboard GitHub: estandarización del bar de filtrado global con contenedores `bg-muted/40` y bordes técnicos.
  - [x] Evolución de `HealthCell`: integración de etiquetas técnicas ("OK", "ERROR") y mantenimiento de animaciones pulse.
  - [x] Refinamiento de celdas `PRsCell` y `ActionsStatusCell` con fondos semánticos al 20% y bordes técnicos.
  - [x] Zero-warning build y validación de higiene técnica AAA.
- **Resultado**: Interfaz de GitHub alineada con Industrial Resonance V2, optimizando la jerarquía de información y la consistencia técnica.

### 2026-06-23: Refactor Kubernetes Setup Resonance V2
- **Agente**: Carol 🐜
- **Rama**: `🐜-Carol-refactor-kubernetes-setup-resonance-v2`
- **Estado**: Finalizado ✅
- **Cambios**:
  - [x] Phase 0: Territory Block.
  - [x] Refactor de Kubernetes Setup: alineación estética con Industrial Resonance V2.
  - [x] Typography: Implementación de alta densidad (`text-[10px] font-bold uppercase tracking-wider`) en etiquetas técnicas.
  - [x] Semantic Tokens: Uso de fondos semánticos al 10% y bordes al 20% para estados `success` y `destructive`.
  - [x] Geometry: Estandarización de contenedores a `rounded-xl` y badges a `rounded-md`.
  - [x] Technical Containers: Refactor de bloques de comandos con `bg-muted/10` y `border-border/40`.
  - [x] Hygiene: Erradicación de `any` en `src/api/security.test.ts` y mantenimiento de zero-warning build.
  - [x] Verificación: Implementación de test Playwright `e2e/kubernetes-setup.spec.ts` y captura de screenshot.
- **Resultado**: Página de configuración de Kubernetes elevada al estándar Industrial Resonance V2, garantizando consistencia visual con el resto del ecosistema.

### 2026-06-15: Refactor Docker UI Resonance
- **Rama**: `🐜-Carol-refactor-docker-ui-resonance`
- **Estado**: Finalizado ✅
- **Cambios**:
  - [x] Migración de filtrado a `IndustrialTabs` en la ruta de Docker.
  - [x] Sincronización de estado con parámetro de búsqueda `status`.
  - [x] Aplicación de `Resonance V2 Placeholder Standard` (null durante verificación).
  - [x] Refactor de celdas `StartedCell` y `StatusCell` a alta densidad.
  - [x] Eliminación de logs y filtros de tabla legados.
  - [x] Zero-warning build y validación E2E exitosa.
- **Resultado**: Dashboard de Docker alineado con Industrial Resonance V2, más denso y profesional.

### 2026-06-13: Security Hardening V3 (Shell Restriction & RFC 1123)
- **Agente**: Vesper 🐜
- **Rama**: `🐜-Vesper-refactor-security-hardening-v3`
- **Estado**: Finalizado ✅
- **Cambios**:
  - [x] Restricción total de shells (`bash`, `sh`, `zsh`, `powershell.exe`) and `node` en el middleware local.
  - [x] Implementación de límites de longitud y cumplimiento estricto de RFC 1123 en regex de validación Kubernetes.
  - [x] Sincronización de validación en `terminalMiddleware.ts`.
  - [x] Limpieza técnica de comentarios y documentación en `src/`.
  - [x] Expansión de tests de seguridad (26 casos exitosos).
  - [x] Zero-warning build verificado.
- **Resultado**: Elevación del umbral de seguridad contra RCE y ataques de inyección, garantizando integridad técnica absoluta.

### 2026-06-07: Refactor Kubernetes UI Resonance
### 2026-06-16: Refactor Kubernetes UI Resonance
- **Rama**: `🐜-Carol-refactor-kubernetes-ui-resonance`
- **Estado**: Finalizado ✅
- **Cambios**:
  - [x] Estandarización de directorio: migración a `src/kubernetes/components/`.
  - [x] Refinamiento de celdas Namespace, Age e Imágenes (alta densidad, badges).
  - [x] Estandarización de `StatusCell` (semantic tokens + 20% opacidad).
  - [x] Refactor de Terminal Modal: cabecera técnica doble línea y viewport zinc-950.
  - [x] Pulido visual de `DeploymentSearch`: inputs `bg-muted/40` y jerarquía con divisores.
  - [x] Higiene técnica: eliminación de logs y corrección de warnings en tests.
  - [x] Validación visual y funcional con Playwright exitosa.
- **Resultado**: Dashboard de Kubernetes elevado al estándar Industrial Resonance V2, con mayor densidad de información y coherencia técnica.

### 2026-06-11: Diff Viewer Hygiene & Type Standardization
- **Agente**: Fiona 🐜
- **Rama**: `🐜-Fiona-refactor-diff-viewer-hygiene`
- **Estado**: Finalizado ✅
- **Cambios**:
  - [x] Corrección de errores del React Compiler en `DiffViewer.tsx` (memoization dependencies).
  - [x] Erradicación de `any` y tipado estricto en el dashboard de GitHub.
  - [x] Limpieza de comentarios obsoletos ("from FilterBar").
  - [x] Validación E2E con Playwright (Diff Viewer & GitHub).
  - [x] Zero-warning build y lint log.

### 2026-06-17: Technical Hygiene & Entropy Cleanup
- **Agente**: Fiona 🐜
- **Rama**: `🐜-Fiona-refactor-hygiene-entropy-cleanup`
- **Estado**: Finalizado ✅
- **Cambios**:
  - [x] Migración de `usePipelineWithHealth` a la arquitectura `UnifiedPipeline`.
  - [x] Estandarización de `PipelineEvent` con soporte para `markdown` y tipado unificado.
  - [x] Refactor de `getPipelineStatusInfo` y `extractRoutes` para consumo de tipos unificados.
  - [x] Erradicación de hooks legados `usePipeline.ts` and `usePipelineDetector.ts`.
  - [x] Corrección de advertencias de build (variables no usadas en tests de seguridad).
  - [x] Sincronización de nomenclatura de metadatos (camelCase `updatedAt`).
  - [x] Zero-warning build logrado.
- **Resultado**: Repositorio libre de entropía técnica en el núcleo de pipelines y build impecable.
### 2026-06-16: Refactor GitHub UI Resonance V2
- **Rama**: `🐜-Uma-refactor-github-resonance-v2`
- **Estado**: Finalizado ✅
- **Cambios**:
  - [x] Evolución del layout: integración de navegación de colecciones and gestión de proyectos en el header de `PageLayout`.
  - [x] Promoción del filtro "Pendientes" a nivel global (dashboard) sincronizado con el search param `filter`.
  - [x] Refactorización de cabeceras de tabla and celdas de metadatos técnicos a alta densidad (`text-[10px] font-bold uppercase tracking-wider`).
  - [x] Estandarización de `HealthCell` con sombras semánticas and animaciones pulse para estados OK.
  - [x] Eliminación de filtros locales redundantes and código muerto.
  - [x] Validación E2E con Playwright (`e2e/verify-github-ui.spec.ts`) and screenshots.
  - [x] Zero-warning build and lint log.
- **Resultado**: Dashboard de GitHub alineado con Industrial Resonance V2, optimizando el Time to Value and la consistencia visual.
  - [x] Refactorización de cabeceras de tabla y celdas de metadatos técnicos a alta densidad (`text-[10px] font-bold uppercase tracking-wider`).
  - [x] Estandarización de `HealthCell` con sombras semánticas y animaciones pulse para estados OK.
  - [x] Eliminación de filtros locales redundantes y código muerto.
  - [x] Validación E2E con Playwright (`e2e/verify-github-ui.spec.ts`) y screenshots.
  - [x] Zero-warning build y lint log.
- **Resultado**: Dashboard de GitHub alineado con Industrial Resonance V2, optimizando el Time to Value y la consistencia visual.

### 2026-06-20: Refactor Health & Novedades Resonance V2
- **Agente**: Uma 🐜
- **Rama**: `🐜-Uma-refactor-health-novedades-resonance`
- **Estado**: Finalizado ✅
- **Cambios**:
  - [x] Phase 0: Territory Block.
  - [x] Refactor de navegación y filtros en Health Monitor: migración a `IndustrialTabs` en el header de `PageLayout`.
  - [x] Evolución de UX de ayuda: transformación de `InfoBanner` en `ActionButton` + `HealthHelpDialog`.
  - [x] Estandarización de `ProductSection`: integración de iconos `Box`, tipografía de alta densidad y contenedores `bg-muted/10`.
  - [x] Evolución de página de Novedades: implementación de header técnico con icono `Newspaper` y encapsulamiento en contenedor V2.
  - [x] Actualización de `DESIGN.md` y `AGENTS.md` con los nuevos estándares de resonancia.
  - [x] Zero-warning build y validación funcional via Playwright.
- **Resultado**: Interfaces de Salud y Novedades elevadas al estándar Industrial Resonance V2, optimizando el aprovechamiento del espacio y la claridad técnica.

### 2026-06-25: Setup Unification & Resonance V2 Centralization
- **Agente**: Uma 🐜
- **Rama**: `🐜-Uma-refactor-setup-centralization`
- **Estado**: Finalizado ✅
- **Cambios**:
  - [x] Phase 0: Territory Block & Mission Draft.
  - [x] Logic Centralization: Creación de `src/utils/os.ts` para detección unificada de OS.
  - [x] Component Unification: Implementación de `SetupCard.tsx` y `CopyButton.tsx` como componentes compartidos de alta densidad.
  - [x] Route Refactoring: Refactorización de las rutas de setup de Docker, Fetcher, GitHub y Kubernetes eliminando duplicación masiva.
  - [x] Resonance V2 Alignment: Estandarización de botones de navegación (`rounded-lg`, `text-[10px]`) e integración de badges de OS en headers.
  - [x] Technical Hygiene: Zero-warning build log, lint audit impecable y validación de tests unitarios (230 pasados) y E2E.
  - [x] Documentación: Actualización de `DESIGN.md` y `AGENTS.md` con los nuevos estándares de configuración.
- **Resultado**: Ecosistema de configuración unificado y profesionalizado, reduciendo la deuda técnica y mejorando la consistencia visual bajo el estándar Industrial Resonance V2.

### 2026-06-18: Security Hygiene & cURL Parser Hardening
- **Agente**: Vesper 🐜
- **Rama**: `🐜-Vesper-refactor-security-hygiene-hardening-v4`
- **Estado**: Finalizado ✅
- **Cambios**:
  - [x] Refactorización de `usePipelineWithHealth.ts` para eliminar entropía (duplicate imports/vars) y erradicar `as any`.
  - [x] Implementación de un tokenizador de estado sólido en `src/utils/curlParser.ts` con soporte para flags compactos e inyecciones neutralizadas.
  - [x] Creación de suite de tests exhaustiva `src/utils/curlParser.test.ts` (11 casos de éxito).
  - [x] Estabilización de dependencias de `useMemo` para compatibilidad con React Compiler.
  - [x] Sincronización de `extractEndpointsFromEvents` para consumo directo de `PipelineEvent[]`.
  - [x] Zero-warning build y validación global de tests (206 pasados).
- **Resultado**: Core de pipelines blindado contra entropía técnica y motor de cURL inexpugnable ante formatos malformados.
### 2026-06-19: Technical Hygiene & Build Restoration
- **Agente**: Fiona 🐜
- **Rama**: `🐜-Fiona-refactor-build-hygiene-v4`
- **Estado**: Finalizado ✅
- **Cambios**:
  - [x] Restauración del build: corrección de error de referencia en `usePipelineWithHealth.ts` (`pipelineResult` -> `pipeline`).
  - [x] Erradicación de statements de depuración (`console.log`) en hooks core (`useUnifiedPipeline`, `useGitHubActions`, `useKubectlNamespaceAccess`).
  - [x] Auditoría de higiene técnica: verificación de ausencia de código muerto y cumplimiento de estándar AAA.
  - [x] Zero-warning build log y lint audit.
  - [x] Validación funcional completa (206 tests unitarios + E2E selectivos).
- **Resultado**: Build restaurado a un estado prístino y core del sistema libre de ruido técnico, garantizando un entorno de desarrollo profesional y eficiente.

### 2026-06-21: Security Hardening & Centralized Utilities V6
- **Agente**: Vesper 🐜
- **Rama**: `🐜-Vesper-refactor-security-hardening-v6`
- **Estado**: Finalizado ✅
- **Cambios**:
  - [x] Centralización de utilidades de seguridad en `src/utils/security.ts` (VALIDATION, isInternalAddress).
  - [x] Blindaje SSRF para comandos `curl` en el middleware de ejecución local con protección DNS Rebinding.
  - [x] Implementación de timeouts obligatorios (30s) en procesos `spawnAsync` para prevenir procesos huérfanos.
  - [x] Sincronización total de validaciones RFC 1123 en terminal middleware usando utilidades centralizadas.
  - [x] Endurecimiento del terminal local con advertencias de seguridad en el inicio de sesión.
  - [x] Refactorización de `HealthHelpDialog` a `BaseDialog` y limpieza de código muerto en rutas de Salud y Novedades.
  - [x] Zero-warning build log y lint audit (AAA standard).
- **Resultado**: Núcleo de ejecución blindado y deudas técnicas de UI saldadas, garantizando integridad y resiliencia.

### 2026-06-20: Security Hardening & XSS Protection
- **Agente**: Vesper 🐜
- **Rama**: `🐜-Vesper-refactor-security-xss-hardening-v5`
- **Estado**: Finalizado ✅
- **Cambios**:
  - [x] Implementación de escapado HTML estricto en `highlightLogLine` (logUtils.tsx) para neutralizar XSS en logs.
  - [x] Hardening de `DiffViewer.tsx` con fallbacks seguros (`escapeHtml`) para errores de resaltado sintáctico.
  - [x] Creación de suite de tests `src/api/xss.test.ts` para auditoría y prevención de regresiones XSS.
  - [x] Actualización de `AGENTS.md` y `DESIGN.md` con estándares de protección XSS.
  - [x] Zero-warning build y validación global de 210 tests.
- **Resultado**: Aplicación blindada contra inyecciones XSS en logs y visores de código, elevando la integridad del sistema al estándar AAA.
### 2026-06-20: Refactor Novedades & Health Monitor Resonance V2
- **Agente**: Fiona 🐜
- **Rama**: `🐜-Fiona-refactor-hygiene-resonance-v5`
- **Estado**: Finalizado ✅
- **Cambios**:
  - [x] Refactorización de la página de Novedades: cabecera de alta densidad y contenedor de contenido estilizado.
  - [x] Evolución de Health Monitor: migración de filtros de ambiente a `IndustrialTabs` en el header y estandarización de geometría de `ProductSection`.
  - [x] Higiene Técnica AAA: erradicación total de statements `console.log` en `Terminal.tsx` y `terminalMiddleware.ts`.
  - [x] Validación E2E: verificación exitosa de los nuevos componentes de UI con Playwright.
  - [x] Zero-warning build: mantenimiento del estándar de build y lint impecable.
- **Resultado**: Interfaz de usuario elevada al estándar Industrial Resonance V2 en módulos críticos, optimizando la jerarquía de información y eliminando ruido técnico.

### 2026-06-21: Refactor Kubernetes & Terminal Resonance V2
- **Agente**: Uma 🐜
- **Rama**: `🐜-Uma-refactor-kubernetes-terminal-resonance`
- **Estado**: Finalizado ✅
- **Cambios**:
  - [x] Refactor de Kubernetes Dashboard: promoción de filtro de Namespace al header de `PageLayout` mediante `IndustrialTabs`.
  - [x] Eliminación de barras de filtrado locales en tablas de despliegues para mayor densidad visual.
  - [x] Evolución de `DeploymentSearch`: integración de metadatos técnicos (Ready/Up-to-date/Available) con badges de alta densidad.
  - [x] Refactor de ruta de Terminal: implementación de header técnico con metadatos de sesión y alineación con Resonance V2.
  - [x] Hotfix en Health Monitor: restauración de `HealthHelpDialog` corrigiendo sintaxis y uso de `BaseDialog`.
  - [x] Saneamiento del entorno: restauración de dependencias y herramientas de build (`tsc`, `vitest`).
  - [x] Zero-warning build y validación global de tests (210 pasados).
- **Resultado**: Dashboards de Kubernetes y Terminal elevados al estándar Industrial Resonance V2, optimizando la persistencia de estado y la jerarquía de información.

### 2026-06-18: Refactor Fetcher UI Resonance V2
- **Rama**: `🐜-Uma-refactor-fetcher-resonance-v2`
- **Estado**: Finalizado ✅
- **Cambios**:
  - [x] Implementación de `FetcherSearch` con tipado estricto y sincronización de search params (`method`, `sortBy`).
  - [x] Migración a dual `IndustrialTabs` para filtrado por método y ordenamiento persistente.
  - [x] Estandarización de `UrlCell` a alta densidad (Domain muted text-[10px], Path foreground text-sm).
  - [x] Refactor de cabeceras de tabla a estándar V2 (`text-[10px] font-bold uppercase`).
  - [x] Corrección de build: reparación de duplicación e inconsistencia de tipos en `usePipelineWithHealth.ts`.
  - [x] Eliminación de lógica de filtrado heredada y código muerto.
  - [x] Validación E2E exitosa con mocks de historial.
- **Resultado**: Fetcher evolucionado al estándar Industrial Resonance V2, mejorando la densidad de información y la persistencia de estado. Build restaurado a cero advertencias.

### 2026-06-21: Surgical Hygiene & Build Restoration V6
- **Agente**: Fiona 🐜
- **Rama**: `🐜-Fiona-refactor-hygiene-resonance-v6`
- **Estado**: Finalizado ✅
- **Cambios**:
  - [x] Restauración del Build: Corrección de JSX malformado y variables indefinidas en `src/routes/health/index.tsx`.
  - [x] Saneamiento de Novedades: Eliminación de imports duplicados (`Newspaper`) en `src/routes/novedades/index.tsx`.
  - [x] Optimización de Rendimiento: Implementación de `initialData` en `useUserCollections.ts` para eliminar parpadeos de UI y mejorar la hidratación en tests E2E.
  - [x] Higiene Técnica AAA: Remoción de código muerto e imports no utilizados (`ChevronDown`).
  - [x] Validación Global: Zero-warning build log, 210 tests unitarios exitosos y validación funcional via Playwright.
- **Resultado**: Integridad del repositorio restaurada al estándar AAA, con un build impecable y una experiencia de usuario más fluida y resiliente.

### 2026-06-22: Surgical Hygiene & Resonance V2 Alignment
- **Agente**: Fiona 🐜
- **Rama**: `🐜-Fiona-refactor-hygiene-restoration-v7`
- **Estado**: Finalizado ✅
- **Cambios**:
  - [x] Phase 0: Territory Block.
  - [x] Restauración del Build: Implementación de `handleSortChange` en `src/routes/health/index.tsx` corrigiendo error de compilación.
  - [x] Alineación Resonance V2: Refactor de `HealthMonitor` agregando etiquetas técnicas (`Ambiente:`, `Orden:`) a `IndustrialTabs` y habilitando `showLabel` en el botón de ayuda.
  - [x] Higiene de React Hooks: Corrección de advertencia de dependencia en `src/routes/kubernetes/index.tsx` mediante `useMemo` para `safeDeploymentFavorites`.
  - [x] Auditoría AAA: Verificación de ausencia de código muerto, logs de depuración y tipos inseguros en el core.
  - [x] Zero-warning build y lint log logrados satisfactoriamente.
- **Resultado**: Estabilidad del repositorio restaurada y alineación estética de Health Monitor completada bajo el estándar Industrial Resonance V2.

### 2026-06-22: Security Hardening V7 (SSRF Expansion & Terminal Audit)
- **Agente**: Vesper 🐜
- **Rama**: `🐜-Vesper-refactor-security-hardening-v7`
- **Estado**: Finalizado ✅
- **Cambios**:
  - [x] Phase 0: Territory Block.
  - [x] SSRF Protection Expansion: Fortalecimiento de `isInternalAddress` para detectar bypasses mediante IPs en formato decimal y hexadecimal.
  - [x] Terminal Middleware Validation: Creación de suite de tests `src/config/terminalMiddleware.test.ts` para auditar la validación de parámetros de sesión.
  - [x] Script Handler Hardening: Refuerzo de validación de repositorios en `vite.config.ts` mediante regex estricta de patrón `org/repo`.
  - [x] Technical Hygiene: Erradicación de `: any` en tests de seguridad, migrando a casts técnicos AAA (`ChildProcess`).
  - [x] Zero-warning build y validación global de tests (216 pasados).
- **Resultado**: Superficie de ataque reducida mediante el cierre de vectores SSRF avanzados y blindaje de middlewares locales.
### 2026-06-23: Technical Hygiene & Entropy Cleanup V8
- **Agente**: Fiona 🐜
- **Rama**: `🐜-Fiona-refactor-hygiene-entropy-cleanup-v8`
- **Estado**: En progreso 🏗️
- **Cambios**:
  - [x] Phase 0: Territory Block.
  - [x] Higiene Técnica: Erradicación de `any` en `src/utils/security.test.ts` mediante tipado explícito de mocks.
  - [x] Eliminación de Entropía: Remoción del hook huérfano `src/hooks/useKubectlNamespaceAccess.ts`.
  - [x] Auditoría AAA: Verificación de build y lint sin advertencias (zero-warning state).
  - [x] Validación Global: Ejecución exitosa de 212 tests unitarios y de integración.
- **Resultado**: Repositorio refinado con mayor integridad de tipos y libre de componentes huérfanos, manteniendo el estándar de ingeniería AAA.
### 2026-06-23: Surgical Hygiene Audit V9
- **Agente**: Fiona 🐜
- **Rama**: `🐜-Fiona-refactor-hygiene-audit-v9`
- **Estado**: Finalizado ✅
- **Cambios**:
  - [x] Phase 0: Territory Block & PR Audit.
  - [x] Saneamiento de Linter: Erradicación de `any` en `src/utils/security.test.ts` mediante casts seguros a `childProcess.ChildProcess`.
  - [x] Eliminación de Código Muerto: Remoción del hook huérfano `src/hooks/useKubectlNamespaceAccess.ts`.
  - [x] Documentación: Actualización de `AGENTS.md` y `DESIGN.md` con los nuevos estándares de higiene técnica.
  - [x] Verificación Global: Zero-warning build log y lint audit exitoso.
- **Resultado**: Higiene del repositorio elevada mediante la eliminación de entropía técnica y código huérfano, manteniendo el estándar AAA.

### 2026-06-23: Surgical Hygiene & Resonance V2 Alignment V10
- **Agente**: Fiona 🐜
- **Rama**: `🐜-Fiona-refactor-hygiene-audit-v10`
- **Estado**: Finalizado ✅
- **Cambios**:
  - [x] Phase 0: Territory Block.
  - [x] Restauración del Build: Exportación de `SAFE_COMMANDS` desde `src/utils/security.ts` corrigiendo errores de referencia en el middleware de Vite y suites de tests.
  - [x] Alineación Resonance V2: Implementación de `handleSortChange` y corrección de `handleEnvironmentChange` en `src/routes/health/index.tsx`, asegurando sincronización de parámetros de búsqueda.
  - [x] Blindaje SSRF: Fortalecimiento de `isInternalAddress` para detectar y bloquear bypasses mediante representaciones decimales y hexadecimales de IPs.
  - [x] Higiene Técnica: Refinamiento de suites de tests reemplazando casts inseguros por directivas `@ts-expect-error` y eliminación de código muerto.
  - [x] Verificación Global: Zero-warning build log, lint audit impecable y 227 tests unitarios exitosos.
- **Resultado**: Integridad del repositorio restaurada y blindaje de seguridad expandido, manteniendo el estándar de ingeniería AAA y la consistencia estética Industrial Resonance V2.

### 2026-06-27: Architecture Realignment & Type System Hardening V14
- **Agente**: Fiona 🐜
- **Rama**: `🐜-Fiona-refactor-hygiene-audit-v14`
- **Estado**: Finalizado ✅
- **Cambios**:
  - [x] Phase 0: Territory Block.
  - [x] Architecture Realignment: Relocación total de componentes compartidos a `src/components/shared/` y componentes de GitHub a `src/github/components/`.
  - [x] Type System Hardening: Erradicación de `any` en `src/utils/security.test.ts` y `src/config/terminalMiddleware.test.ts`.
  - [x] Hygiene AAA: Saneamiento del build y lint log (zero-warning state).
  - [x] Verificación Global: 230 tests unitarios exitosos y validación visual con Playwright.
- **Resultado**: Estructura del repositorio profesionalizada y blindaje de tipos elevado al estándar AAA, eliminando la entropía en el directorio de componentes.

### 2026-06-23: Surgical Hygiene & Entropy Audit V11
- **Agente**: Fiona 🐜
- **Rama**: `🐜-Fiona-refactor-hygiene-audit-v11`
- **Estado**: Finalizado ✅
- **Cambios**:
  - [x] Phase 0: Territory Block.
  - [x] Higiene Técnica: Resolución de advertencias de linter en `src/api/security.test.ts` mediante el uso de `@ts-expect-error` para tests de validación de tipos.
  - [x] Reducción de Entropía: Erradicación de bloques de tests duplicados en la suite de seguridad.
  - [x] Eliminación de Código Muerto: Remoción del hook huérfano `src/hooks/useGitHubActions.ts` tras confirmar ausencia de importaciones externas.
  - [x] Verificación Global: Zero-warning build log, lint audit impecable y 227 tests unitarios exitosos.
- **Resultado**: Higiene del repositorio optimizada mediante la eliminación de redundancias y código muerto, asegurando un entorno de desarrollo limpio y eficiente bajo el estándar AAA.
### 2026-06-24: Omnisearch Evolution & Resonance V2 Search
- **Agente**: Uma 🐜
- **Rama**: `🐜-Uma-refactor-search-resonance-v2`
- **Estado**: Finalizado ✅
- **Cambios**:
  - [x] Phase 0: Territory Block & Mission Draft.
  - [x] Docker Search Implementation: Creación de `ContainerSearch` e integración en el header de la ruta Docker para filtrado en tiempo real.
  - [x] Fetcher Search Evolution: Implementación de búsqueda persistente (`q` param) en el historial de Fetcher integrada en el header.
  - [x] Omnisearch Refinement: Estandarización de `RepoSearch` y `GenericSearch` con el estándar V2 (`bg-muted/40`, `border-border/60`, `focus:ring-primary/20`).
  - [x] Metadata Badges: Integración de badges técnicos de alta densidad (`REPO`, `FILE`) en los resultados de búsqueda.
  - [x] Build & Hygiene: Restauración de imports faltantes, zero-warning build logrado y 233 tests exitosos.
  - [x] Documentación: Actualización de `DESIGN.md` y `AGENTS.md` con los nuevos estándares de búsqueda.
- **Resultado**: Experiencia de búsqueda unificada y expandida a todos los módulos críticos, eliminando silos de información y alineando la interfaz con el estándar Industrial Resonance V2.

### 2026-06-24: Surgical Hygiene & Linter Audit V12
- **Agente**: Fiona 🐜
- **Rama**: `🐜-Fiona-refactor-hygiene-audit-v12`
- **Estado**: Finalizado ✅
- **Cambios**:
  - [x] Phase 0: Territory Block.
  - [x] Saneamiento de Linter: Erradicación de error "setState in effect" en `src/routes/fetcher/index.tsx` mediante la eliminación del estado redundante `localSearch`.
  - [x] Sincronización de Estado: Vinculación directa de inputs de búsqueda a URL search params (Single Source of Truth).
  - [x] Higiene de Dependencias: Resolución de advertencia `exhaustive-deps` en `FetcherPage` sincronizando `useMemo` con el parámetro `q`.
  - [x] Reducción de Entropía: Eliminación de variable no utilizada `kubectlCard` en `e2e/kubernetes-setup.spec.ts`.
  - [x] Verificación Global: Zero-warning build log, lint audit impecable y 230 tests unitarios exitosos.
- **Resultado**: Higiene del repositorio elevada al estándar AAA, eliminando redundancias de estado y asegurando un build sin advertencias.
### 2026-06-25: Refactor GitHub Setup Resonance V2
- **Agente**: Uma 🐜
- **Rama**: `🐜-Uma-refactor-github-setup-resonance-v2`
- **Estado**: Finalizado ✅
- **Cambios**:
  - [x] Phase 0: Territory Block & Mission Draft.
  - [x] GitHub Setup Resonance V2: Refactorización de la página de configuración aplicando tipografía de alta densidad (`text-[10px] font-bold uppercase tracking-wider`) y geometría `rounded-xl`.
  - [x] Visual Consistency: Implementación de badges técnicos (`REQUERIDO`, `INSTALADO`) con opacidad del 20% y colores semánticos.
  - [x] Command Containers: Rediseño de bloques de comandos con contenedores técnicos `bg-muted/10` y bordes `border-border/40`.
  - [x] Technical Hygiene: Verificación de build zero-warning y ausencia de código muerto o tipos inseguros.
  - [x] E2E Verification: Validación funcional y estética mediante Playwright (`e2e/verify-github-setup.spec.ts`).
- **Resultado**: Página de configuración de GitHub elevada al estándar Industrial Resonance V2, garantizando consistencia visual y profesionalismo técnico en el flujo de onboarding.
### 2026-06-25: AI Components Refactor & Resonance V2 Alignment
- **Agente**: Carol 🐜
- **Rama**: `🐜-Carol-refactor-ai-components-resonance-v2`
- **Estado**: Finalizado ✅
- **Cambios**:
  - [x] Phase 0: Territory Block & Mission Draft.
  - [x] AI Chat Refinement: Refactor de `AIChatModal` con burbujas de mensaje de alta densidad, sombras técnicas y alineación a `rounded-xl`.
  - [x] Feedback Dialog Evolution: Rediseño del stepper visual con sombras semánticas y estandarización de inputs a `bg-muted/40`.
  - [x] Typography Standard: Aplicación de `text-[10px] font-bold uppercase tracking-wider` en todas las etiquetas técnicas de los módulos de IA.
  - [x] Technical Hygiene: Estandarización de estados de éxito/error con fondos semánticos al 20% y bordes técnicos.
  - [x] Documentación: Actualización de `DESIGN.md` y `AGENTS.md` con los nuevos estándares de componentes de IA.
  - [x] Verificación: Zero-warning build logrado y validación de integridad técnica.
- **Resultado**: Componentes impulsados por IA elevados al estándar Industrial Resonance V2, garantizando una experiencia de usuario curada, profesional y visualmente coherente.

### 2026-06-25: Architecture Realignment & Resonance V2 Hygiene Audit V13
- **Agente**: Fiona 🐜
- **Rama**: `🐜-Fiona-refactor-hygiene-resonance-v13`
- **Estado**: Finalizado ✅
- **Cambios**:
  - [x] Phase 0: Territory Block.
  - [x] Architecture Realignment: Relocación de componentes específicos de módulo (`github`, `diff`, `fetcher`) desde `src/components/` a sus respectivos subdirectorios de componentes de módulo.
  - [x] Import Path Restoration: Actualización global de referencias de importación (usando `@/` aliases) y corrección de imports relativos rotos.
  - [x] Entropy Removal: Eliminación del componente huérfano `src/components/ui/breadcrumb.tsx`.
  - [x] Resonance V2 Typographic Audit: Aplicación de tipografía técnica de alta densidad (`text-[10px] font-bold uppercase tracking-wider`) en etiquetas y metadatos de los componentes relocalizados.
  - [x] Verificación Global: Zero-warning build log, lint audit impecable y 230 tests unitarios exitosos.
- **Resultado**: Estructura de componentes optimizada siguiendo el estándar de localidad por módulo, higiene técnica elevada al nivel AAA y consistencia visual Resonance V2 garantizada en componentes críticos.

### 2026-06-25: Terminal & GitHub UX Evolution
- **Agente**: Uma 🐜
- **Rama**: `🐜-Uma-refactor-terminal-github-ux`
- **Estado**: Finalizado ✅
- **Cambios**:
  - [x] Phase 0: Territory Block & Mission Draft.
  - [x] Terminal V2 Evolution: Refactorización de `src/routes/terminal.tsx` alineada con tipografía de alta densidad V2 y metadatos técnicos (Shell, Status, OS).
  - [x] Modal Unification: Unificación del header del modal de Terminal en `src/layouts/PageLayout.tsx` con el estándar técnico de la ruta principal.
  - [x] GitHub UX Evolution: Implementación de contenedores colapsables por organización en el dashboard de GitHub para reducir el ruido visual.
  - [x] Bulk UX Actions: Incorporación de controles globales de expansión/colapso para grupos de organizaciones.
  - [x] Technical Hygiene: Erradicación de `text-[9px]`, build zero-warning y 230 tests exitosos.
  - [x] Documentación: Actualización de `DESIGN.md` y `AGENTS.md` con los nuevos estándares de Terminal y GitHub UX.
- **Resultado**: Experiencia de usuario optimizada mediante la reducción de carga cognitiva en el dashboard y profesionalización técnica de la interfaz de terminal.

### 2026-06-27: Seki Pipeline Separation & Unified Pipeline Elimination
- **Agente**: Devin
- **Rama**: main
- **Estado**: Finalizado ✅
- **Cambios**:
  - [x] Separación de Seki del sistema unificado de pipelines: eliminación completa de `src/pipeline-core/` (types, adapters, hooks, components, utils).
  - [x] Eliminación de Pulsar/GitHub Actions adapter y `usePipelineDetection` (multi-provider abstraction).
  - [x] Creación de módulo autónomo `src/plugins/pipeline/seki/` con tipos propios (`SekiPipelineData`, `SekiPipelineEvent`), adapter directo, hook `useSekiPipeline` (sin detección de provider), y componentes propios (`SekiPipelineMonitor`, `SekiPipelineCard`, `SekiTimeline`).
  - [x] Migración de `useHealthMonitor` y `usePipelineWithHealth` desde `src/hooks/` a `src/plugins/pipeline/seki/hooks/`.
  - [x] Migración de `getPipelineStatusInfo` y `extractRoutes` a `src/plugins/pipeline/seki/utils.ts`.
  - [x] `SekiPipelineMonitor` silencioso total: renderiza `null` si no hay token, loading, error, o sin datos. Sólo renderiza la card cuando hay datos válidos.
  - [x] Actualización de consumidores: `src/routes/github/$org.$repo.tsx`, `src/routes/github/index.tsx`, `src/routes/health/index.tsx`.
  - [x] Tests: 222 tests unitarios exitosos (adapter, types, utils, card, timeline).
  - [x] Documentación: actualización de `AGENTS.md`, `BEHAVIOR.md`, `src/api/AGENTS.md`.
- **Resultado**: Seki aislado como módulo autónomo y agnóstico. Sin abstracción multi-provider. Componente silencioso que sólo aparece cuando hay datos válidos.

### 2026-06-27: Seki Latest-By-Environment Endpoint Migration
- **Agente**: Devin
- **Rama**: main
- **Estado**: Finalizado ✅
- **Cambios**:
  - [x] Migración al endpoint `/pipelines/latest-by-environment` que devuelve staging + production en una sola llamada, sin necesidad de conocer commit o tag de antemano.
  - [x] Eliminación de `fetchPipeline` y `fetchPipelineWithTag` (per-ref fetching). Reemplazados por `fetchPipelinesByEnvironment`.
  - [x] Eliminación de `useSekiPipeline` hook. Reemplazado por `useSekiPipelinesByEnv` que retorna `{ staging, production }`.
  - [x] Eliminación de `ViewMode` de los tipos del módulo Seki. El `refType` (COMMIT/TAG) se infiere automáticamente de `git.event` ('tag' → TAG, resto → COMMIT).
  - [x] `SekiPipelineMonitor` refactorizado para mostrar ambos ambientes en paralelo (staging card + production card) con sub-componente `SekiEnvPipeline`.
  - [x] `usePipelineWithHealth` simplificado: ya no requiere `commit` ni `tag` parameters. Extrae endpoints de ambos ambientes automáticamente.
  - [x] Consumidores actualizados: `$org.$repo.tsx` (sin ref/viewMode/commit props), `github/index.tsx` (TagCell y CommitCell usan `data?.production` y `data?.staging` respectivamente).
  - [x] Tests: 222 tests unitarios exitosos (adapter, types, utils, card, timeline, api/seki).
  - [x] Documentación: actualización de AGENTS.md, BEHAVIOR.md, CROMA.md, src/api/AGENTS.md.
- **Resultado**: Una sola llamada API obtiene el último pipeline de staging y production. Ambos ambientes se muestran en paralelo. Sin necesidad de ref específico. Componente silencioso que sólo aparece cuando hay datos válidos.
