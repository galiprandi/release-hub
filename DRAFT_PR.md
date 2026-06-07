# PR Draft: 🐜 Carol - Health Monitor UI Resonance Refinement

## Descripción
Refactorización estética y funcional del Monitor de Salud para alinearlo con los estándares de **Industrial Resonance V2**. El objetivo es elevar la densidad de información, mejorar la jerarquía visual y asegurar la consistencia con el resto de la plataforma.

## Alcance
- **Refinamiento de Tipografía**: Aplicación de `tracking-tight` en nombres de productos y `text-[10px] font-bold uppercase tracking-wider` en metadatos técnicos.
- **Jerarquía Visual**: Uso de semantic tokens con 20% de opacidad para estados y badges.
- **Componentes de Tabla**:
    - Reemplazo de iconos de estado por "Health dots" semánticos.
    - Implementación de layout de doble línea para URLs (dominio/ruta).
    - Mejora de las celdas de tiempo de respuesta y última verificación.
- **Feedback de Sistema**: Integración del punto de revalidación animado en el header durante la verificación activa.
- **Higiene**: Eliminación de redundancias y optimización de layouts.

## Estado
- [x] Bloqueo de Territorio
- [x] Auditoría y Refactor UI
- [x] Verificación Visual (Playwright)
- [x] Documentación (DESIGN.md y AGENTS.md)
- [x] Ready for Review
