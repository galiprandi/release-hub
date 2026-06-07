# 🐜 Uma: Refactor GitHub Dashboard Resonance

## Scope
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
