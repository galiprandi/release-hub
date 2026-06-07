# PR Draft: Refactor Hygiene and Entropy Cleanup

## Objetivo
Auditoría y limpieza quirúrgica del repositorio para eliminar entropía técnica, corregir errores de build y asegurar el cumplimiento de los estándares AAA de la organización.

## Cambios Propuestos
- [ ] **Build Hygiene**: Corrección de advertencias y errores de TypeScript en `src/docker/componentes/ContainerList.tsx`.
- [ ] **Linter Hardening**: Resolver problemas de configuración de ESLint y dependencias faltantes.
- [ ] **Dead Code Elimination**: Identificación y eliminación de componentes huérfanos o lógica duplicada.
- [ ] **Type Hygiene**: Reducción del uso de `any` en favor de interfaces estrictas.
- [ ] **React Best Practices**: Refactorización de `useEffect` para sincronización de estado derivado según `AGENTS.md`.

## Verificación
- [ ] `npm run build` sin advertencias.
- [ ] `npm run lint` exitoso.
- [ ] Tests unitarios y de integración pasando.
- [ ] Capturas de pantalla de la UI afectada.
