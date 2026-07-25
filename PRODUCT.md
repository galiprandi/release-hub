# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Developers solo / indie que gestionan pipelines y releases de sus propios repos desde una única workstation local. Abren ReleaseHub tanto el día de release (preparación, triage, tag, promoción) como en el día a día (monitoreo de salud de servicios, deployments, estado de PRs y Actions entre orgs), en paralelo a kubectl/docker/gh en un entorno terminal-driven.

## Product Purpose

ReleaseHub existe para inspeccionar pipelines y gestionar releases sin clonar repositorios. El éxito significa que un developer obtiene visibilidad accionable del estado de releases, CI/CD y salud de servicios en segundos, desde una sola superficie, sin tocar disco ni saltar entre herramientas.

## Positioning

La posición de ReleaseHub es la combinación de tres mecanismos que ningún vecino (gh CLI, GitHub web UI, ArgoCD) ofrece truthfulmente juntos:

1. **Acceso API-only sin clones** — arquitectura cache-first que inspecciona releases sin tocar disco.
2. **Monitor CI/CD unificado** — una sola superficie para GitHub Actions, Seki, Kubernetes, Docker y health checks.
3. **Asistente AI local multimodal embebido** (WEBMCP) — asistencia ubicua en cada superficie.

Ninguna feature aislada es la diferenciación; las tres juntas lo son.

## Operating Context

- **Workflows de release-day**: preparación, triage de pipelines, tagging y promoción.
- **Dashboard de ops día a día**: monitoreo de salud de servicios, deployments, estado de PRs/Actions entre orgs.
- **Workstation dev local-first**: usado junto a kubectl/docker/gh en un entorno terminal-driven.
- **Stack**: TypeScript + Vite (rolldown-vite), TanStack Router, React. Build vía `npm install` luego `npm run build`.
- **Documentación viva en el repo**: `ADR.md`, `BEHAVIOR.md`, `DESIGN.md`, `AGENTS.md`, `WEBMCP.md`.

## Capabilities and Constraints

- **Cache-first**: la red es una corrección en background; la UI nunca bloquea por datos (ADR-001).
- **Sin clones**: solo API de GitHub. Prohibido `git` local (ver `AGENTS.md` §3).
- **Monitoreo unificado**: arquitectura única para todos los proveedores de CI/CD.
- **Salud omnipresente**: estado de servicios accesible desde el dashboard.
- **Asistencia AI ubicua**: asistente AI local multimodal (ver `WEBMCP.md`).
- **Hardening**: `spawn` con `shell: false`, timeout 30s, allow-list estricto, SSRF protection, XSS escaping obligatorio.
- **Seki Pipeline**: `src/plugins/pipeline/seki/` es inmutable sin consentimiento explícito. `/dev/seki-preview` es un sandbox permanente de iteración visual.
- **URL-first**: todo estado visual vive en search params (TanStack Router).
- **Recursos como single source of truth**: prohibido `useQuery` crudo (ADR-001).

## Brand Commitments

- El nombre **ReleaseHub** es vinculante.
- **Preferencia de canon (vinculante):** la estética debe sentarse junto a Linear (y Vercel) — dark-first, paleta neutral con un accent, Inter como face primaria, hairline borders, keyboard-first, denso pero ordenado. Ejecutar el canon a fidelity completa, sin irony ni quirk smuggleado. El sistema Industrial Resonance V2 previo queda reemplazado.

## Evidence on Hand

- **Sandbox Seki preview**: ruta `/dev/seki-preview` y archivos en `src/plugins/pipeline/seki/dev/` — sandbox permanente de iteración visual de pipelines Seki. Preservar.
- **Sin evidencia externa**: no existen testimonials, case studies, press, benchmarks ni assets externas. **No deben fabricarse en el futuro.**

## Product Principles

1. **Cache-first sobre todo**: la red es una corrección en background; la UI nunca bloquea por datos.
2. **Sin clones**: acceso API-only es no-negociable.
3. **Asistencia AI ubicua**: el asistente local multimodal vive en cada superficie.
4. **Salud omnipresente**: el estado de servicios es accesible desde el dashboard, no desde una ruta escondida.
5. **Monitoreo unificado**: una arquitectura única para todos los proveedores de CI/CD.

## Accessibility & Inclusion

Estándar general: ARIA explícito en icon buttons, foco visible (`focus:ring-primary/20`), contraste razonable, navegación por teclado. Sin requisito específico del producto más allá de buenas prácticas.
