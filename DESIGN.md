# Design System - ReleaseHub

## Industrial Resonance V2
- **Typography**: `tracking-tight` (names), `text-[10px] font-bold uppercase tracking-wider` (labels).
- **Hierarchy**: Semantic tokens + 20% opacity (`bg-success/20 border-success/20`).
- **Geometry**: `rounded-xl` (containers), `rounded-lg` (actions), `rounded-md` (badges).
- **Hardening**: Middleware `spawn` con `shell: false`. Allow-list estricto en `/local/exec` (shells y node prohibidos). Validación estricta de recursos Kubernetes (RFC 1123) en todos los middlewares locales. Allow-list de scripts autorizados en `/local/script`. SSRF protection bloqueando 127.0.0.0/8, 169.254.0.0/16, CGNAT y IPv6 local. DNS Rebinding protection mediante pre-resolución de hostnames en el proxy. Sanitización de inputs para CLI.
- **Standard Cells**: Health (semantic dots), PRs (primary badge), Workflows (status badge + pulse), Operations (high-density actions).
- **Focus**: `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1`.
- **ARIA**: Explicit `aria-label` for icon buttons.

## Component Patterns
- **Table**: `bg-muted/40` headers, technical metadata, vertical dividers. Badges at `/20` opacity.
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
- **Build Hygiene**: El log de build debe permanecer con cero advertencias. Cualquier `any` o dependencia de hook faltante debe ser resuelta inmediatamente.

## Specific Module Standards

### Docker UI Resonance
- **Status Filtering**: Managed via top-level `IndustrialTabs` in the route, persisting state in the `status` search parameter (all, running, stopped, exited).
- **Table Cells**:
  - `StatusCell`: Badges using semantic tokens with 20% opacity (`bg-success/20`, etc.), `rounded-md`, and `text-[10px] font-bold uppercase tracking-wider`.
  - `StartedCell`: Technical metadata using `text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60`.
- **Placeholder Standard**: Access verification (`checkingAccess`) renders `null` to avoid layout shifts and maintain a clean visual state.

### Health Monitor Resonance
- **Route Filtering**: Primary environment filtering (Production, Staging, Unhealthy) is moved to the PageLayout header using IndustrialTabs (synchronized with `environment` search parameter).
- **Product Grouping**: Product sections use `bg-muted/10` containers with `rounded-xl` geometry and technical `Box` icons in `bg-muted/20` headers.
- **Navigation & Controls**: Environment filtering (All, Prod, Stag, Error) and Sorting (Nombre, Errores, Recientes) are globalized in the `PageLayout` header using `IndustrialTabs`.
- **Technical Help**: Help instructions are moved to a `HelpCircle` ActionButton in the header that triggers a `BaseDialog`.
- **Status Dots**: `w-1.5 h-1.5 rounded-full` with semantic shadows for health states (OK/Error). OK includes `animate-pulse`.
- **Product Section**: Encapsulated in `bg-muted/10` with `rounded-xl`. Header includes the standard `Box` icon and high-density technical metadata.
- **Double-line URLs**: Table displays domain (muted, `text-[10px]`) and path (foreground, `font-mono text-xs`).
- **Revalidation**: `bg-primary animate-pulse` dot in header during background checks.

### Novedades Resonance
- **Layout**: High-density header with `Newspaper` icon.
- **Content**: Encapsulated in `bg-muted/10` container with `rounded-xl` and `p-8` for optimal readability.

### Kubernetes UI Resonance
- **Dashboard Navigation**: Uses `IndustrialTabs` for switching between 'Favoritos' and 'Proyectos'. State is persisted via `tab` search parameter.
- **Grouping**: Favorites are grouped by `context` (Boxes icon). Projects are grouped by `project.id` (Folder icon).
- **Deployment Status**: Badges use semantic tokens (success/info/destructive/muted) with 20% opacity and `rounded-md`. Labels are localized (Saludable, Procesando, Degradado, Desconocido).
- **Search UI**: High-density dropdown with technical metadata (Namespace, Context, Ready/Up-to-date counts) and keyboard-centric navigation hints.

### GitHub UI Resonance
- **Dashboard Layout**: Primary collection navigation (`IndustrialTabs`) and project management actions reside in the `PageLayout` header.
- **Global Filtering**: Dashboard-level filtering (e.g., 'Pendientes') is managed via `IndustrialTabs` in the main view, persisting state in the `filter` search parameter.
- **Table Cells**: Technical metadata (Health, PRs, Workflows, Date, Author) uses `text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60`.
- **Health Indicators**: Semantic dots (`w-1.5 h-1.5`) with shadows. OK state includes `animate-pulse`.

### Novedades Page Resonance
- **Header**: High-density technical header with the 'Newspaper' icon.
- **Content**: Encapsulated in a `bg-muted/10` container with `border-border/40`, `rounded-xl` geometry, and `p-8` padding.

### Fetcher UI Resonance
- **Navigation & Sorting**: Dual `IndustrialTabs` implementation for method filtering (ALL, GET, POST, etc.) and persistent sorting (Recent, Method, Status, Duration), synchronized with `method` and `sortBy` search parameters.
- **Table Structure**:
  - `UrlCell`: Domain as technical metadata (`text-[10px] font-bold uppercase text-muted-foreground/60`) and Path as primary content (`text-sm font-medium`).
  - Headers: Standard high-density `span` pattern (`text-[10px] font-bold uppercase tracking-wider`).
  - Actions: 20% opacity backgrounds on hover for `ActionButton` components.
