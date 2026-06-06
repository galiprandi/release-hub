# ReleaseHub - Reglas Críticas

## Desarrollo
- **Higiene**: Eliminar código muerto. Prohibido `useEffect` para sincronizar estados; usar refs o handlers.
- **Tokens**: Solo tokens de `DESIGN.md`. Sin colores hardcodeados.
- **Solo Remoto**: Operaciones GitHub vía API o `gh`. Nunca `git` local.
- **Resiliencia**: Si un CLI (`kubectl`, `docker`) falla, redirigir a `<module>/setup`.
- **Seguridad**: `runCommand` requiere `string[]`. Backend usa `spawn` con `shell: false`. Prohibido `..` en rutas.
- **SSRF**: Bloqueo de loopback, RFC 1918 y metadatos en `health-proxy`.
- **Table Actionability**: Filtros de valor y carga de datos vía `useQueries` en el nivel de tabla.
- **Single Pane of Glass**: Dashboards con métricas operativas (PRs, Actions, Health) integradas.
- **URL Sync**: Todo estado visual (filtros, modales) debe vivir en search params (TanStack Router).

## Operaciones
- **Build**: `node --run build` obligatorio antes de PR/Commit.
- **Tests**: Archivos `.test.ts[x]` junto al código que prueban.
- **Pipeline**: PROHIBIDO modificar lógica de pipeline (Seki/Pulsar) sin consentimiento.
