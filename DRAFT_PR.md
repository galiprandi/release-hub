# Draft PR: Surgical Hygiene Audit V9 - Fiona 🐜

## Propósito
Continuar con la misión de saneamiento técnico del repositorio, eliminando código muerto y erradicando advertencias del linter para mantener el estándar AAA. Esta intervención se enfoca en la limpieza de tipos en tests y la eliminación de hooks obsoletos.

## Cambios Propuestos
- **Higiene de Tipos**: Erradicación del uso de `any` en `src/utils/security.test.ts` mediante el uso de casts seguros (`as unknown as childProcess.ChildProcess`).
- **Eliminación de Código Muerto**: Remoción del hook huérfano `src/hooks/useKubectlNamespaceAccess.ts`.
- **Documentación**: Actualización de `AGENTS.md` y `DESIGN.md` con los nuevos estándares de higiene y limpieza técnica.
- **Validación AAA**: Verificación de zero-warning build y lint audit exitoso.

## Estado
- [x] Phase 0: Territory Block & PR Audit
- [x] Higiene de tipos en `src/utils/security.test.ts`
- [x] Eliminación de `src/hooks/useKubectlNamespaceAccess.ts`
- [x] Registro de diseño y documentación
- [ ] Verificación de Build & Lint (Zero-warning)
