# ReleaseHub - Architecture and Development Guide

## POLÍTICA ESTRICTA DE ITERACIÓN

⚠️ **CRÍTICO**: Antes de cualquier cambio al sistema, DEBO seguir este proceso:

1. **Evaluar los docs relacionados**: Revisar todos los documentos en `docs/` que puedan afectarse por el cambio
2. **Evaluar el codebase**: Verificar que los docs están actualizados. Si no lo están, sugerir vehementemente actualizarlos antes de continuar
3. **Evaluar críticamente la propuesta**: Debe ser claro el beneficio o estar muy bien explicado por qué NO causa regresión. La idea es que el sistema EVOLUCIONE, no INVOLUCIONE
4. **Interrogar hasta alineación**: No asumir nada. Debo interrogar hasta estar 100% seguro de que estamos alineados en cada detalle y principalmente en el objetivo
5. **Solo una vez alineados**: Actualizar los docs involucrados o crear nuevos docs, luego implementar
6. **LOS DOCS SON LA FUENTE DE LA VERDAD**: Si hay conflicto entre docs y código, los docs tienen prioridad

## Documentación del Sistema

La documentación está organizada en tres categorías:

- **docs/adr/**: Architecture Decision Records para decisiones técnicas
- **docs/design/**: Decisiones de diseño y UX para componentes
- **docs/decisions/**: Decisiones estratégicas del sistema

Antes de cualquier cambio, revisar los docs relevantes para evaluar impacto y evitar regresiones.

## Stack Tecnológico

- **Framework**: React + Vite
- **Routing**: TanStack Router (file-based routing)
- **Data Fetching**: TanStack Query v5
- **UI Components**: shadcn/ui + TailwindCSS
- **Iconos**: Lucide React
- **APIs**:
  - CI/CD API: pipelines and deployment events
  - GitHub API: via GitHub CLI (`gh api`)
- **CLI Tools**:
  - GitHub CLI (`gh`): operaciones remotas en repositorios
  - Git: NO se usa para operaciones locales

## REGLAS CRÍTICAS DE DESARROLLO

### 1. Operaciones por Repositorio

⚠️ **IMPORTANT**: ReleaseHub works with multiple repositories simultaneously. Todas las operaciones deben cumplir estas reglas:

1. **Operaciones remotas únicamente**: TODAS las operaciones (crear tags, obtener commits, etc.) deben hacerse vía API de GitHub o GitHub CLI (`gh`). NUNCA usar comandos `git` locales que requieran estar en el directorio del repo.

2. **Especificar repo explícitamente**: Cada comando debe especificar explícitamente en qué repo se opera. Usar el formato `org/repo` en todos los comandos.

3. **No mezclar repos**: Nunca asumir que estamos en un directorio local específico. Cada operación debe ser aislada al repo actual.

### 2. Features No Disponibles

⚠️ **POLÍTICA DE VISIBILIDAD**: Para features que pueden no estar disponibles para todos los usuarios (ej: acceso a Kubernetes, resúmenes AI, etc.), seguir estas reglas:

1. **No mostrar placeholders durante verificación**: Mientras se verifica si el usuario tiene acceso a una feature, NO mostrar ningún placeholder o mensaje de carga. Renderizar `null` o nada.
2. **Solo mostrar si está disponible**: Solo mostrar la UI de la feature si se confirma que el usuario tiene acceso/disponibilidad.
3. **Ocultar completamente si no disponible**: Si el usuario no tiene acceso a la feature, no mostrar nada relacionado con ella (ni botones, ni opciones, ni mensajes de error).
4. **Aplicar a todas las features condicionales**: Esta política aplica a cualquier feature que dependa de:
   - Permisos del usuario (ej: acceso a clusters K8s)
   - Disponibilidad de servicios externos (ej: API de AI)
   - Configuración del sistema (ej: tokens de autenticación)
   - Capacidades del entorno (ej: herramientas CLI instaladas)

**Ejemplos**:
- K8sSection: No mostrar "Verificando acceso a Kubernetes..." mientras verifica. Solo mostrar la card si `access?.hasAccess` es true.
- CommitsModal: Solo mostrar botón de resumen AI si `availability === "available"`.
- LogsModal: Solo mostrar botón de resumen AI si `availability === "available"`.

### 3. Fortificación de Adapters CLI

Al trabajar con adaptadores CLI (Docker, Kubectl, GH):
1. **Priorizar JSON**: Usar flags `--format json` o similares para obtener datos estructurados y evitar fragilidad en el parsing manual.
2. **Sanitización Obligatoria**: Todas las funciones que acepten IDs o nombres externos deben pasar por un sanitizador para prevenir inyección de comandos.
3. **Manejo de Errores Silenciosos**: Capturar excepciones de `runCommand` y devolver estados neutros ([], null) para no romper la UI, asegurando el logueo del error para depuración.

### 4. Validación Antes de Implementar

⚠️ **MUY IMPORTANTE**: Antes de implementar o modificar cualquier función que use comandos externos (gh api, curl, git, kubectl, etc.), SIEMPRE:

1. **Validar el comando en terminal**: Ejecutar el comando exacto en la terminal para verificar que funciona.
2. **Analizar la respuesta**: Revisar el formato de salida (JSON, texto, errores) para entender exactamente qué devuelve.
3. **Implementar con conocimiento exacto**: Solo después de validar y analizar la respuesta, implementar la función basándose en el formato real.
4. **EXCEPCIÓN - Operaciones de escritura**: Si la operación modifica un repo (crear tags, commits, etc.), CONSULTAR AL USUARIO antes de ejecutarla en producción.

**Ejemplo - Comandos kubectl validados (feat/k8s)**:
- `kubectl version --client` - Verifica instalación
- `kubectl auth can-i get pods -n <namespace>` - Verifica permisos pods
- `kubectl auth can-i get deployments -n <namespace>` - Verifica permisos deployments
- `kubectl auth can-i get pods/logs -n <namespace>` - Verifica permisos logs
- `kubectl get deployments -n <namespace>` - Lista deployments
- `kubectl get pods -n <namespace>` - Lista pods
- `kubectl get deployment <name> -n <namespace> -o jsonpath='{.spec.selector.matchLabels}'` - Obtiene selector
- `kubectl logs -l <selector> -n <namespace> --tail=<n>` - Obtiene logs por label selector

### 5. Resumen de IA (AISummaryCard)

Para componentes potenciados por IA, usar el token semántico `--ai` y `--ai-foreground`. Las acciones dentro de estas cards deben usar `focus-visible:ring-white` para asegurar contraste sobre fondos saturados.

### 3. Tokens de Autenticación

⚠️ **CRÍTICO**: Usar el token correcto para cada API:

- **GitHub API**: Usar token de GitHub CLI (`gh auth token`)
  - Obtener dinámicamente: `gh auth token`
  - NUNCA usar token de Seki para GitHub
  - NUNCA usar tokens hardcodeados

- **Seki API**: Usar token JWT de Seki
  - Almacenado en localStorage como `seki_api_token`
  - Configurado vía UI por el usuario
  - NUNCA usar token de gh para Seki

### 4. Gestión de Permisos

Para verificar si un usuario puede crear tags, usar el objeto permissions de GitHub API (permissions.push, permissions.maintain, permissions.admin). Fallback a viewerPermission (legacy).

### 5. Gestión de Estado React Query

Después de operaciones de escritura (crear tag, etc.), invalidar queries relevantes y mantener estado local. No usar window.location.reload().

### 6. Organización de Tests

Los archivos de test unitarios deben ubicarse en el mismo directorio que el archivo que prueban, usando la extensión `.test.ts` o `.test.tsx`. Se debe evitar el uso de carpetas `__tests__` para nuevos módulos.

### 7. Consistencia UI y Tematización Semántica

⚠️ **CRÍTICO**: Para asegurar la consistencia visual y el soporte de temas (claro/oscuro), seguir estas reglas:

1. **Priorizar clases semánticas**: Usar tokens semánticos de Tailwind (ej: `text-muted-foreground`, `bg-muted`, `text-primary`, `border-input`) en lugar de colores hardcodeados (ej: `text-gray-600`, `bg-blue-500`). Se prohíbe el uso de colores hardcodeados en componentes de estado o feedback; utilizar exclusivamente tokens como `text-success`, `text-destructive`, `text-info` y `text-warning`.
2. **Anillos de Foco Estándar**: Todos los elementos interactivos deben usar el patrón: `focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1`.
3. **Componentes Compartidos**: Antes de crear un nuevo componente visual, verificar si puede ser una extensión de `FilterBar`, `PageHeader`, `BaseDialog` o `DisplayInfo`. Especialmente, todos los diálogos deben migrarse a `BaseDialog` para asegurar consistencia en transiciones y accesibilidad.
4. **Referencia de Diseño**: Consultar `DESIGN.md` para la lista completa de tokens y principios de accesibilidad.
5. **Feedback de Estado**: Utilizar el componente `StatusCard` para todos los estados de carga, error y advertencia en monitores de pipeline y gestión de Docker, asegurando una experiencia de feedback consistente y coherente.
6. **Docker UI Refinement**: Aplicar badges semánticos (`bg-success/20 text-success` para Running, `bg-muted text-muted-foreground` para Stopped), usar `StatusCard` para feedback de estado, y asegurar que todas las acciones usen anillos de enfoque estándar.

## Local Requirements

1. **Node.js** (v22+)
2. **Git** installed
3. **GitHub CLI** (`gh`) installed and authenticated
4. **Access** to your GitHub repositories

## Comandos Útiles

### Desarrollo
```bash
npm run dev          # Iniciar servidor de desarrollo
npm run build        # Build para producción
npm run preview      # Previsualizar build de producción
```

### GitHub CLI
```bash
gh auth status       # Verificar autenticación
gh auth token        # Obtener token actual
gh repo list <org>   # Listar repos de una org
gh api <endpoint>    # Hacer llamada a API de GitHub
```

## Referencias

- Documentación de decisiones: docs/
- [TanStack Router Docs](https://tanstack.com/router/latest)
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [GitHub CLI Docs](https://cli.github.com/manual/)
- [GitHub API Docs](https://docs.github.com/en/rest)
- [shadcn/ui](https://ui.shadcn.com/)

## Common Testing Patterns

### 1. Mocking Axios Instances
When testing modules that use a pre-configured axios instance (e.g., `apiSeki` in `seki.ts` or `apiExec` in `exec.ts`), export the instance and use `vi.spyOn(instance, 'post|get')` to mock responses. This ensures consistent testing without requiring a global axios mock.

## Discoveries

### Seki API URL Format Issue

**Problem**: `fetchPipelineWithTag` and `fetchPipeline` were using incorrect URL format for Seki API endpoints.

**Root Cause**: The functions were passing `product` as `org/repo` (e.g., `Cencosud-xlabs/yumi-ticket-control`) directly to the API endpoint, but the Seki API expects separate `organization` and `name` parameters.

**Details**:
- According to `docs/api-reference.md`, the correct endpoint format is `/products/:organization/:name/pipelines/:commit/:tag?`
- The functions were using `/products/${product}/pipelines/${commit}/${tag}` which resulted in invalid URLs
- This caused the API to return empty responses for production pipelines (with tags)

**Solution**: Split the `product` parameter into `org` and `name` using `product.split('/')` and use them separately in the URL construction.

**File Modified**: `src/api/seki.ts` (lines 94-98, 105-113)

**Note**: After fixing the URL format, the API still returns empty data for some tags (e.g., `v1.5.9`). This is expected behavior when the Seki backend doesn't have pipeline data for a specific tag. The frontend correctly handles this by showing "No se detectó un pipeline compatible".

### Debugging Techniques

**Playwright MCP**: Use for automated browser testing and inspection.
- Navigate to URLs: `mcp5_browser_navigate`
- Take snapshots: `mcp5_browser_snapshot`
- Click elements: `mcp5_browser_click`
- View console logs: `mcp5_browser_console_messages`
- Close browser: `mcp5_browser_close`

**curl**: Use for testing API endpoints directly.
- Test endpoints with authentication: `curl -H "Authorization: bearer <token>" <url>`
- Useful for verifying API responses independently of the frontend
- Note: Tokens from localStorage may expire, use fresh tokens for testing

## Hooks Personalizados

### useAIErrorProcessor

Hook para procesar errores técnicos con Chrome AI Summarizer API y convertirlos en mensajes amigables para usuarios no técnicos.

**Uso básico:**
```typescript
import { useAIErrorProcessor } from "@/hooks/useAIErrorProcessor"

const { processError, isAvailable } = useAIErrorProcessor()

// En un catch block
try {
  await someOperation()
} catch (err) {
  const errorObj = err instanceof Error ? err : new Error(String(err))
  const friendlyMessage = await processError(errorObj)
  setError(friendlyMessage)
}
```

**Opciones:**
- `enabled?: boolean` - Habilitar/deshabilitar el procesamiento (default: true)
- Solo procesa si AI está disponible
- Fallback al mensaje original si AI falla

**Estado devuelto:**
- `processError: (error: Error | string) => Promise<string>` - Función para procesar errores
- `isProcessing: boolean` - Si está procesando un error actualmente
- `processedError: string | null` - Último error procesado
- `isAvailable: boolean` - Si AI está disponible y el hook está habilitado

## Vista de Logs (LogsViewer)

El componente `LogsViewer` maneja visualización y filtrado de logs en tiempo real. Posee las siguientes características clave:

### 1. Búsqueda y Navegación de Coincidencias
* **No destructiva**: La búsqueda no oculta líneas para mantener el contexto completo. En su lugar, resalta las coincidencias del término buscado y permite navegar secuencialmente entre ellas.
* **Contador de coincidencia**: Muestra el indicador `actual/total` de coincidencias al realizar una búsqueda.
* **Botones de Navegación**: Usa los botones de flecha arriba/abajo (Chevron) al lado de la búsqueda para navegar por las coincidencias con scroll suave (`scrollIntoView` seguro para ambientes de testing).

### 2. Opciones de Barra de Herramientas (Compacta e Iconográfica)
Para maximizar el espacio útil en la barra de herramientas, se utilizan exclusivamente botones iconográficos para los siguientes toggles:
* **Resaltado Personalizado (Highlighter)**: Permite ingresar un término alternativo para resaltar en color morado de manera paralela a la búsqueda general.
* **Ajuste de Línea (Word Wrap)**: Ajusta el texto de los logs al ancho de la pantalla (`whitespace-pre-wrap`) o habilita scroll horizontal (`whitespace-pre`).
* **Numeración de Líneas (Line Numbers)**: Renderiza el número de línea respectivo en un gutter para facilitar la referenciación y debugging.
* **Expandir/Contraer Tamaño (Fullscreen)**: Disponible en modo modal. Permite alternar dinámicamente entre una vista de modal centrada con márgenes elegantes (`max-w-7xl`, `w-[90vw]`, `h-[90vh]`) para no pegarse a los bordes de la pantalla en laptops (como MacBooks), y una vista a pantalla completa (`w-screen`, `h-screen`, sin bordes redondeados) que maximiza el área de lectura de logs.

### 3. Explicación de Errores con IA (Local API)
* Las líneas que contienen patrones de error o advertencia (`ERROR`, `WARN`, `FATAL`, etc.) muestran un botón de chispa (`Sparkles`) al hacer hover.
* Al hacer clic, se realiza una consulta a la API de IA local (`useAISummarize`) y se muestra una explicación concisa del error directamente debajo de la línea del log sin interrumpir la lectura.


## Estados de Feedback (StatusCard)

El componente `StatusCard` es el estándar para mostrar estados globales de carga, error y advertencia.

1. **Tokens Semánticos**: NUNCA usar colores hardcoded. Usar `text-destructive`, `text-warning`, etc., con opacidades para fondos (ej: `bg-destructive/10`).
2. **Interactividad**: Los botones de reintento deben heredar el color semántico del estado para mantener la resonancia visual.
3. **Accesibilidad**: Todos los botones iconográficos (como el de cierre) deben incluir `aria-label` descriptivo y usar el anillo de enfoque estándar del sistema.
