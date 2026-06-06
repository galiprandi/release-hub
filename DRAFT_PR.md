# 🐜 Carol: Refactor Docker UI Resonance

## Scope
- **Industrial Resonance V2 Alignment**: Elevate the Docker dashboard to the V2 standard with technical metadata and semantic badges.
- **Component Standardization**: Replace manual buttons with `ActionButton` and integrate `EmptyState`.
- **Terminal UX Elevation**: Implement high-density headers for Docker terminals with icon backgrounds and technical metadata.
- **Visual Hygiene**: Refine table headers, status opacities (20%), and action group dividers.

## Modified Files
- `src/components/ui/ActionButton.tsx`: Global typography refinement.
- `src/routes/docker/index.tsx`: Dashboard layout and header actions.
- `src/docker/componentes/ContainerList.tsx`: Table refinements, badges, and terminal modal.

## Verification Plan
- [ ] Build integrity check (`node --run build`).
- [ ] Unit tests pass (`npm run test:run`).
- [ ] Visual verification via Playwright screenshots.
