# Draft PR: Setup Unification & Resonance V2 Centralization - Uma 🐜

## Descripción
Esta misión tiene como objetivo la unificación y centralización de la lógica y componentes de configuración (setup) de los módulos Docker, Fetcher, GitHub y Kubernetes. Se busca eliminar la redundancia de código, mejorar la mantenibilidad y asegurar que todas las páginas de configuración cumplan estrictamente con el estándar Industrial Resonance V2.

## Objetivos
- [ ] **Logic Centralization**: Crear utilidades compartidas para la detección de OS y tipos comunes.
- [ ] **Component Unification**: Desarrollar `SetupCard` y `CopyButton` como componentes compartidos de alta densidad.
- [ ] **Route Refactoring**: Actualizar las rutas de setup de todos los módulos para consumir los componentes centralizados.
- [ ] **Resonance V2 Alignment**: Asegurar que toda la iconografía, tipografía y tokens semánticos sigan el estándar V2.
- [ ] **Technical Hygiene**: Mantener un build de cero advertencias y validar con tests unitarios y E2E.
- [ ] **Documentation**: Actualizar `AGENTS.md`, `DESIGN.md` y `CROMA.md`.

## Zona de Trabajo
- `src/utils/os.ts` (Nuevo)
- `src/components/shared/SetupCard.tsx` (Nuevo)
- `src/components/shared/CopyButton.tsx` (Nuevo)
- `src/routes/docker/setup.tsx`
- `src/routes/fetcher/setup.tsx`
- `src/routes/github/setup.tsx`
- `src/routes/kubernetes/setup.tsx`
- `AGENTS.md`
- `DESIGN.md`
- `CROMA.md`
