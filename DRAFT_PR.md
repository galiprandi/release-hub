# 🐜 Vesper: refactor(security) middleware hardening

## Scope of Work

Auditing and hardening the Vite middleware handlers to eliminate attack surfaces and implement SSRF protection.

### 🎯 Objectives

1.  **Vite Middleware Hardening (`vite.config.ts`)**:
    *   Implement strict validation for `k8sLogsStreamHandler`, `portForwardHandler`, and `portFreeHandler` parameters.
    *   Enforce RFC 1123 standards for Kubernetes resources and strict regex for Docker/Contexts.
2.  **SSRF Protection**:
    *   Harden `healthProxyHandler` to reject requests to internal, loopback, and metadata IP addresses/hostnames.
3.  **Security Testing**:
    *   Expand `src/api/security.test.ts` with new attack vectors (flag injection, SSRF) to verify the hardening.
4.  **Documentation**:
    *   Update `DESIGN.md`, `AGENTS.md`, and `CROMA.md` with the new security protocols.

## Territory Block

This PR blocks `vite.config.ts` and security-related API files for hardening.
