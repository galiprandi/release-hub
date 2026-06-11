# PR Draft: Security Hardening V2 & Type Robustness 🐜

## Scope
This PR implements advanced security hardening measures and eradicates remaining type entropy to ensure a robust and inexpugnable system.

### Security Hardening (SSRF & DNS Rebinding)
- **DNS Rebinding Protection**: Refactoring `healthProxyHandler` in `vite.config.ts` to implement pre-resolution of hostnames. By validating the resolved IP against internal ranges and using the IP for the request while pinning the `Host` header, we neutralize DNS Rebinding attacks.
- **SSRF Filter Refinement**: Consolidating the `isInternal` logic to cover all edge cases (IPv4-mapped IPv6, CGNAT, Link-Local).
- **Expanded Security Tests**: Adding specific test cases for DNS Rebinding scenarios in `src/api/security.test.ts`.

### Type Hygiene & AAA Standard
- **AIChatModal Alignment**: Synchronizing `AIChatModal.tsx` and its tests with the latest `@galiprandi/react-tools` `useAIPrompt` interface (`progress`, `contextUsage`).
- **QueryModal Hardening**: Eradicating implicit `any` and hardening state transition logic.
- **Zero-Warning Build**: Ensuring the entire codebase compiles without warnings, maintaining AAA hygiene standards.

## Impact
- Immunity to DNS Rebinding attacks on the health proxy.
- Improved technical resonance and maintainability through strict typing.
- Full compliance with `DESIGN.md` and `AGENTS.md` protocols.

---
*Status: In Progress (Phase 0: Territory Block)*
