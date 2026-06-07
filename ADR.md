# Architecture Decision Records

## ADR-001: Iceberg + Viewport Reactivity

**Status:** Accepted  
**Date:** 2026-06-07  
**Context:** ReleaseHub bloquea la UI con loaders mientras espera datos de red (CLI, API). La atención del usuario es más rápida que la red.

**Decision:** Arquitectura "Iceberg": la red es una corrección en background. Todo dato es un Recurso con tipo, clave y TTL. Render desde cache instantáneo; skeletons solo sin data previa.

### 1. Principios rectores

1. **La red no es requisito para renderizar.** La app corrige datos en background.
2. **El viewport es el scheduler.** Sin atención = 0 queries.
3. **Mutaciones son locales primero.** Write-Local-First.
4. **Todo recurso tiene TTL.** LS purga automáticamente.

### 2. Taxonomía de Recursos

Todo dato es un **Recurso**. No hay "queries"; hay suscripciones a vistas materializadas.

| Tipo | Definición | staleTime | gcTime | Persistir | TTL LS | Revalidación | Polling |
|---|---|---|---|---|---|---|---|
| **Identity** | Inmutable por clave primaria | `Infinity` | `Infinity` | Sí | **30 días** | Nunca | No |
| **Snapshot** | Estado puntual, cambia con tiempo | `0` | `Infinity` | Sí | **7 días** | Viewport | No |
| **Stream** | Proceso en evolución continua | `0` | `5 min` | Sí | **24 horas** | Viewport + polling mientras visible | Sí |

**Notas:** Identity TTL 30d purga commits/tags viejos. Snapshot sin cron global. Stream polling pausado fuera de viewport.

### 3. Modelo de capas

```
┌─────────────────────────────────────────┐
│  Capa de Presentación                   │
│  - Renderiza desde caché siempre        │
│  - Skeleton solo si caché vacío         │
│  - Diffs animados en updates            │
├─────────────────────────────────────────┤
│  Capa de Vista (Materializada)          │
│  - Identity: objeto inmutable por ID    │
│  - Snapshot: estado puntual de recurso  │
│  - Stream: proceso en evolución         │
│  - Todo vive en LS con TTL              │
├─────────────────────────────────────────┤
│  Capa de Reactividad (Viewport)         │
│  - Revalidación = atención del usuario  │
│  - Polling = atención + tipo Stream     │
│  - Sin atención = 0 queries             │
└─────────────────────────────────────────┘
```

### 4. Write-Local-First

Toda acción (tag, freeze, deploy):

1. Optimistic update en caché local.
2. Mutación a la red en background.
3. Éxito → revalidar Recurso. Error → rollback + toast.

### 5. Viewport Detection

**Primitiva:** `useViewportQuery` — `useQuery` + IntersectionObserver nativo.

- Entra viewport + stale → `refetch()` silencioso.
- Sale viewport → pausa polling (Streams).
- Tabs inactivos = fuera de viewport.

### 6. Desagregación de batch reads

GraphQL batch válido, pero resultado **debe desagregarse** en Recursos independientes.

```
GraphQL batch → [repoCommits, repoLatestTag, repoPRCount]

repoCommits   → Snapshot, TTL: 7d
repoLatestTag → Snapshot, TTL: 7d
repoPRCount   → Snapshot, TTL: 7d
```

Ningún monolito impone política única a datos de distinto tipo.

### 7. Eviction de LocalStorage

Borrar por antigüedad cuando LS ~5 MB:

1. **Stream** más antiguos.
2. **Snapshot** más antiguos.
3. **Identity** nunca antes de TTL (30 días).

### 8. Evolución en fases

| Fase | Objetivo |
|---|---|
| 1 — Materializar | Desarmar monolitos en Recursos independientes |
| 2 — Unificar consumo | Eliminar `enabled: false`. Celdas reciben Recursos por props |
| 3 — Mutaciones optimistas | Todas las escrituras: Write-Local-First |
| 4 — Polling inteligente | Solo Streams bajo viewport |

### 9. Consecuencias

| + | − |
|---|---|
| App instantánea | Datos viejos → stale indicators |
| Rate limits respetados | LS límite ~5-10 MB → posible IDB futuro |
| Persistencia entre sesiones | Complejidad: todo componente suscribe un Recurso |

### 10. Reglas para agentes autónomos

Declarar cada Recurso: recursos, tipo (`identity`/`snapshot`/`stream`), clave única, TTL, polling (solo `stream`), mutaciones.

**Prohibido:** `useQuery` crudo. Todo consumo pasa por hook de Recurso tipado.
