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
- **Hooks hygiene**: Prohibido usar `useEffect` para sincronizar estados derivados o mutar el DOM. Usar `useRef` o event handlers.
- **Tokens semánticos**: En componentes de estado/feedback, usar exclusivamente los tokens de `DESIGN.md`. Nunca colores hardcodeados como `text-zinc-500` o `bg-red-500`.

### 1. Operaciones por Repositorio
- **Solo remotas**: Todas las operaciones GitHub deben usar la API o `gh`. Nunca `git` local que requiera estar en el directorio del repo.
- **Especificar repo**: Cada comando debe usar formato `org/repo` explícitamente.
- **No mezclar repos**: Nunca asumir directorio local; cada operación es aislada.

### 2. Features Condicionales
- **No placeholders**: Mientras se verifica disponibilidad, renderizar `null`. Nunca "Verificando...".
- **Solo si disponible**: Mostrar UI de la feature solo si se confirma acceso/disponibilidad.
- **Ocultar completamente**: Si no hay acceso, no mostrar nada (ni botones ni mensajes).

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

### 6. Seguridad y Hardening
- **Escapado de Shell**: Todos los comandos dinámicos deben usar `quote()` de `@/utils/shell` para prevenir inyecciones.
- **Sanitización de K8s/Docker**: Mantener y usar validaciones estrictas de nombres de recursos antes de pasarlos a `runCommand`.
- **Parsing de cURL**: El parser debe ser robusto contra ReDoS y no procesar sustituciones de comandos.
- **Activación Condicional**: Aplicar estrictamente la Regla 2. Si un módulo (Docker/K8s) no está disponible, se debe ocultar su icono en `PageLayout` y su ruta debe renderizar `null` en lugar de mensajes de error o estados de carga.

### 7. Permisos GitHub
Verificar `permissions.push`, `.maintain`, `.admin` para crear tags. Fallback a `viewerPermission`.

### 7. React Query
Después de escrituras, invalidar queries relevantes. Nunca `window.location.reload()`.

### 8. Tests
Ubicar archivos `.test.ts[x]` junto al archivo que prueban. Evitar carpetas `__tests__`.

### 9. UI y Tematización
- **Anillos de foco**: `focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1`.
- **Componentes compartidos**: Antes de crear uno nuevo, verificar si extiende `FilterBar`, `PageHeader`, `BaseDialog` o `DisplayInfo`. Todos los diálogos migrar a `BaseDialog`.
- **Feedback**: Usar `StatusCard` para estados de carga, error y advertencia en monitores y Docker.
- **Docker badges**: `bg-success/20 text-success` (Running), `bg-muted text-muted-foreground` (Stopped).
- **Fetcher & HTTP Method Mapping**: Siempre usar opacidades semánticas (`/20`) para badges de métodos HTTP y tiempos de respuesta. GET -> success, POST -> info, PUT/PATCH -> warning, DELETE -> destructive.

## Mantenimiento de Skills

Mantener `.windsurf/skills/` con flujos comunes, referencias de elementos y patrones nuevos para evitar snapshots repetitivos.
