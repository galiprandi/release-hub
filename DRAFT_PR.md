# PR Draft: Refactor Kubernetes UI Resonance

## Objective
Refine the Kubernetes dashboard to align with **Industrial Resonance V2** standards. This includes improving the hierarchy, typography, and state management (integrating 'Proyectos' view and persisting tabs via search params).

## Scope
- **Route (Kubernetes)**:
  - [x] Refine header layout and `IndustrialTabs` integration.
  - [x] Elevate Empty State with Resonance V2 standards.
- **Deployment List**:
  - [x] Refine status badges with semantic tokens and 20% opacity.
  - [x] Standardize headers and technical metadata typography.
  - [x] Refactor Terminal modal header for high-density consistency.
- **Components**:
  - [x] Polish `DeploymentSearch` results and footer.
  - [x] Refine `DeploymentProjectSelectionDialog` cards.
- **Hygiene**:
  - [x] Ensure ARIA compliance.
  - [x] Zero-warning build log.

## Technical Details
- TanStack Router for state synchronization.
- Industrial Resonance V2 design tokens.
- Playwright verification.

## Bitacora (CROMA.md)
- [x] Phase 0: Territory Block.
- [x] Phase 1: Route & Empty State refinement.
- [x] Phase 2: DeploymentList high-density polish.
- [x] Phase 3: Search & Dialogs refinement.
- [x] Phase 4: Verification & Documentation.
