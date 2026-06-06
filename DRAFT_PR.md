# 🐜 Vesper: Security Audit and Hardening

## Scope
- **Command Allow-list**: Implement a strict allow-list of authorized CLI tools in the backend middleware to minimize the attack surface.
- **CLI Hardening & Input Sanitization**: Robust sanitization of user-provided inputs (repos, git refs, PR numbers) used in `gh api` and other CLI calls to prevent argument injection.
- **Type Hygiene**: Eradicate `any` usage in critical dashboard cells and ensure strict typing in security-relevant modules.
- **Security Test Suite**: Introduced `src/lib/utils.test.ts` for sanitization logic and expanded `src/api/security.test.ts` for middleware protection.

## Modified Files
- `vite.config.ts`: Added `SAFE_COMMANDS` allow-list.
- `src/lib/utils.ts`: Added `sanitizeRepo` and `sanitizeGitRef`.
- `src/lib/utils.test.ts`: Tests for sanitizers.
- `src/api/security.test.ts`: Expanded security test suite.
- `src/hooks/useGitTags.ts`: Hardened CLI usage.
- `src/hooks/useOpenPullRequests.ts`: Hardened CLI usage.
- `src/hooks/usePrStatus.ts`: Hardened CLI usage.
- `src/hooks/useWebMCP.ts`: Hardened CLI usage and input validation.
- `src/routes/github/index.tsx`: Type hardening and CLI hardening.

## Verification Plan
- [ ] Build integrity check (`npm run build`).
- [ ] Security test suite execution (`npm run test:run -- src/api/security.test.ts src/lib/utils.test.ts`).
- [ ] Full regression test suite execution (`npm run test:run`).
- [ ] Visual verification of GitHub dashboard functionality.
