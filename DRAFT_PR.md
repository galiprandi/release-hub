# 🐜 Fiona: Diff Viewer Hygiene & Type Standardization

## Objective
Eradicate technical entropy and React Compiler errors while hardening type safety in the GitHub Dashboard. This mission focuses on achieving a zero-warning build and ensuring Industrial Resonance V2 compliance.

## Scope
- **React Compiler Fix**: Resolve `preserve-manual-memoization` errors in `DiffViewer.tsx`.
- **Type Hygiene**: Refine interfaces and eliminate unsafe assertions in `src/routes/github/index.tsx`.
- **Entropy Cleanup**: Remove stale references to legacy components (FilterBar) and audit orphan hooks.
- **Resonance V2 Alignment**: Ensure high-density typography and semantic consistency in modified views.

## Technical Details
- Adjusting `useMemo` dependencies to match inferred usage by React Compiler.
- Replacing `as RepoDetails` and similar casts with strict type guards or pre-defined interfaces.
- Global grep for `FilterBar` comments.

## Verification Plan
- [ ] `npm run build` (Zero warnings)
- [ ] `npm run lint` (Success)
- [ ] `npm run test` (Regression check)
- [ ] Playwright screenshots: `DiffViewer` & `GitHub Dashboard`.
