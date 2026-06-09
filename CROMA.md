# CROMA.md - Bitácora de Uma

## Historial de Misiones

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

## Historial de Fiona

### 2026-06-07: Hygiene & Technical Entropy Cleanup
- **Rama**: `🐜-Fiona-refactor-hygiene-entropy-cleanup`
- **Estado**: Finalizado ✅
- **Cambios**:
  - [x] Estandarización de directorios: Renombrado `src/docker/componentes` -> `src/docker/components`.
  - [x] Eliminación de código muerto: Hooks huérfanos `useJqSetup` y `useGitTagsSimple`.
  - [x] Higiene de tipos: Eliminación de `any` en `github/index.tsx` y corrección de tipos en `DeploymentList.tsx`.
  - [x] Zero-warning build: Resolución de advertencias de linter y dependencias de React hooks.
- **Resultado**: Repositorio más limpio, con estructura estándar y build impecable sin ruidos técnicos.

## Historial de Carol

### 2026-06-07: Refactor Kubernetes UI Resonance
- **Rama**: `🐜-Carol-refactor-kubernetes-ui-resonance`
- **Estado**: En progreso 🏗️
- **Cambios**:
  - [x] Fase 0: Territory Block.
