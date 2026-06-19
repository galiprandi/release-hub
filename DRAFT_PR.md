# DRAFT PR: Refactor Docker Resonance V2

## Overview
Refactorización integral del módulo Docker para alinearlo con el estándar **Industrial Resonance V2**. El objetivo es mejorar la densidad de información, promover filtros globales al header y estandarizar la estética técnica de las tablas y celdas.

## Cambios Propuestos
- **Header Promotion**: Migración de `IndustrialTabs` (Estado) al header de `PageLayout`.
- **Iconografía Técnica**: Integración del icono `Boxes` en el header y refinamiento de iconos en celdas.
- **Estandarización de Celdas**: Refactor de `StatusCell`, `StartedCell` y `PortsCell` con tipografía de alta densidad y tokens semánticos al 20%.
- **Empty State V2**: Evolución del estado vacío para seguir el patrón técnico de resonancia.
- **Higiene Técnica**: Garantizar zero-warning build y tipos estrictos.

## Impacto
- Mejora en el aprovechamiento del espacio vertical.
- Consistencia visual con los módulos de Kubernetes y GitHub.
- Reducción de fricción en la navegación y filtrado de contenedores.
