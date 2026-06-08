# PR Draft: Refactor Kubernetes Resonance

## Objective
Evolve the Kubernetes dashboard to adhere to **Industrial Resonance V2** standards, improving collection management and refining the UI for high-density technical workflows.

## Scope
- **Kubernetes Dashboard**:
  - Integrate `IndustrialTabs` for switching between 'Favoritos' and 'Proyectos'.
  - Refine state synchronization using TanStack Router search parameters (`tab`, `namespace`).
- **Deployment List**:
  - Update `StatusCell` with semantic tokens and 20% opacity.
  - Apply `tracking-tight` to deployment names.
  - Standardize table headers and typography.
- **Table UI**:
  - Refine filter bar styling for V2 consistency.

## Technical Details
- Using TanStack Router for persistent state.
- Adhering to `DESIGN.md` tokens.
- Ensuring zero-warning build and high-density geometry.

## Bitacora (CROMA.md)
- [x] Phase 0: Territory Block.
