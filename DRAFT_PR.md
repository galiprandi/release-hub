# PR Draft: Technical Hygiene & Type Standardization 🐜

## Scope
This PR focuses on eliminating technical entropy and standardizing the codebase according to Industrial Resonance V2.

### 1. Build Restoration (Type Hardening)
- Fixing broken build due to outdated `useAIPrompt` hook signature in mocks and tests.
- Synchronizing `@galiprandi/react-tools` mocks with the actual library interfaces.

### 2. Dead Code Elimination
- Migrating `FilterBar` usages to `IndustrialTabs` in the GitHub dashboard.
- Removing `src/components/shared/FilterBar.tsx` as it is now an orphaned component.

### 3. AAA Standard Compliance
- Ensuring a zero-warning build log.
- Hardening types in critical AI components.

## Verification
- `npm run build` validation.
- Vitest unit tests for AI components.
- Playwright E2E verification for the GitHub dashboard.

---
*Status: In Progress (Phase 1)*
