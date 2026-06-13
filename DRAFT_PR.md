# PR Draft: Security Hardening & Type Resilience V3 🐜

## Scope
This PR focuses on tightening the security posture of the application's local middleware and ensuring technical hygiene in core modules.

### Security Hardening
- **Restricted Command Allow-list**: Removed shells (`bash`, `sh`, `zsh`, `powershell.exe`) and `node` from the `/local/exec` allow-list to prevent arbitrary code execution.
- **Strict Input Validation**: Synchronized and tightened Kubernetes resource validation regexes (RFC 1123) across `vite.config.ts` and `src/config/terminalMiddleware.ts`, including strict length limits.

### Type Hygiene & Documentation cleanup
- **Entropy Reduction**: Cleaned up documentation and comments in `useUnifiedPipeline.ts` and `pulsarAdapter.test.ts` to improve technical clarity.
- **Zero-Warning Build**: Verified that the codebase maintains a zero-warning build environment, ensuring no implicit `any` or technical debt in the modified areas.

### Verification
- **Security Tests**: Added 26 test cases in `src/api/security.test.ts` verifying the new restrictions and RFC 1123 compliance.
- **Build Integrity**: Final verification successful via `npm run build`.

## Bitacora (CROMA.md)
- [x] Phase 0: Territory Block.
- [ ] Phase 1: Dead code elimination.
- [ ] Phase 2: usePipelineWithHealth refactoring.
- [ ] Phase 3: Type hardening.
- [ ] Phase 4: Final verification.
