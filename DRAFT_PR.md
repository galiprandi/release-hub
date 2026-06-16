# PR Draft: Refactor Health & Novedades Resonance V2 🐜

## Scope
This PR evolves the Health Monitor and Novedades views to the Industrial Resonance V2 standard, optimizing "Time to Value" and reducing interface friction.

### Health Monitor Refinement
- **Navigation Elevation**: Migration of sorting and environment filtering to the `PageLayout` header using `IndustrialTabs`.
- **Help UX**: Transformation of the vertical `InfoBanner` into a technical help `ActionButton` and dialog.
- **High-Density Product Sections**: Updated `ProductSection` with `Box` icons, high-density typography, and `bg-muted/10` containers.

### Novedades Evolution
- **Technical Header**: Integration of a dedicated header with the `Newspaper` icon.
- **Content Encapsulation**: Better visual hierarchy using standard V2 container geometry and styling.

### Quality Assurance & Standards
- **Standard Alignment**: Updates to `DESIGN.md` and `AGENTS.md`.
- **Zero-Warning Build**: Strict adherence to AAA engineering standards.
- **E2E Validation**: UI verification via Playwright with screenshots.

## Bitacora (CROMA.md)
- [x] Phase 0: Territory Block.
- [ ] Phase 1: Health Monitor navigation refactor.
- [ ] Phase 2: Health Monitor Help UI transformation.
- [ ] Phase 3: ProductSection standardization.
- [ ] Phase 4: Novedades page evolution.
- [ ] Phase 5: Documentation & Standards update.
- [ ] Phase 6: Global validation (Build & E2E).
