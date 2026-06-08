# PR Draft: Refactor Kubernetes UI Resonance

## Objective
Refine the Kubernetes dashboard to align with **Industrial Resonance V2** standards. This includes improving the hierarchy, typography, and state management (integrating 'Proyectos' view and persisting tabs via search params).

## Scope
- **Route (Kubernetes)**:
  - Implement search params for 'tab' (Favoritos/Proyectos).
  - Integrate `IndustrialTabs` for high-density navigation.
- **Deployment List**:
  - Support Project-based grouping.
  - Refine status badges with semantic tokens and 20% opacity.
  - Standardize headers and technical metadata typography.
- **Hygiene**:
  - Ensure ARIA compliance.
  - Standardize ActionButtons.

## Technical Details
- TanStack Router for state synchronization.
- Industrial Resonance V2 design tokens.
- Playwright verification.

## Bitacora (CROMA.md)
- [x] Phase 0: Territory Block.
