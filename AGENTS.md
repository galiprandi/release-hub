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
# ReleaseHub - Reglas de Desarrollo

## Política de Iteración

Antes de cualquier cambio:

1. Revisar docs relevantes en `docs/` y verificar que estén actualizados.
2. Evaluar que la propuesta EVOLUCIONE el sistema, no lo INVOLUCIONE.
3. No asumir nada; alinearse 100% en objetivo y detalles antes de implementar.
4. Los docs son la fuente de la verdad; si hay conflicto con el código, los docs ganan.

## Reglas Críticas

### 0. Higiene y Refactorización
- **Código muerto**: Eliminar inmediatamente (no comentar) cualquier componente/ruta/utilidad sin referencias activas.
- **Hooks hygiene**: Prohibido usar `useEffect` para sincronizar estados derivados o mutar el DOM. Usar `useRef` o event handlers. Prohibido acceder a `.current` de un Ref durante la fase de renderizado; encapsular lógica dependiente de Refs en `useCallback` o efectos para evitar inconsistencias en el renderizado de React. Para sincronizar estados de entrada con props (como en `QueryModal.tsx`), utilizar el patrón de verificación de valor previo durante el renderizado para evitar renders en cascada.
- **Tokens semánticos**: En componentes de estado/feedback, usar exclusivamente los tokens de `DESIGN.md`. Nunca colores hardcodeados como `text-zinc-500` o `bg-red-500`.

### 1. Operaciones por Repositorio
- **Solo remotas**: Todas las operaciones GitHub deben usar la API o `gh`. Nunca `git` local que requiera estar en el directorio del repo.
- **Especificar repo**: Cada comando debe usar formato `org/repo` explícitamente.
- **No mezclar repos**: Nunca asumir directorio local; cada operación es aislada.

### 2. Features Condicionales
- **No placeholders**: Mientras se verifica disponibilidad, renderizar `null`. Nunca "Verificando...".
- **Solo si disponible**: Mostrar UI de la feature solo si se confirma acceso/disponibilidad.
- **Redirección a setup**: Si no hay acceso a un módulo (CLI no instalado), redirigir a `<module>/setup` con instrucciones de instalación. Ejemplo: `/docker/setup`, `/kubernetes/setup`, `/github/setup`, `/fetcher/setup`.
- **Resiliencia**: Otros módulos deben seguir funcionando si uno no tiene sus dependencias instaladas.

### 3. Adapters CLI
- **Priorizar JSON**: Usar `--format json` para datos estructurados.
- **Sanitización obligatoria**: Todo ID/nombre externo debe pasar por sanitizador.
- **Errores silenciosos**: Capturar excepciones de `runCommand` y devolver estados neutros ([], null), logueando el error.

### 4. Validación Antes de Implementar
- Validar todo comando externo (`gh api`, `curl`, `kubectl`, etc.) en terminal antes de implementar.
- Analizar formato de salida (JSON/texto/errores).
- **Operaciones de escritura** (tags, commits): consultar al usuario antes de ejecutar en producción.

### 5. Tokens de Autenticación
- **GitHub API**: `gh auth token` dinámicamente. Nunca token Seki ni hardcodeados.
- **Seki API**: `seki_api_token` desde localStorage. Nunca token de `gh`.

### 6. Permisos GitHub
Verificar `permissions.push`, `.maintain`, `.admin` para crear tags. Fallback a `viewerPermission`.

### 7. React Query
Después de escrituras, invalidar queries relevantes. Nunca `window.location.reload()`.

### 8. Tests
Ubicar archivos `.test.ts[x]` junto al archivo que prueban. Evitar carpetas `__tests__`.

### 9. UI y Tematización

Ver `DESIGN.md` para tokens, patrones visuales y especificaciones de componentes compartidos. Reglas críticas de desarrollo:

- **Anillos de foco**: `focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1`.
- **Componentes compartidos**: Antes de crear uno nuevo, verificar si extiende `FilterBar`, `PageHeader`, `BaseDialog` o `DisplayInfo`. Todos los diálogos migrar a `BaseDialog`.
- **Feedback**: Usar `StatusCard` para estados de carga, error y advertencia en monitores y Docker.
- **Docker badges**: `bg-success/20 text-success` (Running), `bg-muted text-muted-foreground` (Stopped).
- **Fetcher & HTTP Method Mapping**: Siempre usar opacidades semánticas (`/20`) para badges de métodos HTTP y tiempos de respuesta. GET -> success, POST -> info, PUT/PATCH -> warning, DELETE -> destructive.
- **Fetcher Magic Clipboard**: El módulo Fetcher detecta automáticamente comandos cURL en el portapapeles al enfocar la ventana, abriendo el `QueryModal` para reducir la fricción.
- **FilterBar**: Utilizar `variant="tabs"` para navegación de colecciones en dashboards. El contenedor debe ser `bg-muted` con padding `p-1`. Incluir gestión de proyectos integrada (Crear/Editar/Eliminar) en los dashboards para reducir la fricción en la organización de repositorios.
- **IndustrialTabs**: Usar el componente `IndustrialTabs` para todos los selectores de pestañas en modales y paneles secundarios para asegurar consistencia con el estándar Industrial Resonance V2.
- **Table Actionability**: Implementar filtros de valor en las tablas de los dashboards para permitir al usuario identificar rápidamente tareas críticas (ej: "Commits Pendientes" en el dashboard de GitHub). Para evitar dependencias circulares en el filtrado, los datos necesarios para los filtros deben pre-cargarse al nivel de la tabla (usando `useQueries`) en lugar de individualmente en cada celda. Los dashboards deben utilizar GraphQL para consolidar múltiples peticiones de metadatos (Commits, Tags, PRs) en un único round-trip.
- **Industrial Resonance V2**: Uso de `tracking-tight` para nombres de elementos, `rounded-xl` para contenedores principales y `rounded-lg` para botones de acción.
- **Shell Hardening & Input Validation**: Todo comando CLI (gh, docker, kubectl, curl) debe usar `runCommand` con un array de argumentos (`string[]`). Parámetros dinámicos deben validarse contra regex estrictos (K8s/Docker standards) tanto en el frontend como en los handlers de middleware del backend (`vite.config.ts`). Está prohibido el uso de `..` en parámetros de ruta. El backend está blindado para ejecutar comandos sin shell; está strictly prohibited el uso de `exec`, `execAsync` o `spawn(..., { shell: true })`.
- **SSRF Protection**: El handler `health-proxy` implementa una denegación estricta de solicitudes dirigidas a direcciones IP de loopback, redes privadas (RFC 1918), link-local y metadatos de nube para prevenir ataques de Server-Side Request Forgery.
- **Type Hygiene**: Prohibido el uso de `any`. Usar interfaces explícitas o `unknown` con validación de tipos/aserciones seguras. Las funciones de utilidad deben estar estrictamente tipadas. Los componentes que consumen datos de `useQueries` deben definir interfaces precisas (ej: `RepoDetails`, `Commit`, `Tag`) para evitar el ruido técnico de casts inseguros.
- **AAA Standard Hygiene**: Está prohibido dejar código muerto (utilidades o componentes sin uso). Todo componente interactivo debe incluir atributos de accesibilidad (`aria-label`, `aria-pressed`) y seguir el patrón de sincronización durante el renderizado para evitar renders en cascada en `useEffect`. La eliminación de entropía técnica incluye la limpieza de importaciones huérfanas detectadas en el proceso de build.
- **WebMCP Type Safety**: Las herramientas registradas en `useWebMCP.ts` deben validar estrictamente sus entradas mediante type guards antes de su ejecución para garantizar integridad en la comunicación con el modelo.

### 10. Componente Table con Filtros Integrados

Ver `DESIGN.md` para especificaciones visuales completas (`Table`, `FilterBar`, `StatusCard`). Reglas de implementación:

- El componente `Table` (`src/components/ui/Table.tsx`) soporta filtrado integrado vía TanStack Table's column filtering API.
- Soporta modo no controlado (prop `filters`) y controlado (props `activeFilter` + `onFilterChange`).
- Filtros pueden incluir contadores dinámicos opcionales (`count`).
- **Rendimiento**: Memoizar `columns`, `filters`, `activeFilter` y callbacks (`useMemo`/`useCallback`).
- **Estilos de filtros**: Activo `bg-info/20 text-info shadow-sm`, Inactivo `bg-muted text-foreground hover:bg-muted/80`.

### 11. Salud de Servicios y Dashboard Resonance
- **Integración de Salud**: El Dashboard de GitHub (`src/routes/github/index.tsx`) integra la visibilidad de salud de los servicios mediante `HealthCell`. Esta integración consume `useHealthMonitor` para proporcionar un resumen visual (puntos semánticos) que enlaza directamente con el monitor de salud filtrado por errores. Los indicadores de salud deben utilizar opacidades semánticas del 20% y bordes sólidos para una mejor resonancia visual.
- **Resonancia Industrial V2**: Todos los componentes de salud y búsqueda deben utilizar `ActionButton`, tokens semánticos y geometrías `rounded-xl` para mantener la consistencia del sistema de diseño. Los encabezados de tablas técnicas deben usar `text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60`. Las columnas de monitoreo técnico se denominan "Workflows" (para GitHub Actions) y "Operations" (para gestión de repositorio) para evitar colisiones semánticas.

### 12. Validación de Build Antes de Commits y PRs
- **Obligatorio antes de commit a main**: Ejecutar `node --run build` y verificar que no existan errores de compilación.
- **Obligatorio antes de crear PR**: Ejecutar `node --run build` y verificar que no existan errores de compilación.
- No proceder con commit o PR si el build falla.

### 13. Componentes de Pipeline (Seki, Pulsar)
- **PROHIBIDO modificar sin consentimiento explícito**: No se debe cambiar nada de los componentes de pipeline (Seki, Pulsar, o cualquier otro proveedor) sin el consentimiento explícito del usuario. Esto incluye pero no se limita a: adaptadores, tipos, componentes de UI de pipeline, lógica de detección, transformación de datos, y cualquier código relacionado con el sistema de pipeline unificado.

### 14. Estado Compartible vía URL (TanStack Router Search Params)

**Objetivo**: Toda vista de la aplicación debe ser replicable y compartible exactamente a través de la URL. El estado visual (filtros, selecciones, modales abiertos) debe vivir en los search params, no en memoria local.

- **Search Param APIs**: Usar las APIs de search params de TanStack Router (schemas, validación, type-safety) para sincronizar estado entre UI y URL.
- **Modales desde URL**: Los modales/dialogs deben poder abrirse y configurarse via search params. Ejemplo: `/kubernetes?logs=argentina-arcus/task-notifier-dp&logOptions={lines:true,search:vendor,...}` debe abrir directamente el modal de logs del deploy con esas props aplicadas.
- **Serialización**: Para objetos complejos en search params, usar `JSON.stringify`/`JSON.parse` con schema validation de TanStack Router (`zod` o similar) para garantizar type-safety.
- **Shareability**: Cualquier usuario que acceda a la misma URL debe ver exactamente la misma vista, con los mismos filtros, selecciones y modales abiertos.
- **No state managers locales para estado compartible**: Evitar useState/useReducer para estado que deba persistir en la URL; delegar a TanStack Router's search param state management.

## Mantenimiento de Skills

Mantener `.devin/skills/` con flujos comunes, referencias de elementos y patrones nuevos para evitar snapshots repetitivos.
