# Design System - ReleaseHub

Este documento define los tokens, principios y patrones visuales del proyecto para asegurar la consistencia y accesibilidad.

## Tokens de Color (Semánticos)

ReleaseHub utiliza una paleta semántica basada en variables de CSS para soportar temas (claro/oscuro) de forma nativa.

- **Primary**: `bg-primary`, `text-primary`. Color principal de marca y acciones destacadas.
- **Muted**: `bg-muted`, `text-muted-foreground`. Utilizado para elementos secundarios, fondos de inputs y textos de menor jerarquía.
- **Accent**: `bg-accent`, `text-accent-foreground`. Utilizado para estados de hover y resaltado interactivo.
- **AI**: `text-ai`. Color distintivo para funcionalidades potenciadas por IA (púrpura/indigo).
- **Success**: `text-success`. Utilizado para estados positivos y finalizaciones exitosas.
- **Warning**: `text-warning`. Utilizado para estados de advertencia o precaución.
- **Info**: `text-info`. Utilizado para información neutral o estados en progreso.
- **Destructive**: `text-destructive`. Utilizado para acciones críticas o errores.

## Industrial Resonance V2 - Refinamientos de Elite

- **Tipografía Técnica**: Uso sistemático de `tracking-tight` para nombres de elementos y `tracking-wider` para labels en mayúsculas.
- **Jerarquía de Color**: Aplicación estricta de opacidades semánticas (10-20%) para fondos de contenedores de estado (ej: `bg-success/10 border-success/20`).
- **Geometría**: Evolución de `rounded-md` a `rounded-xl` para contenedores principales y `rounded-lg` para elementos de acción, suavizando la estética industrial sin perder su carácter técnico.

## Docker UI Pattern (Resonancia Industrial)

- **Badges de Estado**: Usar `bg-success/20 text-success` para estados activos y `bg-muted text-muted-foreground` para estados inactivos o detenidos. Aplicar `font-bold uppercase tracking-wider text-[10px] rounded-md` para mayor legibilidad y consistencia.
- **Acciones de Fila**: Botones iconográficos con `hover:bg-accent` y colores semánticos. Deben implementar el anillo de foco estándar del sistema.
- **Feedback de Carga/Acceso**: Implementar `StatusCard` como componente estándar para todos los estados de carga, error y "offline".
- **Tabla de Contenedores**: Bordes sutiles `border-border/60` y encabezados con `text-xs uppercase tracking-wider` para una estética profesional.

## Componentes de Feedback

### StatusCard
- Utilizado para estados globales de carga, error o advertencia en monitores y paneles.
- Soporta tipos: `loading`, `error`, `warn`, y `offline`.
- Los botones de acción deben usar colores semánticos (ej: `bg-destructive/10` para reintentos en errores).
- Utiliza bordes sutiles con opacidad (ej: `border-destructive/20`).

### DeployStatusIndicator
- Implementación estricta de tokens semánticos: `text-success` (completado), `text-destructive` (fallido), `text-info` (en progreso), `text-warning` (advertencia).

## Refinamiento de Componentes

### MiniTimeline
- Uso estricto de tokens semánticos (`text-success`, `text-info`, `text-destructive`, `text-warning`, `bg-success`, `bg-info`, `bg-destructive`, `bg-warning`) evitando colores hardcodeados de Tailwind (como `text-blue-600` o `bg-green-500`).
- Los dots de la línea de tiempo tienen un tamaño estándar de `h-2.5 w-8` y utilizan `focus-visible:ring-offset-1` para accesibilidad.
- El `HoverCardContent` se presenta sin padding interno base (`p-0`) para permitir secciones con bordes limpios y fondos sutiles.

### AISummaryCard
- Utiliza `bg-ai` para el fondo y `text-ai-foreground` para el texto.
- Los iconos deben estar contenidos en un div con `bg-white/10` y un anillo sutil (`ring-white/20`) para mejorar la resonancia visual.
- Botones de acción con `w-8 h-8` y `hover:bg-white/10`.

### RepoSearch
- Dropdown con `bg-popover` y sombras pronunciadas (`shadow-xl`).
- Acciones de fila (favoritos, external links) visibles en focus mediante `focus-within:opacity-100`.
- **Product Toolbar**: Jerarquía dual para reducir la carga cognitiva. Metadata y configuración a la izquierda (separados por `border-border`), operaciones críticas a la derecha para un flujo de trabajo intuitivo.

## Accesibilidad (a11y)

### Estados de Enfoque (Focus Rings)

Todos los elementos interactivos deben implementar un anillo de enfoque claro para usuarios de teclado:

```tailwind
focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1
```

### Atributos ARIA

- **Botones de Icono**: Deben incluir siempre `aria-label`.
- **Diálogos**: Deben usar `BaseDialog` que asegura `Dialog.Title` y `Dialog.Description` (aunque sea `sr-only`).
- **Filtros**: Los botones de estado deben usar `aria-pressed` para comunicar si están activos.

## Patrones de Componentes

### PageHeader
- Icono con fondo sutil (`bg-primary/10`).
- Título con `tracking-tight` para mayor elegancia.

### FilterBar
- **Variante Default**: Uso de `bg-muted` para botones inactivos y `bg-primary` para el activo.
- **Variante Tabs**: Estética industrial de alta densidad. Contenedor `bg-muted` con padding `p-1`. Botones activos con `bg-background shadow-sm text-foreground` e inactivos con `text-muted-foreground hover:text-foreground`.
- Inputs con `border-input` y `bg-background`.

### Table (Resonancia Industrial)
- **Contenedor**: `rounded-xl`, `border-border/60`, `shadow-sm`, `overflow-hidden`, `bg-background`.
- **Encabezados**: `bg-muted/40` con celdas `text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60`.
- **Filas**: `hover:bg-muted/20`, `transition-colors`, `divide-y` en el `tbody`.
- **Filtros Integrados**: Botones ultra-compactos `text-[10px] font-bold uppercase tracking-wider`.
- **Celdas de Datos**: Nombres de elementos con `font-medium tracking-tight`, metadatos con `text-muted-foreground`.

### DisplayInfo
- Abstracción para mostrar metadatos (commits, tags, autores) con iconos y colores semánticos.
- Soporta tooltips automáticos para contenido truncado o fechas.

### StatusCard (Blindaje y Resonancia)
- **Estados**: Soporta `loading`, `error`, `warn` y `offline`.
- **Visual**: Bordes sutiles con opacidad (`border-destructive/20`) y fondos lavados (`bg-destructive/10`) para evitar fatiga visual mientras se mantiene la categorización clara.
- **Robustez**: Implementa `truncate` en el mensaje para prevenir desbordamientos en layouts densos.

### Fetcher & ImportQueryModal
- **Interacciones**: Uso obligatorio de `ActionButton` para acciones de fila y controles de modal.
- **Campos de Entrada**: Inputs y selects deben usar `border-input`, `bg-background` y `focus-visible:ring-primary` con `focus-visible:ring-offset-1` para una consistencia táctil y visual.
- **Badge de Método**: Mapeo semántico de métodos HTTP a opacidades (`bg-success/20 text-success` para GET, `bg-info/20 text-info` para POST, etc.) con fuente `text-[10px] font-bold uppercase tracking-wider`.
- **Tabs Industriales**: Los selectores de pestañas en modales deben usar el estilo `bg-muted/40` con botones de estado `bg-background shadow-sm` para el elemento activo, similar a `FilterBar`.

## Layout V2 - Patrones y Guía de Uso

### Estructura del Layout

El layout V2 sigue un patrón de sidebar fijo + contenido principal con header sticky:

```tsx
<div className="flex min-h-screen bg-background text-foreground">
  {/* Sidebar fijo */}
  <aside className="w-[50px] h-screen sticky top-0 flex flex-col items-center py-4 bg-muted/30 border-r border-border/40 shrink-0">
    {/* Navegación */}
  </aside>

  {/* Contenido principal */}
  <main className="flex-1 flex flex-col min-w-0 gap-5">
    {/* Header sticky con degradado */}
    <div className="sticky top-0 z-10">
      <header className="h-14 bg-background/80 backdrop-blur-sm border-b border-border/40">
        {/* Contenido del header */}
      </header>
      {/* Barra de degradado */}
      <div className="h-4 bg-gradient-to-b from-border/30 to-transparent shrink-0" />
    </div>

    {/* Contenido scrollable */}
    <div className="flex flex-col gap-6 px-8">
      {/* Widgets/Métricas */}
      {/* Tabla de datos */}
    </div>
  </main>
</div>
```

### Header Sticky con Degradado

**Patrón crítico**: El header sticky debe estar envuelto en un contenedor `sticky` que incluya tanto el header como la barra de degradado.

```tsx
<div className="sticky top-0 z-10">
  <header className="h-14 bg-background/80 backdrop-blur-sm border-b border-border/40">
    {/* Breadcrumb, búsqueda, acciones */}
  </header>
  <div className="h-4 bg-gradient-to-b from-border/30 to-transparent shrink-0" />
</div>
```

**Reglas importantes**:
- El contenedor padre (`main`) NO debe tener `overflow-hidden` o el sticky no funcionará.
- La barra de degradado crea una transición suave entre el header y el contenido que scrollea.
- `backdrop-blur-sm` + `bg-background/80` para efecto de vidrio esmerilado.

### Jerarquía Tipográfica

Usar negritas (`font-bold`, `font-semibold`) solo para elementos críticos:

- **Breadcrumb**: `text-sm font-semibold uppercase tracking-wider text-muted-foreground/80`
- **Headers de tabla**: `text-xs font-bold uppercase tracking-wider text-muted-foreground`
- **Status badges**: `text-xs font-bold uppercase tracking-wider`
- **Labels de métricas**: `text-xs font-bold uppercase tracking-tighter`
- **Tags**: `text-xs font-mono font-medium`
- **Nombres de repos**: `font-medium` (no bold)

### Espaciado

- **Gap entre secciones principales**: `gap-5` o `gap-6` en el `main`
- **Padding horizontal del contenido**: `px-8` en el contenedor de widgets/tabla
- **Padding del header**: `px-6`
- **Altura del header**: `h-14` (56px)
- **Altura de la barra de degradado**: `h-4` (16px)

### HTML Semántico y Accesibilidad

**Estructura semántica**:
- `aside` para la barra lateral de navegación
- `nav` con `aria-label` para menús de navegación
- `header` para la barra superior
- `section` con `aria-label` para áreas de contenido (widgets, tabla)
- `article` para widgets individuales
- `h1` para breadcrumb/título principal
- `h2` (con `sr-only`) para títulos de secciones de contenido

**ARIA attributes**:
- `aria-label` en botones de icono y áreas de navegación
- `aria-hidden="true"` en elementos decorativos (iconos, indicadores visuales)
- `aria-current="page"` en el item de navegación activo
- `sr-only` para labels de inputs (usar `<label htmlFor="...">` con `className="sr-only"`)
- `role="list"` y `role="listitem"` para listas de navegación

### Atajos de Teclado

- **Búsqueda**: Placeholder debe indicar el shortcut correcto: `placeholder="Buscar... (CMD+K)"`

### Widgets/Métricas Bar

```tsx
<section aria-label="Widgets del sistema">
  <article className="h-16 bg-muted/10 border-border/20 flex items-center gap-4">
    {/* Widget individual */}
  </article>
</section>
```

- Usar `article` para cada widget individual
- `section` con `aria-label` para el contenedor
- Bordes sutiles: `border-border/20` o `border-border/30`
- Fondo lavado: `bg-muted/10`

### Tabla de Datos

```tsx
<table className="w-full text-left border-collapse">
  <thead>
    <tr className="bg-muted/40 border-b border-border/60">
      <th scope="col" className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {/* Header */}
      </th>
    </tr>
  </thead>
  <tbody className="divide-y divide-border/40">
    {/* Filas */}
  </tbody>
</table>
```

- `scope="col"` en headers de tabla
- Bordes sutiles: `border-border/60` (thead), `divide-border/40` (tbody)
- Fondo de header: `bg-muted/40`

### Headers de Tabla con Contexto

Cuando se muestran múltiples tablas agrupadas por un contexto (ej: organizaciones en GitHub, contextos en Kubernetes), usar el contexto como header de la primera columna en lugar de un label genérico:

```tsx
{
  accessorKey: "name",
  header: () => (
    <div className="flex items-center gap-2">
      <Building2 className="w-5 h-5" />
      <span>{org}</span>
    </div>
  ),
  cell: ({ row }) => <RepoNameCell repo={row.original} />,
}
```

Esto aplica cuando:
- Hay múltiples tablas del mismo tipo agrupadas por un atributo (org, contexto, namespace, etc.)
- El contexto ya se muestra visualmente como título de sección antes de la tabla
- Se mantiene consistencia con el patrón usado en `/github` para organizaciones

### Componentes Compartidos

Antes de crear componentes nuevos, verificar si extienden:
- **FilterBar**: Para barras de filtros
- **PageHeader**: Para headers de página
- **BaseDialog**: Para todos los diálogos modales
- **DisplayInfo**: Para mostrar metadatos con iconos
- **ActionButton**: Para botones de acción iconográficos con tooltip

### ActionButton

Componente reutilizable para botones de acción iconográficos con tooltip integrado. Estándar para todas las acciones de fila en tablas (Docker, K8s, repos, etc.).

## Security Validation Standard

- **Shell Injection Protection**: Todos los comandos externos se ejecutan utilizando un sistema de escape POSIX-compatible.
- **Verification**: Refactorizaciones de endurecimiento de shell deben ser verificadas por `src/api/security.test.ts`.
- **Render-safe Ref Access**: El acceso a `.current` de los Refs de React está prohibido durante la fase de renderizado. Toda lógica de sincronización (ej: scroll en DiffViewer) debe encapsularse en event handlers estabilizados con `useCallback`.
- **Type Safety Strategy**: Se prohíbe el uso de `any`. Se prioriza el uso de interfaces explícitas y `unknown` para asegurar la integridad de los datos en tiempo de compilación.

**Uso básico**:
```tsx
import { ActionButton, ACTION_DEFINITIONS } from "@/components/ui/ActionButton"

<ActionButton
  action={ACTION_DEFINITIONS.viewLogs}
  onClick={handleViewLogs}
  disabled={!isEnabled}
/>
```

**Props**:
- `action`: Definición de acción (icono, label, color)
- `onClick`: Handler del click
- `disabled`: Estado deshabilitado
- `size`: "sm" | "md" (default: "md")
- `tooltipSide`: "top" | "right" | "bottom" | "left" (default: "top")
- `className`: Clases adicionales

**Colores disponibles**:
- `default`: Gris/muted para acciones neutrales
- `success`: Verde para acciones positivas (iniciar, confirmar)
- `destructive`: Rojo para acciones críticas (eliminar, detener)
- `primary`: Color de marca para acciones destacadas
- `warning`: Amarillo para precauciones
- `info`: Azul para información

**Diccionario de acciones**: `ACTION_DEFINITIONS` incluye acciones predefinidas para Docker, GitHub, K8s, etc. Consultar `src/components/ui/actionDefinitions.ts` para el listado completo.

### Reglas de Negritas

**Usar negritas para**:
- Headers de tabla
- Badges de estado
- Labels de métricas
- Nombres de repos (opcional, según contexto)

**NO usar negritas para**:
- Texto descriptivo general
- Metadata secundaria
- Contenido de cuerpo

### Debug de Sticky

Si el header sticky no funciona:
1. Verificar que el contenedor padre NO tenga `overflow-hidden`
2. Verificar que el elemento con `sticky` tenga un ancestro con scroll
3. Usar `sticky top-0` (no `top-4` u otro valor a menos que sea intencional)
4. Verificar `z-index` (debe ser mayor que elementos detrás)
### GitHub Repository Detail Standard
- **Pipeline Monitor**: Uso obligatorio de `UnifiedPipelineMonitor`.
- **Navegación**: Utilizar `FilterBar` con `variant="tabs"` para alternar entre vistas (Commits/Tags).
- **Acciones**: Links externos (PRs, Actions) estandarizados con estilo `rounded-lg`, `bg-muted/40` y `text-xs font-bold uppercase`.
