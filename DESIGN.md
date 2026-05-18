# Design System - ReleaseHub

Este documento define los tokens, principios y patrones visuales del proyecto para asegurar la consistencia y accesibilidad.

## Tokens de Color (Semánticos)

ReleaseHub utiliza una paleta semántica basada en variables de CSS para soportar temas (claro/oscuro) de forma nativa.

- **Primary**: `bg-primary`, `text-primary`. Color principal de marca y acciones destacadas.
- **Muted**: `bg-muted`, `text-muted-foreground`. Utilizado para elementos secundarios, fondos de inputs y textos de menor jerarquía.
- **Accent**: `bg-accent`, `text-accent-foreground`. Utilizado para estados de hover y resaltado interactivo.
- **AI**: `text-ai`. Color distintivo para funcionalidades potenciadas por IA (púrpura/indigo).
- **Success**: `text-success`. Utilizado para estados positivos y finalizaciones exitosas.
- **Destructive**: `text-destructive`. Utilizado para acciones críticas o errores.

## Refinamiento de Componentes

### AISummaryCard
- Utiliza `bg-ai` para el fondo y `text-ai-foreground` para el texto.
- Los iconos deben estar contenidos en un div con `bg-white/10` y un anillo sutil (`ring-white/20`) para mejorar la resonancia visual.
- Botones de acción con `w-8 h-8` y `hover:bg-white/10`.

### RepoSearch
- Dropdown con `bg-popover` y sombras pronunciadas (`shadow-xl`).
- Acciones de fila (favoritos, external links) visibles en focus mediante `focus-within:opacity-100`.

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
- Uso de `bg-muted` para botones inactivos y `bg-primary` para el activo.
- Inputs con `border-input` y `bg-background`.

### DisplayInfo
- Abstracción para mostrar metadatos (commits, tags, autores) con iconos y colores semánticos.
- Soporta tooltips automáticos para contenido truncado o fechas.
