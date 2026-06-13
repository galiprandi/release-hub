# PR Draft: Technical Hygiene & Unified Pipeline Standardization 🐜

## Objective
Eradicate technical entropy by decommissioning legacy pipeline hooks and standardizing the system around the `UnifiedPipeline` architecture. This PR also addresses type hygiene in the GitHub Dashboard to achieve AAA engineering standards.

## Scope
- **Dead Code Elimination**:
    - Remove `src/hooks/usePipelineDetector.ts` (superseded by `src/pipeline-core/hooks/useUnifiedPipeline.ts`).
    - Remove `src/hooks/usePipeline.ts` (legacy Seki-only implementation).
- **Architecture Standardization**:
    - Refactor `usePipelineWithHealth` to utilize the `UnifiedPipeline` hook, enabling multi-provider support (Seki, Pulsar) across the dashboard.
- **Type Hygiene**:
    - Harden types in `src/routes/github/index.tsx`, eliminating implicit `any` and improving cell component robustness.
- **Build Hygiene**:
    - Resolve any resulting linter/build warnings to ensure a zero-warning log.

## Technical Details
- Migrating `usePipelineWithHealth` to the new abstraction layer.
- Explicit typing for GraphQL queries and dashboard state.
- Validation via `npm run build`.

## Bitacora (CROMA.md)
- [x] Phase 0: Territory Block.
- [ ] Phase 1: Dead code elimination.
- [ ] Phase 2: usePipelineWithHealth refactoring.
- [ ] Phase 3: Type hardening.
- [ ] Phase 4: Final verification.
