# PR Draft: Backend Security Hardening & Resonance

## Scope
This PR focuses on hardening the backend command execution layer to eliminate shell injection surfaces. Currently, the frontend joins command arguments into a string, which the backend then executes via `exec` (using a shell). This is inherently vulnerable.

### Key Changes:
- **Backend Protocol Shift**: Move from `command: string` to `args: string[]` in the `/local/exec` endpoint.
- **Shell-less Execution**: Refactor all backend handlers in `vite.config.ts` and `terminalMiddleware.ts` to use `spawn` or `execFile` without `shell: true`.
- **Frontend Alignment**: Update `runCommand` to send raw argument arrays.
- **Resonance V2**: Ensure all execution logs and errors follow Industrial Resonance V2 standards.

## Audit Findings
- `execHandler`: Uses `execAsync(command)` which spawns a shell.
- `scriptHandler`: Concatenates path and repo name, then uses `execAsync`.
- `k8sLogsStreamHandler`: Uses `exec` and `spawn(..., { shell: true })` with string templates.
- `portForwardHandler`: Uses `spawn(..., { shell: true })` with string templates.
- `resolveNameToPod`: Uses `execAsync` with string templates.

## Verification Plan
- [ ] Unit tests for all hardened handlers.
- [ ] Security audit via `src/api/security.test.ts`.
- [ ] Manual verification of K8s logs, Port Forwarding, and Terminal functionality.
