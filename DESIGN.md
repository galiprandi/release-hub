# Design System - ReleaseHub

## Industrial Resonance V2
- **Typography**: `tracking-tight` (names), `text-[10px] font-bold uppercase tracking-wider` (labels).
- **Hierarchy**: Semantic tokens + 20% opacity (`bg-success/20 border-success/20`).
- **Geometry**: `rounded-xl` (containers), `rounded-lg` (actions), `rounded-md` (badges).
- **Hardening**: Middleware `spawn` con `shell: false`. Allow-list estricto en `/local/exec`. Sanitización de inputs para CLI.
- **Standard Cells**: Health (semantic dots), PRs (primary badge), Workflows (status badge + pulse), Operations (high-density actions).
- **Focus**: `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1`.
- **ARIA**: Explicit `aria-label` for icon buttons.

## Component Patterns
- **Table**: `bg-muted/40` headers, technical metadata, vertical dividers. Badges at `/20` opacity.
- **FilterBar (tabs)**: `bg-muted` container, `bg-background` active item, `p-1`.
- **StatusCard**: Loading/error/offline states.
- **ActionButton**: Iconographic with tooltip.
- **IndustrialTabs**: Unified selector for modals, panels, and persistent sorting/filtering.
- **Docker Terminal**: `bg-primary/10` icons, double-line titles, `bg-zinc-950` background.
- **BaseDialog**: Modal consistency.

## Cache-First Tokens (ADR-001)
| Estado | Token |
|---|---|
| Revalidando | `bg-primary/10 text-primary/70`, icono `animate-spin` (2s) |
| Stale | `bg-warning/10 text-warning`, timestamp `text-muted-foreground/60` |
| Desactualizado (>24h) | `bg-warning/10 text-warning` + icono `Clock` |

## Cache-First UI Patterns

> La red es una corrección en background. La UI nunca bloquea por datos.

### Loading
- Skeleton **solo** si `!data` (no hay data previa en caché).
- Nunca spinner overlay sobre contenido existente.

### Revalidation Indicator
- `w-1.5 h-1.5 rounded-full bg-primary animate-pulse` en header cuando `isFetching && !!data`.
- Nunca bloquear interacción.

### Stale Indicator
- Timestamp relativo (`text-[10px] text-muted-foreground/60`) cuando `dataUpdatedAt > staleTime`.
- Badge `bg-warning/10 text-warning` con tooltip si >24h.

### Animated Diffs
- Nuevos items: `transition-all duration-300`, `opacity-0 → opacity-100`, insertados arriba.
- Highlight temporal: `bg-primary/5` por 2s, luego fade out.
- Técnica: CSS `transition` sobre `max-height` y `opacity`. No Framer Motion.

### Componentes Cache-First
- **RevalidationIndicator**: Dot de revalidación en headers de tabla/card.
- **StaleBadge**: Badge con `Clock` cuando data supera `staleTime`.

### Error Notification
- Mutaciones: **solo** toast en error. Éxito = silencio.
- Rollback automático del caché local en fallo.

## Layout V2
- Sidebar fijo (50px). Sticky header with backdrop-blur.
- Contenido `px-8`, `gap-6`.

## Specific Module Standards

### Health Monitor Resonance
- **Status Dots**: `w-1.5 h-1.5 rounded-full` with semantic shadows for health states (OK/Error). OK includes `animate-pulse`.
- **Product Header**: Stats use semantic badges at 20% opacity. Product names use `tracking-tighter`.
- **Double-line URLs**: Table displays domain (muted, `text-[10px]`) and path (foreground, `font-mono text-xs`).
- **Revalidation**: `bg-primary animate-pulse` dot in header during background checks.
