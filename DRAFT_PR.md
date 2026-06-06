# 🐜 Draft PR: Docker UI Industrial Resonance V2 Refinement

## Scope of Work
This PR focuses on elevating the Docker Dashboard and Container List to the **Industrial Resonance V2** standard.

### Proposed Changes:
- **Docker Dashboard**: Standardize the header actions and ensure consistent `PageLayout` implementation (sticky header + gradient).
- **Container List**:
    - Refine `StatusCell` with semantic tokens and proper geometry.
    - Standardize `StartedCell` typography.
    - Refactor `PortsCell` to use `ActionButton` and Industrial Resonance V2 selector styling.
    - Elevate the Terminal modal aesthetic.
- **Documentation**: Update `DESIGN.md` and `CROMA.md` to reflect these refinements.

### Target Files:
- `src/routes/docker/index.tsx`
- `src/docker/componentes/ContainerList.tsx`
- `DESIGN.md`
- `CROMA.md`
