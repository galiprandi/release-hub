# PR Draft: 🐜 Vesper - Security Hardening (Traversal & Validation)

## Scope of Refinements
This PR focuses on eliminating latent security vulnerabilities and improving the robustness of the system's execution layer.

### 1. Path Traversal Protection in `vite.config.ts`
- **Current State**: The `scriptHandler` accepts an `action` parameter which is used to construct a file path without sufficient validation.
- **Improvement**: Implementing strict alphanumeric sanitization for the `action` parameter to ensure it remains within the intended `./scripts/` directory and only executes valid script files.

### 2. Terminal Middleware Input Validation
- **Current State**: The `terminalMiddleware.ts` extracts `name`, `namespace`, `context`, and `container` parameters from URL search params and passes them directly to `pty.spawn` or `kubectl`.
- **Improvement**: Adding regex-based validation for all terminal-related parameters to prevent argument injection and ensure compliance with Kubernetes/Docker naming standards.

### 3. TypeScript Hygiene (Elimination of `any`)
- **Current State**: Some legacy `any` types remain in `useWebMCP.ts` and `src/routes/github/index.tsx`.
- **Improvement**: Replacing `any` with explicit interfaces or `unknown` to ensure type safety and align with the repository's hygiene standards.

### 4. Security Test Suite Expansion
- **Current State**: Existing security tests focus on `runCommand`.
- **Improvement**: Adding new test cases to `src/api/security.test.ts` that specifically target path traversal and terminal input validation.

## Status
- [x] Territory Blocked
- [ ] Path Traversal Protection
- [ ] Terminal Validation
- [ ] Type Hygiene
- [ ] Testing & Verification
