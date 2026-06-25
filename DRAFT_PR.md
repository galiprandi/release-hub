# Draft PR: Surgical Hygiene Audit V11 - Fiona 🐜

## Descripción
Esta misión se centra en la erradicación de la entropía técnica, el saneamiento de tipos y la reorganización arquitectónica de componentes para cumplir con los estándares AAA y la directriz de localidad de módulos.

## Objetivos
- [ ] **Type Hygiene**: Erradicación total de `any` en suites de tests (`security.test.ts`, `terminalMiddleware.test.ts`).
- [ ] **Component Locality**: Reubicación de componentes desde `src/components/` a sus respectivos módulos (`src/github/components/`, `src/diff/components/`).
- [ ] **Entropy Cleanup**: Identificación y remoción de componentes huérfanos en `src/components/`.
- [ ] **Build Integrity**: Mantener el estándar AAA de build y lint sin advertencias.
- [ ] **Test Resilience**: Verificación global de la suite de pruebas tras la reorganización.

## Zona de Trabajo
- `src/components/`
- `src/github/components/`
- `src/diff/components/`
- `src/api/security.test.ts`
- `src/utils/security.test.ts`
- `src/config/terminalMiddleware.test.ts`
- `src/routes/github/`
- `src/routes/diff.tsx`
- `AGENTS.md`
- `DESIGN.md`
- `CROMA.md`
