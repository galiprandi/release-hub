# Repo Dash - Arquitectura y Guía de Desarrollo

## Resumen

Repo Dash es una aplicación React que permite visualizar y gestionar pipelines de CI/CD y repositorios de GitHub. La arquitectura combina el uso de la API de Seki con operaciones remotas vía GitHub CLI, evitando operaciones locales de git.

## Stack Tecnológico

- **Framework**: React + Vite
- **Routing**: TanStack Router (file-based routing)
- **Data Fetching**: TanStack Query v5
- **UI Components**: shadcn/ui + TailwindCSS
- **Iconos**: Lucide React
- **APIs**:
  - Seki API: `https://seki-bff-api.cencosudx.com` (pipelines, eventos)
  - GitHub API: via GitHub CLI (`gh api`)
- **CLI Tools**:
  - GitHub CLI (`gh`): operaciones remotas en repositorios
  - Git: NO se usa para operaciones locales

## Estructura del Proyecto

```
src/
├── api/
│   ├── exec.ts          # Ejecución de comandos locales
│   ├── seki.ts          # Cliente de API de Seki
│   └── seki.type.ts     # Tipos de Seki
├── components/
│   ├── SekiMonitor/     # Monitor de pipelines
│   ├── ui/              # Componentes shadcn/ui
│   ├── CommitAuthor.tsx # Display de autor de commit
│   ├── CreateTagDialog.tsx # Diálogo para crear tags
│   ├── DeployPipelineCard.tsx
│   ├── DeployStatusCard.tsx
│   ├── DisplayInfo.tsx  # Componente genérico de display
│   ├── RepoSearch.tsx   # Búsqueda de repositorios
│   └── StageCommitsTable.tsx # Tabla de commits/tags
├── hooks/
│   ├── useCommit.ts
│   ├── useFavorites.ts
│   ├── useGitCommits.ts # Obtener commits via gh
│   ├── useGitTags.ts    # Obtener tags via gh
│   ├── usePipeline.ts
│   ├── useToken.ts      # Gestión de token Seki
│   └── useUserRepos.ts  # Obtener repos del usuario via gh
├── lib/
│   ├── dayjs.ts         # Configuración de dayjs
│   └── utils.ts         # Utilidades
├── routes/
│   ├── index.tsx        # Home/Dashboard
│   ├── product.$org.$product.tsx # Layout de producto
│   └── product.$org.$product.index.tsx # Vista detalle de commits/tags
└── services/
    └── api.ts           # Configuración de cliente API
```

## Componentes Principales

### 1. SekiMonitor
- **Propósito**: Visualizar estado de pipelines de CI/CD
- **Props**: `pipeline` (datos), `stage` (staging/production)
- **Características**:
  - Altura fija de 82px
  - Muestra commit hash, autor, timeline
  - Colores por stage (staging: azul, production: verde)
  - Muestra errores de sub-eventos

### 2. StageCommitsTable
- **Propósito**: Tabla de commits (staging) o tags (production)
- **Props**: `stage`, `org`, `product`, `limit`
- **Características**:
  - Bordes redondeados sin padding extra
  - Enlaces externos a GitHub en nueva pestaña
  - Commits: `https://github.com/{org}/{repo}/commit/{hash}`
  - Tags: `https://github.com/{org}/{repo}/releases/tag/{tag}`

### 3. CreateTagDialog
- **Propósito**: Crear tags en repositorios GitHub
- **Props**: `latestTag`, `repo`, `product`, `commit`, `canCreateTags`, `isLoadingPermissions`, `onSuccess`
- **Características**:
  - Usa GitHub CLI token (`gh auth token`) para autenticación
  - Verifica permisos antes de habilitar botón
  - Invalida queries después de crear tag
  - Mantiene pestaña activa después de creación

### 4. RepoSearch
- **Propósito**: Buscar repositorios del usuario
- **Características**:
  - Usa `useUserRepos` hook
  - Filtrado local de resultados
  - Cache de 5 minutos

## Hooks Principales

### useUserRepos
- **Propósito**: Obtener lista de repositorios del usuario
- **Uso**: `gh repo list` con JSON output
- **Campos**: `name`, `nameWithOwner`, `description`, `pushedAt`, `isPrivate`, `permissions`
- **Cache**: 5 minutos
- **Organizaciones**: Obtiene dinámicamente las organizaciones del usuario

### useRepoPermission
- **Propósito**: Verificar permisos de un repositorio específico
- **Uso**: `gh api repos/{repo} --jq '{permissions, viewerPermission, viewerCanAdminister}'`
- **Permisos de escritura**: `permissions.push`, `permissions.maintain`, `permissions.admin`
- **Cache**: React Query con staleTime

### useGitTags
- **Propósito**: Obtener tags de un repositorio
- **Uso**: `gh api repos/{repo}/tags` + detalles de cada tag
- **Características**:
  - Obtiene fecha del tagger (para tags anotados) o fecha del commit (fallback)
  - Ordena por fecha descendente
  - Limit configurable (default: 15)

### useGitCommits
- **Propósito**: Obtener commits de un repositorio
- **Uso**: `gh api repos/{repo}/commits`
- **Características**:
  - Paginación
  - Información de autor y fecha

### usePipeline / usePipelineWithTag
- **Propósito**: Obtener datos de pipelines de Seki
- **Uso**: API de Seki con token JWT
- **Tokens**: Token Seki almacenado en localStorage

### useToken
- **Propósito**: Gestión de token JWT de Seki
- **Características**:
  - Almacenamiento en localStorage
  - Verificación de expiración
  - Funciones `saveToken`, `clearToken`, `isExpired`, `needsToken`

## Routing (TanStack Router)

### Rutas Principales
- `/`: Dashboard con lista de repositorios favoritos
- `/product/$org/$product`: Layout de producto con breadcrumb
- `/product/$org/$product/`: Vista detalle con commits/tags y monitor Seki

### Breadcrumb
- Muestra navegación: Home → org/repo
- Nombre del repo es enlace externo a GitHub en nueva pestaña
- Ícono de estrella para favoritos

## REGLAS CRÍTICAS DE DESARROLLO

### 1. Operaciones por Repositorio

⚠️ **MUY IMPORTANTE**: Repo Dash trabaja con múltiples repositorios simultáneamente. Todas las operaciones deben cumplir estas reglas:

1. **Operaciones remotas únicamente**: TODAS las operaciones (crear tags, obtener commits, etc.) deben hacerse vía API de GitHub o GitHub CLI (`gh`). NUNCA usar comandos `git` locales que requieran estar en el directorio del repo (ej: `git tag`, `git push`, `git commit`).

2. **Especificar repo explícitamente**: Cada comando debe especificar explícitamente en qué repo se opera. Usar el formato `org/repo` en todos los comandos `gh api` o llamadas a la API de GitHub.

3. **No mezclar repos**: Nunca asumir que estamos en un directorio local específico. La aplicación puede estar visualizar cualquier repo del usuario, y cada operación debe ser aislada al repo actual.

4. **Ejemplos correctos**:
   - ✅ `gh api repos/org/repo/git/refs` - Especifica el repo
   - ✅ `axios.post('https://api.github.com/repos/org/repo/git/tags')` - API REST con repo explícito
   - ❌ `git tag v1.0.0` - Operación local, NO usar
   - ❌ `git push origin v1.0.0` - Operación local, NO usar

### 2. Validación Antes de Implementar

⚠️ **MUY IMPORTANTE**: Antes de implementar o modificar cualquier función que use comandos externos (gh api, curl, git, etc.), SIEMPRE:

1. **Validar el comando en terminal**: Ejecutar el comando exacto o curl en la terminal para verificar que funciona.
2. **Analizar la respuesta**: Revisar el formato de salida (JSON, texto, errores) para entender exactamente qué devuelve.
3. **Implementar con conocimiento exacto**: Solo después de validar y analizar la respuesta, implementar la función basándose en el formato real.
4. **EXCEPCIÓN - Operaciones de escritura**: Si la operación modifica un repo (crear tags, commits, etc.), CONSULTAR AL USUARIO antes de ejecutarla en producción.

**Ejemplo correcto**:
```bash
# 1. Validar en terminal
gh api repos/Cencosud-xlabs/yumi-ticket-control/git/refs/tags/v1.5.9
# Output: {"ref":"refs/tags/v1.5.9", "object": {...}}

# 2. Analizar la respuesta - es un objeto JSON con ref y object

# 3. Implementar basado en el formato real
const tagRef = await runCommand(`gh api repos/${repo}/git/refs/tags/${tagName}`)
const parsed = JSON.parse(tagRef.stdout)
```

**Ejemplo incorrecto**:
```javascript
// ❌ Implementar sin validar primero
const response = await gh.api('/repos/{repo}/git/tags')
// Asumir formato incorrecto, errores en producción
```

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

**Ejemplo correcto**:
```typescript
// Para GitHub API
const ghToken = await runCommand('gh auth token')
await axios.post(`https://api.github.com/repos/${repo}/git/tags`, data, {
  headers: { Authorization: `token ${ghToken}` }
})

// Para Seki API
const sekiToken = localStorage.getItem('seki_api_token')
await fetch('https://seki-bff-api.cencosudx.com/pipelines', {
  headers: { Authorization: `Bearer ${sekiToken}` }
})
```

### 4. Gestión de Permisos

Para verificar si un usuario puede crear tags:

- **Usar objeto `permissions` de GitHub API**:
  ```typescript
  const canCreateTags =
    repoPermission?.permissions?.push ||
    repoPermission?.permissions?.maintain ||
    repoPermission?.permissions?.admin
  ```

- **Fallback a `viewerPermission`** (legacy):
  ```typescript
  repoPermission?.viewerPermission === 'WRITE' ||
  repoPermission?.viewerPermission === 'ADMIN' ||
  repoPermission?.viewerCanAdminister
  ```

- **UI**: Mostrar botón deshabilitado mientras carga permisos, luego habilitar/deshabilitar según permisos

### 5. Gestión de Estado React Query

Después de operaciones de escritura (crear tag, etc.):

- **Invalidar queries relevantes**:
  ```typescript
  queryClient.invalidateQueries({ queryKey: ['git', 'tags', repo] })
  queryClient.invalidateQueries({ queryKey: ['repo', 'permission', repo] })
  ```

- **Mantener estado UI**: No usar `window.location.reload()`, usar invalidación de queries y mantener estado local (ej: pestaña activa)

## Cómo Iterar en el Proyecto

### Workflow de Desarrollo

1. **Requerimiento**: Entender qué se necesita cambiar/agregar
2. **Investigación**:
   - Revisar código existente relacionado
   - Identificar hooks/components afectados
   - Buscar patrones similares en el código
3. **Validación de Comandos**:
   - Si involucra comandos externos (gh, git), validar en terminal primero
   - Analizar formato de respuesta
   - Documentar el comando y respuesta esperada
4. **Implementación**:
   - Hacer cambios mínimos y enfocados
   - Seguir patrones existentes (hooks, componentes)
   - Mantener consistencia de estilo
5. **Testing**:
   - Verificar que la UI funciona correctamente
   - Validar que los comandos funcionan
   - Chequear edge cases (loading, errores, permisos)
6. **Documentación**: Actualizar AGENTS.md si se agregan nuevas reglas o patrones

### Patrones Comunes

#### Crear un nuevo hook
```typescript
import { useQuery } from "@tanstack/react-query";
import { runCommand } from "@/api/exec";

interface UseNewHookOptions {
  repo: string;
  enabled?: boolean;
}

export function useNewHook({ repo, enabled = true }: UseNewHookOptions) {
  return useQuery({
    queryKey: ['new-hook', repo],
    queryFn: async () => {
      // Validar comando primero en terminal
      const result = await runCommand(`gh api repos/${repo}/endpoint`);
      return JSON.parse(result.stdout);
    },
    enabled: enabled && !!repo,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}
```

#### Crear un nuevo componente
```typescript
interface NewComponentProps {
  data: any;
  onAction?: () => void;
}

export function NewComponent({ data, onAction }: NewComponentProps) {
  return (
    <div className="bg-card border rounded-lg p-4">
      {/* UI content */}
    </div>
  );
}
```

#### Agregar nueva ruta
1. Crear archivo en `src/routes/` siguiendo convención de TanStack Router
2. Usar `createFileRoute` con parámetros si es necesario
3. Agregar breadcrumb si es una vista de producto

## Requisitos Locales

Para desarrollo completo:
1. **Node.js** (v18+)
2. **Git** instalado
3. **GitHub CLI** (`gh`) instalado y autenticado:
   ```bash
   gh auth login
   ```
4. **Acceso** a repositorios GitHub de Cencosud

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

### Testing de Comandos
```bash
# Validar endpoint antes de implementar
gh api repos/org/repo/git/refs
gh api repos/org/repo/tags --paginate
gh api repos/org/repo/commits --jq '.[] | {sha: .sha, message: .message}'
```

## Troubleshooting Común

### Error: 401 Unauthorized en GitHub API
- **Causa**: Usando token incorrecto (Seki token en lugar de gh token)
- **Solución**: Usar `gh auth token` para obtener token de GitHub CLI

### Error: Permisos nulos
- **Causa**: Usando `viewerPermission` cuando debería usar `permissions`
- **Solución**: Usar `repoPermission?.permissions?.push` etc.

### Error: Comando git local falla
- **Causa**: Intentando usar comandos git locales
- **Solución**: Usar `gh api` para operaciones remotas

### Error: Fechas incorrectas en tags
- **Causa**: Usando fecha del commit en lugar de fecha del tagger
- **Solución**: Obtener fecha de `tagger.date` para tags anotados

## Referencias

- [TanStack Router Docs](https://tanstack.com/router/latest)
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [GitHub CLI Docs](https://cli.github.com/manual/)
- [GitHub API Docs](https://docs.github.com/en/rest)
- [shadcn/ui](https://ui.shadcn.com/)
