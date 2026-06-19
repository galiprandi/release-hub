# Draft PR: Technical Hygiene & Entropy Cleanup V8

## Propósito
Continuar con la misión de saneamiento técnico del repositorio, eliminando código muerto y erradicando advertencias del linter para mantener el estándar AAA.

## Cambios propuestos
- **Higiene Técnica**: Eliminación de uso de `any` en `src/utils/security.test.ts`.
- **Limpieza de Entropía**: Eliminación del hook huérfano `src/hooks/useKubectlNamespaceAccess.ts`.
- **Validación**: Verificación de zero-warning build y lint.

## Estado
- [x] Phase 0: Territory Block
- [ ] Higiene de tipos en tests
- [ ] Eliminación de código muerto
- [ ] Verificación de Build & Lint
- [ ] Actualización de Documentación
