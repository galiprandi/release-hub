# Draft PR: Security Hardening V7 - Vesper 🐜

## Descripción
Esta misión se centra en elevar el umbral de seguridad y robustez del sistema mediante una auditoría profunda de superficies de ataque y la implementación de controles de validación más estrictos.

## Objetivos
- [ ] **Technical Hygiene & Type Resilience**: Erradicación total de `any` en los tests de seguridad, migrando a tipos estrictos o casts seguros (`ChildProcess`).
- [ ] **SSRF Protection Expansion**: Fortalecimiento de `isInternalAddress` contra bypasses avanzados (decimal/hex IPs) y expansión de la suite de pruebas.
- [ ] **Terminal Middleware Validation**: Creación de una suite de tests dedicada para `terminalMiddleware.ts` para garantizar la integridad de los parámetros de sesión.
- [ ] **Script Handler Hardening**: Refuerzo de la validación de repositorios en el middleware de ejecución de scripts para prevenir inyecciones colaterales.
- [ ] **Zero-warning Build**: Mantener el estándar AAA de build y lint sin advertencias.

## Zona de Trabajo
- `src/utils/security.ts`
- `src/utils/security.test.ts`
- `src/config/terminalMiddleware.ts`
- `src/config/terminalMiddleware.test.ts`
- `vite.config.ts`
- `AGENTS.md`
- `DESIGN.md`
- `CROMA.md`
