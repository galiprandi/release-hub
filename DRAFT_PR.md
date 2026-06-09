# PR Draft: Refactor GitHub Dashboard Resonance

## Objective
Evolve the GitHub dashboard to strictly adhere to **Industrial Resonance V2** design standards. This includes improving the tactile feel of the UI, ensuring consistent typography for technical metadata, and standardizing status badges and navigation patterns.

## Scope
- **Route (GitHub Index)**:
  - Migrate `FilterBar` to `IndustrialTabs` for collection switching (Favorites/Projects).
  - Use `PageLayout`'s `actions` slot for "Gestionar Proyectos" to declutter the main view.
- **ReposTable**:
  - Standardize all column headers with `text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60`.
  - Refine `PRsCell` and `ActionsStatusCell` badges: switch from `rounded-lg` to `rounded-md` and ensure strict semantic token usage with 20% opacity.
  - Update `HealthCell` to use `w-1.5 h-1.5` status dots with semantic shadows.
  - Ensure all `ActionButton` labels use the mandatory technical typography.
- **Detail View**:
  - Replace legacy `FilterBar` with `IndustrialTabs`.
  - Standardize header actions.

## Technical Details
- Component: `IndustrialTabs`, `ActionButton`, `PageLayout`.
- Styling: Tailwind CSS with semantic tokens.
- Verification: Playwright screenshots.

## Bitacora (CROMA.md)
- [x] Phase 0: Territory Block.
