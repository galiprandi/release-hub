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

### 6. Permisos GitHub
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
- **Fetcher & HTTP Badges**: Usar tokens semánticos con opacidad para métodos (GET: success, POST: info, PUT/PATCH: warning, DELETE: destructive) y estados de respuesta. Evitar colores hardcodeados como `bg-green-100`.
- **Industrial Resonance**: Aplicar el patrón de tabla definido en `DESIGN.md` para todos los listados de recursos técnicos.

## Mantenimiento de Skills

Mantener `.windsurf/skills/` con flujos comunes, referencias de elementos y patrones nuevos para evitar snapshots repetitivos.
