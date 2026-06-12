# CROMA.md - Bitácora de Uma

## Historial de Misiones

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
- **Estado**: En progreso (Draft)
- **Objetivo**: Blindar el middleware contra SSRF avanzado y RCE mediante allow-lists, y erradicar la entropía de tipos en modales críticos.

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

### 2026-06-07: Refactor Kubernetes UI Resonance
- **Rama**: `🐜-Carol-refactor-kubernetes-ui-resonance`
- **Estado**: En progreso 🏗️
- **Cambios**:
  - [x] Fase 0: Territory Block.

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
