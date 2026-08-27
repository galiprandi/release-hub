# Design System - ReleaseHub

> Canon: Linear/Vercel — dark-first, neutral, keyboard-first, denso pero ordenado.
> Reemplaza Industrial Resonance V2. Ejecutado a fidelity completa, sin quirk.

## Direction Contract

**THESIS:** ReleaseHub deja de ser un dashboard SaaS cyan-teal con tipografía técnica uppercase y se convierte en un tool dev dark-first, neutral, con jerarquía por tamaño/peso/color — el estándar de categoría ejecutado straight.

**OWN-WORLD:** Paleta neutral dark-first (near-black bg, near-white fg, hairline borders). Inter como face primaria con jerarquía por size+weight+color. Geometría small-radius (6-8px). Un accent indigo sutil. Shadows sutiles con offset. Keyboard-first.

**STORY:** El developer abre ReleaseHub y ve un tool que se sienta junto a Linear — limpio, denso, ordenado, sin chrome decorativo. La información técnica se lee al instante. El AI assistant está presente pero no grita.

**FIRST VIEWPORT:** Sidebar estrecho con iconos, header minimal con título + filtros integrados, tabla densa con hairline borders, status dots sutiles, sin badges uppercase. Dark mode default.

**FORM:** Canon (Linear/Vercel standard), ejecutado straight, sin quirk smuggleado.

## Typography

- **Font**: Inter (Google Fonts, variable opsz 14-32, weights 300-700). Configured in `index.html` with `preconnect` + `display=swap`. Applied globally in `index.css` with antialiased rendering. Fallback: `system-ui, -apple-system, sans-serif`.
- **Hierarchy**: por size + weight + color, **nunca** por `uppercase tracking-wider`.
  - Page titles: `text-lg font-semibold tracking-tight`
  - Section headers: `text-sm font-medium`
  - Body / cell content: `text-sm` (14px)
  - Labels / metadata: `text-xs text-muted-foreground` (12px, medium weight, sin uppercase)
  - Code / data / measurements: `font-mono text-xs`
- **Tracking**: `tracking-tight` en títulos, `tracking-normal` en body, `-0.02em` max en display.
- **Prohibido**: `text-[10px] font-bold uppercase tracking-wider` y `tracking-[0.2em]` — eran el alma de Industrial Resonance V2 y quedan erradicados.

## Color Strategy

**Restrained**: neutrals + un accent (indigo). El accent aparece en foco, primary actions, revalidation dots y highlights — no como fondo de contenedores.

### Dark mode (default)
- `--background`: near-black neutral (`oklch(0.16 0.003 286)`)
- `--foreground`: near-white (`oklch(0.97 0 0)`)
- `--card`: ligeramente más claro que bg (`oklch(0.185 0.003 286)`)
- `--muted`: surface para hover/secondary (`oklch(0.22 0.003 286)`)
- `--muted-foreground`: texto secondary (`oklch(0.63 0.01 286)`)
- `--border`: hairline sutil (`oklch(0.26 0.003 286)`)
- `--primary`: indigo (`oklch(0.62 0.19 265)`)
- `--destructive`: red (`oklch(0.55 0.22 25)`)
- `--success`: green (`oklch(0.55 0.16 142)`)
- `--warning`: amber (`oklch(0.70 0.15 70)`)
- `--ai`: violet (`oklch(0.60 0.18 300)`)

### Light mode
- `--background`: white (`oklch(1 0 0)`)
- `--foreground`: near-black (`oklch(0.16 0.003 286)`)
- `--border`: hairline (`oklch(0.91 0.003 286)`)
- `--primary`: indigo (`oklch(0.55 0.19 265)`)
- Mismas relaciones semánticas, invertidas.

## Geometry

- **Radii**: `rounded-md` (6px) para containers y cards, `rounded` (4px) para badges y small controls, `rounded-lg` (8px) para dialogs y panels grandes. **Prohibido** `rounded-xl` y `rounded-2xl` — eran V2.
- **Borders**: hairline 1px (`border border-border`). Sin `border-border/40` ni `border-border/60` — el border es el border.
- **Shadows**: sutiles con offset (`shadow-sm`, `shadow-md`). Prohibido `shadow-[0_0_15px_rgba(...)]` — era V2 halo decoration.
- **Elevation**: declarar una vez — border **o** shadow, no ambas. Un 1px border bajo una shadow wide es el ghost card.

## Component Patterns

### Table
- Headers: `text-xs font-medium text-muted-foreground`, sin `bg-muted/40`. Fondo transparente o `bg-background`.
- Dividers: hairline `border-b border-border` entre rows. Sin vertical dividers decorativos.
- Row hover: `hover:bg-muted/30` — sutil, un solo tono.
- Cells: `text-sm`, metadata en `text-xs text-muted-foreground font-mono` cuando es data técnica.
- Sin `bg-muted/40` en headers. Sin `bg-border/20` dividers.

### Badges & Status
- **Badges**: `rounded` (4px), `text-xs font-medium`, `px-1.5 py-0.5`. Backgrounds con `/15` opacity (más sutil que `/20`). Sin uppercase.
- **Status dots**: `w-1.5 h-1.5 rounded-full` con color semántico. OK incluye `animate-pulse` sutil. Sin shadows decorativas en dots.
- **Labels**: texto natural (OK, Error, Detenido) en `text-xs font-medium` con color semántico — sin `text-[10px] uppercase`.

### Inputs & Search
- `bg-background border border-border rounded-md text-sm`. Focus: `focus:ring-2 focus:ring-primary/30 focus:border-primary`. Sin `bg-muted/40`.
- Placeholders: `text-muted-foreground/60`.

### Buttons
- Primary: `bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90`.
- Secondary: `border border-border bg-background hover:bg-muted/30 rounded-md`.
- Ghost: `hover:bg-muted/30 rounded-md`.
- Icon buttons: `rounded-md p-2 hover:bg-muted/30`, con `aria-label`.
- **Prohibido** `rounded-lg` en buttons — era V2. Usar `rounded-md`.

### Cards & Containers
- `border border-border rounded-md bg-card`. Sin `bg-muted/40`, sin `bg-muted/10`, sin `rounded-xl`.
- Padding: `p-4` o `p-6` según densidad.

### EmptyState
- Centrado, icono en `p-3 rounded-md bg-muted/30 border border-border`. Label: `text-sm font-medium text-muted-foreground`. Sin `text-[10px] uppercase tracking-[0.2em]`.

### Dialogs (BaseDialog)
- `rounded-lg bg-background border border-border shadow-lg`. Header con `text-sm font-semibold`. Sin `rounded-xl`.

### Tabs (IndustrialTabs → Tabs)
- Renombrar conceptualmente a **Tabs** (el nombre IndustrialTabs era V2 branding).
- Estilo: `inline-flex items-center gap-1 p-1 bg-muted/30 rounded-md`. Tab activo: `bg-background text-foreground shadow-sm`. Tab inactivo: `text-muted-foreground hover:text-foreground`.
- Sin `bg-muted/40` containers alrededor.

### DropdownMenu (shadcn)
- Trigger: `bg-muted/30 border border-border rounded-md text-xs font-medium`. Focus: `focus-visible:ring-2 focus-visible:ring-primary/30`.
- Content: `rounded-md border border-border bg-popover shadow-md`. Items: `text-sm`, `focus:bg-accent`.
- Usado para selector de colección en `/github` (Favoritos + proyectos).

### AI Chat
- User bubble: `bg-primary text-primary-foreground rounded-lg`. Sin `shadow-[0_0_15px_rgba(...)]`.
- Assistant bubble: `bg-muted/30 border border-border rounded-lg`.
- Input: `bg-background border border-border rounded-md`.

### Terminal
- Viewport: `bg-zinc-950` (se mantiene). Header: `text-xs text-muted-foreground` con metadata de sesión. Sin `text-[10px] uppercase tracking-wider`.

### SetupCard
- `border border-border rounded-md bg-card`. Estados Installed/Missing con accent semántico en un dot o icon, no en backgrounds completos. Labels: `text-xs font-medium text-muted-foreground`.

## Layout

- **Sidebar**: fijo, 50px (colapsado) / 240px (expandido). `border-r border-border bg-background`. Icons con `rounded-md` hover.
- **Header**: sticky con `backdrop-blur-sm bg-background/80 border-b border-border`.
- **Content**: `px-6 py-6 gap-6`. Más compacto que V2 (`px-8`).
- **PageLayout**: título `text-lg font-semibold tracking-tight`, acciones alineadas a la derecha.

## State Management & Search

- **URL-First**: todo estado visual vive en search params (TanStack Router). Sin cambios.
- **Single Source of Truth**: sin duplicar search param state en `useState`. Sin cambios.

## Cache-First UI Patterns (ADR-001)

> La red es una corrección en background. La UI nunca bloquea por datos.

### Loading
- Skeleton **solo** si `!data`. Nunca spinner overlay sobre contenido existente.

### Revalidation Indicator
- `w-1.5 h-1.5 rounded-full bg-primary animate-pulse` en header cuando `isFetching && !!data`.

### Stale Indicator
- Timestamp relativo (`text-xs text-muted-foreground`) cuando `dataUpdatedAt > staleTime`.
- Badge `bg-warning/15 text-warning rounded` con tooltip si >24h.

### Animated Diffs
- Nuevos items: `transition-all duration-300`, `opacity-0 → opacity-100`.
- Highlight temporal: `bg-primary/5` por 2s, luego fade out.
- CSS `transition` sobre `max-height` y `opacity`. No Framer Motion.

### Error Notification
- Mutaciones: solo toast en error. Éxito = silencio. Rollback automático.

## Module Standards

### Docker
- Status filtering en PageLayout header via Tabs (sync `status` param). Icon `Boxes` en título.
- `StatusCell`: dot semántico + label `text-xs font-medium` (OK/Error/Detenido). Sin uppercase.
- `ActionsCell`: hover-to-reveal (`opacity-0 group-hover:opacity-100`).
- Empty state: icon en `rounded-md bg-muted/30`, label `text-sm`.

### Health Monitor
- Environment filtering (Production/Staging/Unhealthy) en header via Tabs.
- Product sections: `border border-border rounded-md bg-card`. Header con icon `Box` + `text-sm font-medium`.
- Status dots: `w-1.5 h-1.5 rounded-full` con color semántico. OK pulse.
- Double-line URLs: domain (`text-xs text-muted-foreground`), path (`font-mono text-xs`).

### Kubernetes
- Setup: `SetupCard` con `rounded-md`, labels `text-xs font-medium`.
- Dashboard: Tabs para Favoritos/Proyectos (sync `tab` param).
- Namespace filtering en header via Tabs (sync `namespace` param).
- Deployment status: badges `rounded text-xs font-medium` con `/15` opacity. Labels localizados.

### GitHub
- Dashboard: selector de colección (Favoritos + proyectos) es `DropdownMenu` (shadcn) en el PageLayout header; sync `tab` param. Acciones de proyecto en header.
- Org grouping: `border border-border rounded-md bg-card`. Collapsible. Header con `text-sm font-medium` + count.
- `HealthCell`: dot semántico + `text-xs font-medium` (OK/Error).
- `OperationsCell`: hover-to-reveal.
- Detail view: nav + links en header. Links: `text-sm hover:bg-muted/30 rounded-md`.

### Fetcher
- Dual Tabs para method filtering y sorting (sync `method`, `sortBy` params).
- Header search (`q` param).
- `UrlCell`: domain (`text-xs text-muted-foreground`), path (`text-sm font-medium`).
- Headers: `text-xs font-medium text-muted-foreground`.

### Diff Viewer
- Tabs para mode selection (sync `mode` param). Responsive `w-full sm:w-[620px]`.
- Panel headers: `text-xs text-muted-foreground`.
- Containers: `border border-border rounded-md bg-card`. Code viewport: `bg-zinc-950/30`.
- Line highlighting: semantic backgrounds `/15` opacity.
- Controls: `rounded-md`, `hover:bg-muted/30`.

### Novedades
- Header con icon `Newspaper` + `text-lg font-semibold`.
- Content: `border border-border rounded-md bg-card p-6`.

## Hardening (sin cambios)

- Middleware `spawn` con `shell: false`, timeout 30s (`spawnAsync`).
- Centralización en `src/utils/security.ts`. Allow-list estricto.
- SSRF protection con DNS Rebinding protection.
- XSS: escapado HTML obligatorio en `dangerouslySetInnerHTML`.

## Focus & Accessibility

- Focus visible: `focus:ring-2 focus:ring-primary/30 focus:border-primary`.
- `aria-label` explícito en icon buttons.
- Navegación por teclado. Contraste ≥4.5:1 body, ≥3:1 large text.

## Build Hygiene

- Zero-warning build obligatorio. `any` o dependencias faltantes se resuelven inmediatamente.
- Dead code elimination mandatoria.
