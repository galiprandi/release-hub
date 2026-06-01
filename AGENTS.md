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
- **Industrial Resonance V2**: Uso de `tracking-tight` para nombres de elementos, `rounded-xl` para contenedores principales y `rounded-lg` para botones de acción.
- **Shell Hardening**: Todo comando CLI (gh, docker, kubectl, curl) debe usar `runCommand` con un array de argumentos (`string[]`). La firma de `runCommand` prohíbe estrictamente el uso de strings para evitar vulnerabilidades de inyección. Parámetros dinámicos deben ser elementos individuales del array. Para comandos complejos que requieren entrada de datos (JSON, etc.), usar el segundo parámetro `stdin` de `runCommand`. El backend está blindado para ejecutar comandos directamente sin shell; está estrictamente prohibido el uso de `exec`, `execAsync` o `spawn(..., { shell: true })` en cualquier handler de `vite.config.ts` o middleware.
- **Type Hygiene**: Prohibido el uso de `any`. Usar interfaces explícitas o `unknown` con validación de tipos/aserciones seguras. Las funciones de utilidad deben estar estrictamente tipadas.

### 10. Componente Table con Filtros Integrados

Ver `DESIGN.md` para especificaciones visuales completas (`Table`, `FilterBar`, `StatusCard`). Reglas de implementación:

- El componente `Table` (`src/components/ui/Table.tsx`) soporta filtrado integrado vía TanStack Table's column filtering API.
- Soporta modo no controlado (prop `filters`) y controlado (props `activeFilter` + `onFilterChange`).
- Filtros pueden incluir contadores dinámicos opcionales (`count`).
- **Rendimiento**: Memoizar `columns`, `filters`, `activeFilter` y callbacks (`useMemo`/`useCallback`).
- **Estilos de filtros**: Activo `bg-info/20 text-info shadow-sm`, Inactivo `bg-muted text-foreground hover:bg-muted/80`.

### 11. Salud de Servicios y Dashboard Resonance
- **Integración de Salud**: El Dashboard de GitHub (`src/routes/github/index.tsx`) integra la visibilidad de salud de los servicios mediante `HealthCell`. Esta integración consume `useHealthMonitor` para proporcionar un resumen visual (puntos semánticos) que enlaza directamente con el monitor de salud filtrado por errores.
- **Resonancia Industrial V2**: Todos los componentes de salud y búsqueda deben utilizar `ActionButton`, tokens semánticos y geometrías `rounded-xl` para mantener la consistencia del sistema de diseño.

### 12. Validación de Build Antes de Commits y PRs
- **Obligatorio antes de commit a main**: Ejecutar `node --run build` y verificar que no existan errores de compilación.
- **Obligatorio antes de crear PR**: Ejecutar `node --run build` y verificar que no existan errores de compilación.
- No proceder con commit o PR si el build falla.

### 12. Estado Compartible vía URL (TanStack Router Search Params)

**Objetivo**: Toda vista de la aplicación debe ser replicable y compartible exactamente a través de la URL. El estado visual (filtros, selecciones, modales abiertos) debe vivir en los search params, no en memoria local.

- **Search Param APIs**: Usar las APIs de search params de TanStack Router (schemas, validación, type-safety) para sincronizar estado entre UI y URL.
- **Modales desde URL**: Los modales/dialogs deben poder abrirse y configurarse via search params. Ejemplo: `/kubernetes?logs=argentina-arcus/task-notifier-dp&logOptions={lines:true,search:vendor,...}` debe abrir directamente el modal de logs del deploy con esas props aplicadas.
- **Serialización**: Para objetos complejos en search params, usar `JSON.stringify`/`JSON.parse` con schema validation de TanStack Router (`zod` o similar) para garantizar type-safety.
- **Shareability**: Cualquier usuario que acceda a la misma URL debe ver exactamente la misma vista, con los mismos filtros, selecciones y modales abiertos.
- **No state managers locales para estado compartible**: Evitar useState/useReducer para estado que deba persistir en la URL; delegar a TanStack Router's search param state management.

## Mantenimiento de Skills

Mantener `.windsurf/skills/` con flujos comunes, referencias de elementos y patrones nuevos para evitar snapshots repetitivos.
