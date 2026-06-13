# PR Draft: Kubernetes UI Resonance Refactor 🐜

## Scope
This PR implements the Industrial Resonance V2 standard in the Kubernetes module, enhancing usability, consistency, and visual density.

### UI/UX Refinement (Industrial Resonance V2)
- **Directory Standardization**: Moving components to `src/kubernetes/components/` to align with the system's modular architecture.
- **Table High-Density Headers & Cells**:
  - Updating `Namespace`, `Age`, and `Images` cells to use the technical metadata standard (`text-[10px] font-bold uppercase tracking-wider`).
  - Wrapping image names in badge containers for better visual separation.
  - Ensuring `StatusCell` uses semantic tokens with 20% opacity.
- **Terminal Modal Refinement**:
  - High-density header with double-line title (Context / Deployment Name).
  - Terminal icon with `primary/10` background.
  - Zinc-950 viewport for a professional technical aesthetic.
- **Search UI Refinement**:
  - `DeploymentSearch` input updated to `bg-muted/40` and `border-border/60`.
  - High-density dropdown with technical metadata and keyboard-centric navigation hints.

### Technical Hygiene
- Eradicating debug `console.log` statements.
- Ensuring a zero-warning build log.
- Full compliance with `DESIGN.md` and `AGENTS.md` protocols.

## Impact
- Improved visual harmony with other system modules (Health Monitor, GitHub, Docker).
- Enhanced technical aesthetic and information density.
- Standardized directory structure for better maintainability.

## Bitacora (CROMA.md)
- [x] Phase 0: Territory Block.
- [ ] Phase 1: Dead code elimination.
- [ ] Phase 2: usePipelineWithHealth refactoring.
- [ ] Phase 3: Type hardening.
- [ ] Phase 4: Final verification.
