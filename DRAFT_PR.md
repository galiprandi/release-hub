# PR Draft: Refactor Hygiene and Entropy Cleanup

## Objetivo
Auditoría y limpieza quirúrgica del repositorio para eliminar entropía técnica, corregir errores de build y asegurar el cumplimiento de los estándares AAA de la organización.

## Cambios Propuestos
- [x] **Relocalización de Componentes**: Mover `ContainerList.tsx` de `componentes` a `components` para seguir la convención.
- [x] **Eliminación de Código Muerto**: Borrar `useJqSetup.ts` y `useGitTagsSimple.ts`.
- [ ] **Build Hygiene**: Corrección de advertencias en `src/routes/health/index.tsx`.
- [ ] **Linter & Type Hardening**: Resolver problemas de `any` y dependencias de hooks en `src/routes/github/index.tsx`.
- [ ] **Verificación**: Asegurar un build de cero advertencias y validar UI con Playwright.

## Verificación
- [ ] `npm run build` sin advertencias.
- [ ] `npm run lint` exitoso.
- [ ] Tests unitarios pasando.
- [ ] Screenshots de Docker y Health Dashboards.
