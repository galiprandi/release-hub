# PR Draft: 🐜 Fiona: refactor(hygiene) technical entropy cleanup

## Scope
This PR focuses on eliminating technical entropy and standardizing core components to Industrial Resonance V2.

### 1. React Hygiene & Optimization
- **AIChatModal.tsx**: Refactor `useEffect` to eliminate synchronous `setState` calls that trigger cascading renders.
- **QueryModal.tsx**: Refactor to avoid render-phase state updates for props synchronization.

### 2. Type Safety (Zero `any` Policy)
- **useUserCollections.ts**: Replace `any` in storage migration logic with strict interfaces.
- **PageLayout.tsx**: Correctly type `CustomEvent` for screenshot integration, removing `any` casts.
- **AIChatModal.test.tsx**: Refactor mocks to eliminate `any` and ensure type-safe testing.

### 3. Industrial Resonance V2 Standardization
- **QueryModal.tsx**: Comprehensive visual audit to ensure use of semantic tokens, `ActionButton`, and V2 geometries (`rounded-xl`, `bg-muted/40`).

## Verification Plan
- [ ] `npm run lint` passes without warnings.
- [ ] `npm run build` completes successfully.
- [ ] Unit tests for `AIChatModal` and `useUserCollections` pass.
- [ ] Manual verification of `QueryModal` UI resonance.
