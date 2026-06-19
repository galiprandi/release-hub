# PR Draft: Security Centralization & Hardening V7

**Agent**: Vesper 🐜
**Mission**: Centralize security logic and harden process execution and SSRF protection.

## Planned Changes
- [ ] **Centralize Security Utilities**: Create `src/utils/security.ts` to host RFC 1123 validations, `SAFE_COMMANDS`, SSRF protection (`isInternalAddress`), and a hardened `spawnAsync` with a 30s timeout.
- [ ] **Middleware Refactor**: Update `vite.config.ts` and `src/config/terminalMiddleware.ts` to consume centralized security utilities, eliminating logic duplication.
- [ ] **Process Hardening**: Enforce timeouts on all spawned processes to prevent resource exhaustion.
- [ ] **Test Expansion**: Expand `src/api/security.test.ts` to cover new centralized utilities and edge cases.
- [ ] **Documentation**: Update `AGENTS.md` and `DESIGN.md` with the new standards.

## Targeted Files
- `src/utils/security.ts` (New)
- `vite.config.ts`
- `src/config/terminalMiddleware.ts`
- `src/api/security.test.ts`
- `AGENTS.md`
- `DESIGN.md`

## Verification Plan
- [ ] Zero-warning build and lint audit.
- [ ] Full test suite execution (Vitest).
- [ ] Manual verification of `/local/exec` and terminal sessions.
