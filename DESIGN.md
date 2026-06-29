# DESIGN.md - Estándares de Diseño Industrial Resonance V2

Este documento detalla los principios y tokens visuales que rigen la interfaz de ReleaseHub.

## Principios Fundamentales
1. **Alta Densidad Técnica**: Maximización de la información útil sin sacrificar la legabilidad.
2. **Jerarquía Semántica**: Uso de colores y opacidades para indicar estados y relevancia.
3. **Resonancia Visual**: Consistencia absoluta en componentes compartidos.
4. **Time to Value**: Reducción de fricción en flujos críticos.

## Tipografía e Interfaz (Font Standard)
- **Fuente Principal**: Inter (Variable).
- **Technical Metadata**: `text-[10px] font-bold uppercase tracking-wider`. Obligatorio para etiquetas, badges y micro-datos.
- **Interactive Labels**: `text-xs font-bold uppercase tracking-wider`.
- **Geometría**:
  - Contenedores Principales: `rounded-xl`.
  - Elementos Interactivos (Inputs, Buttons): `rounded-lg`.
  - Badges/Etiquetas: `rounded-md`.

## Componentes Compartidos (Shared)
- **EmptyState**: Layout centrado, icono en contenedor `bg-muted/20` circular, tipografía `tracking-[0.2em]` para etiquetas.
- **LoadingSpinner**: Tipografía de alta densidad para etiquetas de carga.
- **AISummaryCard**: Fondo `bg-ai/5`, borde `border-ai/20`, sombras semánticas. Botones de acción con opacidad variable.
- **ItemProjectSelectionDialog**: Selector unificado para repositorios y despliegues. Utiliza `rounded-xl` y badges de check semánticos.
- **ProjectSelector**: Trigger compacto con `bg-muted/40` y tipografía técnica.
- **StatusCard**: Estados de carga, error y offline.
- **ActionButton**: Iconográfico con tooltip y fondo al 20% en hover.
- **IndustrialTabs**: Selector unificado para modales, paneles y filtrado persistente.

## State Management & Search
- **URL-First**: Todo el estado de filtrado y búsqueda debe residir en URL search parameters.
- **Single Source of Truth**: Evitar duplicar estado de URL en `useState`. Los inputs deben estar controlados directamente por el router.

## Estructura de Localidad (AAA Standard)
- **Silos de Módulo**: Los componentes específicos viven en `src/<modulo>/components/`.
- **Global UI**: Componentes base de diseño viven en `src/components/ui/`.
- **Shared Logic**: Componentes con lógica de negocio compartida viven en `src/components/shared/`.
- **Prohibición**: No se permite la creación de nuevos componentes en la raíz de `src/components/`.

## Cache-First Patterns (ADR-001)
| Estado | Token |
|---|---|
| Revalidando | `bg-primary/10 text-primary/70`, icono `animate-spin` |
| Stale | `bg-warning/10 text-warning`, timestamp `text-muted-foreground/60` |
| Desactualizado | `bg-warning/10 text-warning` + icono `Clock` |

## Estándares por Módulo

### GitHub UI
- **Promoción de Header**: Navegación de colecciones y gestión de proyectos en el header de `PageLayout`.
- **Organization Grouping**: Repositorios agrupados por organización en contenedores colapsables (`bg-muted/10`, `rounded-xl`).
- **Filtrado Global**: Filtros (ej: 'Pendientes') sincronizados con search params.
- **Operaciones**: Patrón `hover-to-reveal` (`opacity-0 group-hover:opacity-100`) para reducir ruido visual.

### Kubernetes UI
- **Namespace Filtering**: Promovido al header mediante `IndustrialTabs`.
- **Grouping**: Favoritos agrupados por contexto (`Boxes`), Proyectos por ID (`Folder`).

### Docker UI
- **Status Filtering**: Promovido al header. Celdas de alta densidad con puntos semánticos pulsantes.

### Health Monitor
- **Double-line URLs**: Dominio (muted `text-[10px]`) y Path (foreground `font-mono text-xs`).
- **Navegación**: dual `IndustrialTabs` para ambiente y ordenamiento.
