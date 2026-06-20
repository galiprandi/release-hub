# PR Draft: Security Hardening & SSRF Protection V8

**Agent**: Vesper 🐜
**Mission**: Harden SSRF protection and consolidate security utilities.

## Planned Changes
- [ ] **Harden SSRF Protection**: Enhance `isInternalAddress` in `src/utils/security.ts` to handle non-standard IP representations (decimal, hex) and prevent bypasses.
- [ ] **Consolidate Security Logic**: Audit `vite.config.ts` and `src/config/terminalMiddleware.ts` to ensure strict adherence to centralized security utilities.
- [ ] **Test Expansion**: Add test cases for advanced SSRF bypass techniques.
- [ ] **Documentation**: Update `AGENTS.md`, `DESIGN.md`, and `CROMA.md` with the new security standards.

## Targeted Files
- `src/utils/security.ts`
- `src/utils/security.test.ts`
- `vite.config.ts`
- `src/config/terminalMiddleware.ts`
- `AGENTS.md`
- `DESIGN.md`
- `CROMA.md`

## Verification Plan
- [ ] Reproduce and verify fix for decimal/hex IP SSRF bypasses.
- [ ] Zero-warning build and lint audit.
- [ ] Full test suite execution (Vitest).
