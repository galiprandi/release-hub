# Draft PR: Surgical Hygiene & Resonance V2 Architecture Realignment - Fiona 🐜

## Descripción
Esta misión se enfoca en la reestructuración arquitectónica del repositorio para cumplir con el estándar de localidad por módulo y la eliminación de entropía técnica residual. Se busca erradicar el código muerto, unificar la lógica de pipelines y asegurar un sistema de tipos resiliente (AAA).

## Objetivos
- [ ] **Architecture Realignment**: Relocalizar componentes de la raíz `src/components/` a directorios específicos de módulo (`src/ai/`, `src/admin/`) o compartidos (`src/components/shared/`, `src/components/ui/`).
- [ ] **Legacy Hook Erradication**: Evaluar y eliminar `usePipelineWithHealth.ts` en favor de `useUnifiedPipeline`.
- [ ] **Technical Hygiene**: Eliminación total de usos de `any` en el código de producción y tests.
- [ ] **Resonance V2 Alignment**: Auditoría de tipografía de alta densidad y estándares de focus ring en componentes administrativos.
- [ ] **Build Integrity**: Garantizar un log de build zero-warning y 100% de tests exitosos.
- [ ] **Documentation**: Actualizar `AGENTS.md`, `DESIGN.md` y `CROMA.md`.

## Zona de Trabajo
- `src/components/*` (Relocalización)
- `src/hooks/usePipelineWithHealth.ts` (Evaluación/Eliminación)
- `src/ai/components/` (Nuevo)
- `src/admin/components/` (Nuevo)
- `src/routes/github/index.tsx`
- `AGENTS.md`
- `DESIGN.md`
- `CROMA.md`
