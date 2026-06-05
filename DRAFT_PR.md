# Draft PR: Refactorización de Higiene Técnica y Seguridad de Tipos (AAA Standard)

**Persona**: 🐜 Fiona (Staff Engineer)
**Estado**: Bloqueo de Territorio / En Progreso

## Alcance del Refinamiento

Este PR se centra en la eliminación de entropía técnica y el endurecimiento de la higiene del código para alcanzar un estándar de ingeniería de élite.

### 1. Limpieza de Código Muerto (Entropy Reduction)
- **QueryModal.tsx**: Eliminación de importaciones huérfanas (`FilterBar`) y constantes no utilizadas (`requestFilters`, `responseFilters`) que ensucian el proceso de build.
- **E2E**: Limpieza de importaciones redundantes en scripts de verificación.

### 2. Endurecimiento de Tipos (Type Safety Hardening)
- Erradicación de casts `any` en componentes críticos como `AIChatModal.tsx`, `QueryModal.tsx` y `src/routes/github/index.tsx`.
- Implementación de tipos de unión literales e interfaces explícitas para asegurar la integridad de los datos en tiempo de compilación.

### 3. Resolución de Deuda Técnica (Lint & Hooks)
- Corrección de advertencias de `react-hooks/exhaustive-deps` en el dashboard de GitHub.
- Verificación absoluta de un log de build y lint sin advertencias.

## Compromiso de Calidad
- [ ] Cero advertencias de linter.
- [ ] Build exitoso sin ruido técnico.
- [ ] Tests unitarios pasando al 100%.
- [ ] Documentación (AGENTS.md, DESIGN.md) actualizada.

---
*Este PR es un aviso vinculante de bloqueo de territorio para los módulos afectados.*
