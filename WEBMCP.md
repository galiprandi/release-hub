# Web Model Context Protocol (WebMCP)

Integración para exponer herramientas de ReleaseHub a modelos de IA.

## Herramientas Registradas
- **`search_repositories`**: Búsqueda global en GitHub.
- **`get_repo_details`**: Metadatos, commits y PRs.
- **`promote_to_production`**: Disparo de despliegues.

## Seguridad
- **Validation**: Type guards estrictos en `useWebMCP.ts`.
- **Auth**: Reutiliza la sesión activa del usuario (Seki/GH).
