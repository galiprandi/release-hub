# Design System - ReleaseHub

## Industrial Resonance V2
- **Font**: Inter (Google Fonts, variable opsz 14-32, weights 300-700). Configured in `index.html` with `preconnect` + `display=swap`. Applied globally in `index.css` with `font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11'` (alternate glyphs for a/i/l/1) and antialiased rendering. Fallback: `system-ui, -apple-system, sans-serif`.
- **Typography**: `tracking-tight` (names), `text-[10px] font-bold uppercase tracking-wider` (labels).
- **Hierarchy**: Semantic tokens + 20% opacity (`bg-success/20 border-success/20`).
- **Geometry**: `rounded-xl` (containers), `rounded-lg` (actions), `rounded-md` (badges).
- **Hardening**: Middleware `spawn` con `shell: false` y timeout obligatorio de 30s (`spawnAsync`). Centralización de seguridad en `src/utils/security.ts`. Allow-list estricto en `/local/exec` (shells y node prohibidos). Validación estricta de recursos Kubernetes (RFC 1123) en todos los middlewares locales. Allow-list de scripts autorizados en `/local/script`. SSRF protection bloqueando 127.0.0.0/8, 169.254.0.0/16, CGNAT y IPv6 local, incluyendo representaciones decimales y hexadecimales de IPs para prevenir bypasses por normalización. DNS Rebinding protection mediante pre-resolución de hostnames en el proxy. Sanitización de inputs para CLI. Escapado HTML obligatorio en componentes que utilicen `dangerouslySetInnerHTML` (XSS Hardening).
- **Standard Cells**: Health (semantic dots), PRs (primary badge), Workflows (status badge + pulse), Operations (high-density actions).
- **Focus**: Administrative dialogs and interactive elements use `focus:ring-primary/20` for a refined technical aesthetic.
- **ARIA**: Explicit `aria-label` for icon buttons.

## Component Patterns
- **Table**: `bg-muted/40` headers, technical metadata, vertical dividers. Internal filter bar uses `bg-muted/40` with a nested segmented-control layout for a professional aesthetic.
- **EmptyState**: Centered layout featuring an icon in a `p-4 rounded-full bg-muted/20 border border-border/40` container. Typography for labels is strictly `text-[10px] font-bold uppercase tracking-[0.2em]`.
- **StatusCard**: Loading/error/offline states.
- **ActionButton**: Iconographic with tooltip.
- **IndustrialTabs**: Unified selector for modals, panels, and persistent sorting/filtering.
- **Terminal**: High-density technical header with session metadata (e.g., 'Sesión Local Activa', '/bin/bash'). Semantic status dots (OK/Error) with technical shadows. Viewport uses `bg-zinc-950` background.
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
- **Build Hygiene**: El log de build debe permanecer con cero advertencias. Cualquier `any` o dependencia de hook faltante debe ser resuelta inmediatamente. La eliminación de código muerto (`useKubectlNamespaceAccess.ts`) es mandatoria para mantener la higiene.

## Specific Module Standards

### Docker UI Resonance
- **Header Promotion**: Status filtering (Todos, Ejecutando, Detenido, Finalizado) is promoted to the `PageLayout` header using `IndustrialTabs`, synchronized with the `status` search parameter. Header title includes the technical `Boxes` icon.
- **Table Cells**:
  - `StatusCell`: High-density technical status labels (OK, ERROR, Detenido) accompanied by semantic dots with shadows and animations (OK = pulse). Backgrounds use 20% opacity semantic tokens.
  - `StartedCell`: High-density technical metadata using `text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60`.
  - `PortsCell`: Standardized selection of external ports with high-density technical badges for opening ports.
  - `ActionsCell`: Operations are hidden until row hover using the `opacity-0 group-hover:opacity-100` pattern to reduce visual noise.
- **Empty State**: V2 technical style featuring a centered layout with a `Boxes` icon in a circular `bg-muted/20` container and bold uppercase tracking-wider typography.
- **Placeholder Standard**: Access verification (`checkingAccess`) renders `null` to avoid layout shifts and maintain a clean visual state.

### Health Monitor Resonance
- **Route Filtering**: Primary environment filtering (Production, Staging, Unhealthy) is moved to the PageLayout header using IndustrialTabs (synchronized with `environment` search parameter).
- **Product Grouping**: Product sections use `bg-muted/10` containers with `rounded-xl` geometry and technical `Box` icons in `bg-muted/20` headers.
- **Navigation & Controls**: Environment filtering (All, Prod, Stag, Error) and Sorting (Nombre, Errores, Recientes) are globalized in the `PageLayout` header using `IndustrialTabs`. Environment tabs include dynamic status counts (e.g., 'Production (5)').
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
- **Namespace Filtering**: Promoted to the `PageLayout` header using `IndustrialTabs`, synchronized with the `namespace` search parameter. Per-table filter bars are removed for high-density consistency.
- **Grouping**: Favorites are grouped by `context` (Boxes icon). Projects are grouped by `project.id` (Folder icon).
- **Deployment Status**: Badges use semantic tokens (success/info/destructive/muted) with 20% opacity and `rounded-md`. Labels are localized (Saludable, Procesando, Degradado, Desconocido).
- **Search UI**: On-demand namespace search with 400ms debounce. Queries `searchDeploymentsByNamespace` across all contexts in parallel. High-density dropdown with technical metadata (Namespace, Context, Ready/Up-to-date/Available counts) and keyboard-centric navigation hints. No hardcoded namespace list.

### GitHub UI Resonance
- **Dashboard Layout**: Primary collection navigation (`IndustrialTabs`) and project management actions reside in the `PageLayout` header.
- **Global Filtering**: Dashboard-level filtering (e.g., 'Pendientes') uses `IndustrialTabs` enclosed in `bg-muted/40` containers with `border-border/40` to match technical standards.
- **Table Cells**:
  - `HealthCell`: Includes semantic dots (OK pulse) and high-density technical labels ('OK'/'ERROR') with semantic colors.
  - `PRsCell` & `ActionsStatusCell`: Use semantic backgrounds with 20% opacity and technical borders.
  - `OperationsCell`: Implements hover-to-reveal (`opacity-0 group-hover:opacity-100`) to maintain layout focus.
- **Detail View**: Navigation (Commits/Tags), external links (PRs, Actions), and `ProjectSelector` are promoted to the `PageLayout` header and actions array. Links use `bg-muted/40` and high-density technical typography.

### Novedades Page Resonance
- **Header**: High-density technical header with the 'Newspaper' icon.
- **Content**: Encapsulated in a `bg-muted/10` container with `border-border/40`, `rounded-xl` geometry, and `p-8` padding.

### Fetcher UI Resonance
- **Navigation & Sorting**: Dual `IndustrialTabs` implementation for method filtering (ALL, GET, POST, etc.) and persistent sorting (Recent, Method, Status, Duration), synchronized with `method` and `sortBy` search parameters.
- **Table Structure**:
  - `UrlCell`: Domain as technical metadata (`text-[10px] font-bold uppercase text-muted-foreground/60`) and Path as primary content (`text-sm font-medium`).
  - Headers: Standard high-density `span` pattern (`text-[10px] font-bold uppercase tracking-wider`).
  - Actions: 20% opacity backgrounds on hover for `ActionButton` components.

### Diff Viewer Resonance
- **Navigation**: Uses `IndustrialTabs` in `DiffControls` for mode selection (JSON, JWT, cURL, JS, TS, etc.), synchronized with the `mode` search parameter in `src/routes/diff.tsx`.
- **Typography**: High-density technical metadata (`text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60`) for panel headers and comparison results.
- **Visual Containers**: Main view and panels use `bg-muted/10` background and `border-border/60` for refined hierarchy. Panel headers include a decorative semantic dot for visual anchoring.
- **Empty State**: Uses `bg-muted/10` and `border-border/40` geometry with `tracking-widest` typography for technical placeholders.
- **Controls**: Action buttons (Solo diffs, Expand, Copy) use semantic shadows and 20% opacity backgrounds on hover/active states.
