# Draft PR: Diff Viewer Evolution & Resonance V2 Alignment - Carol 🐜

## Descripción
Esta misión tiene como objetivo elevar el Comparador Universal (Diff Viewer) al estándar Industrial Resonance V2. Se busca mejorar la consistencia visual, optimizar la jerarquía de información y aplicar los últimos estándares de diseño del ecosistema, incluyendo la relocalización de componentes compartidos para cumplir con la arquitectura de localidad por módulo.

## Objetivos
- [ ] **Architectural Alignment**: Relocalización de `EmptyState` a `src/components/shared/` siguiendo el estándar de componentes compartidos.
- [ ] **DiffPanel Refinement**: Integración de `CopyButton` compartido, actualización tipográfica a alta densidad y aplicación del Focus Ring Standard.
- [ ] **DiffViewer Evolution**: Integración de `EmptyState` V2, estandarización de badges de expiración y metadatos técnicos.
- [ ] **DiffControls Optimization**: Asegurar responsividad y consistencia de iconos en `IndustrialTabs`.
- [ ] **Technical Hygiene**: Zero-warning build, cumplimiento de indentación de 2 espacios y validación total de tests.
- [ ] **Documentation**: Actualización de `AGENTS.md` y `DESIGN.md`.

## Zona de Trabajo
- `src/components/EmptyState.tsx` -> `src/components/shared/EmptyState.tsx`
- `src/diff/components/DiffPanel.tsx`
- `src/diff/components/DiffViewer.tsx`
- `src/diff/components/DiffControls.tsx`
- `src/routes/diff.tsx`
- `AGENTS.md`
- `DESIGN.md`
