# Design System - ReleaseHub

## Industrial Resonance V2
- **Typography**: `tracking-tight` (names), `text-[10px] font-bold uppercase` (labels).
- **Hierarchy**: Semantic tokens + 20% opacity (e.g., `bg-success/20 border-success/20`).
- **Geometry**: `rounded-xl` (containers), `rounded-lg` (actions), `rounded-md` (badges).
- **Standard Cells**:
  - **Health**: Semantic dots (OK/Error/Pending).
  - **PRs**: Primary badge with count + link.
  - **Actions**: Status-colored badge (Success/Error/Running) + pulse.
  - **Operations**: Generic repository management column.

## Component Patterns
- **Table**: `bg-muted/40` headers, technical metadata, vertical dividers in action groups.
- **FilterBar (variant='tabs')**: `bg-muted` container, `bg-background` active item, `p-1`.
- **StatusCard**: Standard for loading/error/offline states.
- **ActionButton**: Iconographic with integrated tooltip.
- **IndustrialTabs**: Unified selector for modals and panels.

## Accessibility
- **Focus**: `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1`.
- **ARIA**: Explicit `aria-label` for icon buttons. `BaseDialog` for modal consistency.

## Layout V2
- Sidebar fijo (50px). Sticky header with backdrop-blur and gradient transition.
- Contenido `px-8`, `gap-6`. Technical typography hierarchy.
