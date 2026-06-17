# ReleaseHub - System Prompt

> System prompt para agentes autónomos. Solo prohibiciones duras y enrutamiento. Para detalles, seguir referencias.

## Aprendizaje de Build

- Build exitoso ejecutando `npm install` primero, luego `npm run build`
- El proyecto usa TypeScript + Vite (rolldown-vite@7.2.5)
- Build genera archivos en `dist/` con chunks optimizados
- Chunk principal grande (1.5MB) - considerar code-splitting futuro
- No hay errores de TypeScript ni warnings críticos

## Aprendizaje de Mejoras Implementadas

### Mejora #6: Reemplazar confirm() nativo con Dialog del sistema
- Se creó componente `DeleteConfirmDialog` usando Radix UI y `BaseDialog`
- Se integró en `FetcherPage` reemplazando el `confirm()` nativo
- El componente usa los tokens visuales del sistema (bg-destructive, text-destructive-foreground)
- Muestra el preview del cURL a eliminar en el mensaje de confirmación
- Build exitoso sin errores TypeScript
- Patrón: usar `BaseDialog` para diálogos de confirmación consistentes con el diseño del sistema

### Mejora #6.1: Crear componente ConfirmDialog genérico y reutilizable
- Se creó `ConfirmDialog` genérico con 4 variantes: default, destructive, warning, success
- Soporta configuración completa de botones, loading, iconos personalizados
- Documentación exhaustiva con ejemplos de uso en JSDoc
- `DeleteConfirmDialog` ahora es un wrapper simple de `ConfirmDialog`
- Reducción de código: de 76 líneas a 60 líneas en DeleteConfirmDialog
- Patrón: usar componentes genéricos bien documentados para diálogos consistentes

#### Ejemplos de uso de ConfirmDialog:

**1. Diálogo destructivo básico:**
```tsx
<ConfirmDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  onConfirm={handleDelete}
  title="Eliminar elemento"
  description="¿Estás seguro de que quieres eliminar este elemento?"
  variant="destructive"
/>
```

**2. Con acciones personalizadas:**
```tsx
<ConfirmDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  onConfirm={handleAction}
  title="Confirmar acción"
  description="Esta acción no se puede deshacer"
  variant="warning"
  actions={{
    confirmText: "Sí, continuar",
    cancelText: "No, cancelar"
  }}
/>
```

**3. Con contenido personalizado y loading:**
```tsx
<ConfirmDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  onConfirm={async () => {
    await someAsyncOperation();
  }}
  title="Procesando"
  description="Esto puede tomar unos segundos"
  isLoading={isProcessing}
>
  <div className="mt-4 p-4 bg-muted rounded">
    <p>Información adicional</p>
  </div>
</ConfirmDialog>
```

**4. Con icono personalizado:**
```tsx
<ConfirmDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  onConfirm={handleConfirm}
  title="Custom Icon"
  customIcon={<CustomIcon className="w-5 h-5" />}
  description="Mensaje con icono personalizado"
/>
```

## Limitaciones del Entorno

### Playwright E2E Tests
- Playwright no soporta navegadores en Ubuntu 26.04 (versión muy nueva)
- Error: "Playwright does not support chromium/firefox on ubuntu26.04-x64"
- Los tests E2E no pueden ejecutarse en este entorno actual
- Validación alternativa: build exitoso + revisión de código manual
- Para ejecutar tests E2E, se requiere un entorno con OS soportado por Playwright

## Prohibiciones (nunca violar)

| # | Regla | Referencia |
|---|---|---|
| 0 | Eliminar código muerto inmediatamente. No comentar. | — |
| 1 | Prohibido `useEffect` para sincronizar estados derivados. Usar `useRef` o handlers. | — |
| 2 | `runCommand` requiere `string[]`. Backend: `spawn` con `shell: false`. Prohibido `..`, `exec`. | `DESIGN.md` §Shell Hardening |
| 3 | GitHub: solo API/`gh`. Nunca `git` local. Formato `org/repo` explícito. | — |
| 4 | Build (`node --run build`) obligatorio antes de PR/commit. No proceder si falla. | — |
| 5 | Pipeline (Seki/Pulsar): **PROHIBIDO modificar** sin consentimiento explícito. | — |
| 6 | No `useQuery` crudo. Todo dato es un **Recurso** (ADR-001). | `ADR.md` |
| 7 | URL sync: todo estado visual vive en search params (TanStack Router). | `ADR.md` |
| 8 | Tests: `.test.ts[x]` junto al código. No `__tests__`. | — |

## Matriz de consulta

| Necesitás... | Andá a... |
|---|---|
| Arquitectura, Recursos, Cache strategy, Viewport, Write-Local-First | `ADR.md` |
| Tokens visuales, componentes, estados UI, Cache-First patterns | `DESIGN.md` |
| Bootstrap, stack, quick start | `README.md` |
| Reglas de negocio verificadas | `BEHAVIOR.md` |
| Flujos comunes, patrones, referencias de elementos | `.devin/skills/` |

## Referencias rápidas

- **Tokens**: Solo de `DESIGN.md`. Nunca hardcodeados (`text-zinc-500`, `bg-red-500`).
- **Health Monitor**: Status dots (`w-1.5 h-1.5`), semantic badges (/20 opacity), double-line URLs. Header-based filtering and sorting (IndustrialTabs), help ActionButton with technical dialog, and bg-muted/10 containers for ProductSections.
- **Foco**: `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1`.
- **Navigation**: Prefer `IndustrialTabs` over legacy `FilterBar` or `select` for sorting/filtering. State must be synced with search params.
- **Type Hygiene**: Prohibido `any`. Interfaces explícitas o `unknown` + validación. Casts de tipo en handlers deben usar `id as typeof stateVariable`. Mocks de test deben sincronizarse con firmas reales mediante casts de interfaces (`as ExecResponse`).
- **Dashboard Data**: Usar `useRepoDashboardDetails` para acceder a datos de repositorios en el dashboard de GitHub. Prohibido duplicar tipos de `RepoDetails` o realizar casts manuales en los componentes de celda.
- **Build Log**: Zero-warning build is mandatory. Outdated hook signatures in mocks/tests must be synchronized immediately.
- **Kubernetes**: Dashboard must sync 'tab' (favorites|projects) with search params. Use localized status labels (Saludable, Procesando, etc.).
- **Mutaciones**: Optimistic update + revalidación selectiva. Nunca `window.location.reload()`.
- **Resiliencia**: Si CLI falla (`kubectl`, `docker`), redirigir a `<module>/setup`.
- **Novedades**: Technical header with Newspaper icon. Content encapsulated in bg-muted/10 containers with rounded-xl and p-8 padding.
- **Docker UI**: Status filtering uses `IndustrialTabs` in the route, synced with `status` search parameter. Cell typography for technical metadata must use `text-[10px] font-bold uppercase tracking-wider`.
- **Fetcher UI**: Filtering and sorting must be implemented via dual `IndustrialTabs` in the route, persisting state in `method` and `sortBy` search parameters. `UrlCell` uses a double-line pattern: Muted Domain (`text-[10px] font-bold uppercase`) and Foreground Path (`text-sm medium`).
- **GitHub UI**: Collection navigation and management actions are in the `PageLayout` header. Dashboard-level filtering uses `IndustrialTabs` synced with `filter` search parameter. Technical metadata cels use high-density typography (`text-[10px] font-bold uppercase tracking-wider`).
- **Health Monitor V2**: Primary environment filtering (Production, Staging, Unhealthy) is moved to the PageLayout header using IndustrialTabs. Product sections use `bg-muted/10` containers with `rounded-xl` geometry and technical Box icons.
- **Novedades Page**: Implements a high-density technical header with the 'Newspaper' icon. Content is encapsulated in a 'bg-muted/10' container with 'border-border/40' and 'rounded-xl' geometry.
- **Estructura**: Los componentes de módulo viven siempre en `src/<modulo>/components/`. Prohibido usar `componentes/`.
- **Hardening**: Middleware `spawn` con `shell: false`. Allow-list estricto en `/local/exec` y `/local/script`. SSRF protection con DNS Rebinding protection (pre-resolución obligatoria) bloqueando 127.0.0.0/8, 169.254.0.0/16, CGNAT y IPv6 local. Proxy de salud requiere `servername` (SNI) al usar IPs resueltas.
- **Pipeline Standards**: Obligatorio usar `useUnifiedPipeline` (`src/pipeline-core`). Las interfaces de eventos (`PipelineEvent`) deben incluir `markdown` para extracción de rutas y detalles de error. El monitor de salud (`useHealthMonitor`) consume nativamente `PipelineEvent[]`, eliminando la necesidad de puentes de mapeo legacy. La nomenclatura de metadatos es estrictamente camelCase (`updatedAt`).
- **Hardening**: Middleware `spawn` con `shell: false`. Allow-list estricto en `/local/exec` (shells y node prohibidos) y `/local/script`. Validación estricta de recursos Kubernetes (RFC 1123) en todos los middlewares locales. SSRF protection con DNS Rebinding protection (pre-resolución obligatoria) bloqueando 127.0.0.0/8, 169.254.0.0/16, CGNAT y IPv6 local. Proxy de salud requiere `servername` (SNI) al usar IPs resueltas.
- **cURL Parser**: Hardened state-machine tokenizer in `src/utils/curlParser.ts` supporting compact flags (e.g., `-H'Value'`). URL normalization via `new URL().toString()` ensures consistent formatting. Verified via `src/utils/curlParser.test.ts`.
