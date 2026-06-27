# Draft PR: Terminal & GitHub UX Evolution - Uma 🐜

## Descripción
Esta misión se centra en la evolución de la interfaz de la Terminal y la mejora de la experiencia de usuario (UX) en el dashboard de GitHub. Se busca alinear la Terminal con el estándar Industrial Resonance V2 y optimizar la visualización de repositorios mediante la implementación de grupos colapsables.

## Objetivos
- [ ] **Terminal V2**: Refactorizar la interfaz de la terminal para cumplir con la tipografía de alta densidad V2 y mejorar los metadatos técnicos mostrados.
- [ ] **Modal Unification**: Unificar el header del modal de Terminal con la vista principal de la ruta `/terminal`.
- [ ] **GitHub UX**: Implementar contenedores colapsables por organización en el dashboard de GitHub para reducir el ruido visual.
- [ ] **Bulk Actions**: Añadir controles globales para expandir/colapsar todas las organizaciones.
- [ ] **Technical Hygiene**: Mantener un build de cero advertencias, sin `any` y sin `console.log`.
- [ ] **Documentation**: Actualizar `DESIGN.md`, `AGENTS.md` y `CROMA.md`.

## Zona de Trabajo
- `src/routes/terminal.tsx`
- `src/layouts/PageLayout.tsx`
- `src/routes/github/index.tsx`
- `AGENTS.md`
- `DESIGN.md`
