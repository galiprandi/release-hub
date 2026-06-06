# ReleaseHub - Testing & Quality

## Unit Testing
- **Command**: `npm run test:run` (Vitest).
- **Target**: Lógica de adapters, utilidades y hooks.
- **Hygiene**: No se permiten regresiones; los tests deben vivir junto al código.

## Frontend Verification
- **Protocol**: Start dev server (`npm run dev`) + Playwright screenshots.
- **Verification Directory**: `verification/` (no comitear screenshots a menos que se solicite).

## Security Testing
- **File**: `src/api/security.test.ts`.
- **Scope**: Neutralización de inyecciones shell, metacaracteres y path traversal.
