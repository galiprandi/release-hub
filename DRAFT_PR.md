# 🐜 Uma: Refactor GitHub Dashboard Resonance

## Scope
- **Visibility Elevation**: Bring open Pull Requests and GitHub Actions status directly to the main repository dashboard.
- **Resonance V2 Alignment**: Implement high-density technical metadata and semantic badges with 20% opacity.
- **UX Refinement**: Rename generic "Actions" to "Operations" to clarify intent and avoid confusion with GitHub Actions.
- **Architectural Integrity**: Leverage existing `useQueries` pattern for efficient multi-repo data fetching.

## Modified Files
- `src/routes/github/index.tsx`: Core dashboard logic and UI.
- `src/components/RepoSearch.tsx`: UX/Resonance audit.
- `src/components/ProjectSelectionDialog.tsx`: Resonance V2 compliance.

## Verification Plan
- [ ] Build integrity check (`node --run build`).
- [ ] Unit tests pass (`npm run test:run`).
- [ ] Visual verification via Playwright screenshots.
