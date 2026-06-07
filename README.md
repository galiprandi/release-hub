# 🚀 ReleaseHub

Cache-first operations platform. CI/CD, GitHub, K8s, Docker, Health — from the cache up. **100% local and secure**.

## Stack
- **Frontend**: React + TanStack Router + TanStack Query + Tailwind
- **Backend**: Vite middleware + hardened shell (`spawn`, `shell: false`)
- **Auth**: Dynamic `gh auth token`
- **Architecture**: Iceberg + Viewport Reactivity (ADR-001). Identity / Snapshot / Stream with LS persistence and TTL.

## Quick Start
```bash
curl -sSL https://raw.githubusercontent.com/galiprandi/release-hub/main/scripts/install.sh | bash
rhub
```

## Development
```bash
npm install
npm run dev
```

## Security
- Direct process execution. No `exec` or `shell: true`.
- No persistent secrets. Auth tokens read at runtime.
- SSRF protection: loopback, RFC 1918, cloud metadata blocked.
