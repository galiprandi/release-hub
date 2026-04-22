# Repo Dash - Arquitectura

## Resumen

Repo Dash es una aplicación React que permite visualizar y gestionar pipelines de CI/CD y repositorios de GitHub. La arquitectura combina el uso de la API con comandos locales ejecutados en la máquina del usuario.

## Componentes Principales

### 1. API (Backend)

- **URL**: `https://seki-bff-api.cencosudx.com`
- **Uso**: Obtiene información de pipelines, eventos y estados de despliegue
- **Proxy**: Configurado en Vite para redirigir `/api` al backend

### 2. Comandos Locales (Git + GitHub CLI)

La aplicación puede ejecutar comandos locales en la máquina del usuario a través de un proxy Vite:

#### Git
- `git ls-remote`: Obtener tags y commits de repositorios remotos
- `git show`: Obtener detalles de commits específicos

#### GitHub CLI (`gh`)
- `gh repo list`: Listar repositorios de una organización
- `gh auth status`: Verificar autenticación

### 3. Endpoints Proxy (Vite Dev Server)

Ubicados en `vite.config.ts`:

- **`/api/repos/list`**: Lista todos los repos del usuario via `gh repo list`
  - Devuelve `[]` si `gh` no está configurado
  - Cache de 5 minutos en el frontend

- **`/api/repos/search`** (legacy): Búsqueda via GitHub API REST

- **`/api/git`**: Información de commits y tags via `git ls-remote`

- **`/api/exec`**: Ejecución genérica de comandos git (restringido)

## Flujo de Datos

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   React App     │────▶│   Vite Proxy     │────▶│   API           │
│                 │     │                  │     │                 │
│  - Dashboard    │     │  - /api/repos/*  │     │  - Pipelines    │
│  - RepoSearch   │     │  - /api/git      │     │  - Events       │
│  - Favorites    │     │  - /api/exec     │     │  - States       │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                              │
                              ▼
                        ┌──────────────────┐
                        │  Git / GitHub CLI │
                        │  (local user)     │
                        └──────────────────┘
```

## Seguridad

Los comandos locales están restringidos:
- Solo comandos que empiezan con `git ` están permitidos
- El proxy solo está activo en desarrollo (Vite dev server)
- `gh` requiere autenticación previa (`gh auth login`)

## Hooks Principales

- `useUserRepos()`: Lista de repos del usuario (via `gh`)
- `useGitRepoInfo()`: Commits y tags de un repo (via `git`)
- `useFavorites()`: Gestión de favoritos (localStorage)

## Requisitos Locales

Para funcionalidad completa:
1. Git instalado
2. GitHub CLI (`gh`) instalado y autenticado
3. Acceso SSH a repositorios GitHub
