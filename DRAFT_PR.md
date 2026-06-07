# 🐜 Carol: Refactor Docker UI Resonance

## Scope
- **Industrial Resonance V2 Alignment**: Elevate the Docker dashboard to the V2 standard with technical metadata and semantic badges.
- **Component Standardization**: Replace manual buttons with `ActionButton` and integrate `EmptyState`.
- **Terminal UX Elevation**: Implement high-density headers for Docker terminals with icon backgrounds and technical metadata.
- **Visual Hygiene**: Refine table headers, status opacities (20%), and action group dividers.

## Modified Files
- `src/components/ui/ActionButton.tsx`: Global typography refinement.
- `src/routes/docker/index.tsx`: Dashboard layout and header actions.
- `src/docker/componentes/ContainerList.tsx`: Table refinements, badges, and terminal modal.
# 🐜 Fiona: Refactor Hygiene & Standardization

## Scope
- **Dead Code Elimination**: Removal of orphaned components `NovedadesDialog` and `PageHeader`.
- **Type Hardening**: Elimination of `any` casts in `src/routes/github/index.tsx` by implementing strict interfaces for GitHub data.
- **Linter Hygiene**: Resolution of React Compiler warnings in `src/components/ui/Table.tsx` to achieve a zero-warning build log.
- **Architectural Integrity**: Ensuring strict compliance with AAA standards and Industrial Resonance V2.

## Modified Files
- `src/components/NovedadesDialog.tsx`: Removed (Dead code).
- `src/components/shared/PageHeader.tsx`: Removed (Dead code).
- `src/routes/github/index.tsx`: Type hardening and hygiene.
- `src/components/ui/Table.tsx`: Linter warning suppression/fix.

## Verification Plan
- [ ] Build integrity check (`node --run build`).
- [ ] Linter check (`npm run lint`).
- [ ] Unit tests pass (`npm run test:run`).
- [ ] Visual verification of GitHub Dashboard.
- **GraphQL Performance Optimization**: Transitioned from multiple sequential REST calls to a single consolidated GraphQL query for fetching PR counts, Tags, and Commits per repository.
- **Resonance V2 Alignment**:
    - Standardized `ActionButton` typography to `text-[10px] font-bold uppercase tracking-wider`.
    - Standardized all technical badges and borders to use **20% opacity** (`/20`) per `DESIGN.md`.
    - Refined `ProjectSelectionDialog` and `RepoSearch` with high-density technical labels and consistent geometry.
- **UX Refinement**:
    - Renamed "GitHub Actions" column to **"Workflows"** to avoid semantic collision.
    - Renamed "Operaciones" column to **"Operations"** for system-wide consistency.
- **Architectural Integrity**: Improved data flow by passing pre-fetched GraphQL details directly to table cells, eliminating redundant hook calls.

## Modified Files
- `src/components/ui/ActionButton.tsx`: Typography and opacity standardization.
- `src/components/ProjectSelectionDialog.tsx`: UI/Resonance refactor.
- `src/routes/github/index.tsx`: GraphQL refactor and dashboard UX.
- `src/components/RepoSearch.tsx`: Design system alignment and opacity refinement.
- `AGENTS.md`, `DESIGN.md`, `CROMA.md`: Updated with new standards and intervention logs.

## Verification Plan
- [x] Build integrity check (`node --run build`).
- [x] Unit tests pass (`npm run test:run`).
- [x] Visual verification via Playwright screenshots (verified 'Workflows' and 'Operations' labels and standardized opacities).
