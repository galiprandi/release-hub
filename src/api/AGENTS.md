# Discoveries

## ETag Caching Issue in Seki API

**Problem**: Seki API was not returning data despite having a valid token.

**Root Cause**: The ETag caching mechanism in `seki.ts` was causing the API to return 304 Not Modified responses without data.

**Details**:
- The axios request interceptor in `seki.ts` saved ETags from responses to localStorage
- On subsequent requests, it sent the `If-None-Match` header with the cached ETag
- The Seki API responded with 304 Not Modified (no body) when the ETag matched
- This prevented the application from receiving fresh data

**Solution**: Temporarily disabled ETag caching by commenting out the section that adds the `If-None-Match` header in the request interceptor.

**File Modified**: `src/api/seki.ts` (lines 61-69)

**Related Changes**:
- Fix case-sensitive comparison in `checkSekiAccess` for Seki detection
- Fix Vite server to return 200 with `success: false` instead of 500 for command errors
- Update `exec.ts` client to handle `success` field

## Incorrect Commit Hash for Tag-Based Pipeline Fetching

**Problem**: Seki API was not returning pipeline data for production tags, displaying "No hay datos de pipeline disponibles para el tag seleccionado" even though direct curl commands to the API returned data.

**Root Cause**: The UI was using the latest staging commit hash instead of the commit hash associated with the specific tag when fetching pipeline data for tags.

**Details**:
- In `src/routes/product.$org.$product.index.tsx`, the `tagsPipeline` hook was using `latestCommit?.hash` for the commit parameter
- This caused the API to be called with the wrong commit (e.g., `0d262bdaada827cbea02ec159ae2516940ec0c82`) instead of the commit associated with the tag (e.g., `800a026afdf07636b9b23aa3bae38f59f26e6a8d` for tag `v1.5.9`)
- The Seki API endpoint `/products/:org/:repo/pipelines/:commit/:tag` requires the correct commit hash associated with the tag to return pipeline data
- The `useGitTags` hook already provides the correct commit hash in the `commit` field of each tag object

**Solution**: Changed `src/routes/product.$org.$product.index.tsx` to use `latestTag?.commit` instead of `latestCommit?.hash` when in tags mode.

**Files Modified**:
- `src/routes/product.$org.$product.index.tsx` (line 51): Changed `commit: latestCommit?.hash` to `commit: latestTag?.commit`
- `src/routes/product.$org.$product.index.tsx` (line 53): Changed enabled condition to check `latestTag?.commit` instead of `latestCommit?.hash`

**Additional Changes** (ETag caching):
- `src/api/seki.ts` (lines 74-90): Commented out response interceptor that saves ETags to localStorage
- `src/api/seki.ts` (lines 48-50): Added Cache-Control, Pragma, and Expires headers to disable browser caching

**Verification**: After the fix, the Seki monitor correctly displays pipeline data for tags including commit message, author, and date.

## Production Routes Not Appearing in Health Monitor

**Problem**: Production routes were not appearing in the `/health` monitor even though the pipeline data contained deployment URLs for production environments.

**Root Cause**: The `detectEnvironment` function in `useHealthMonitor.ts` only recognized URLs as production if they contained specific patterns like `seki-prod` or `prod.`. However, actual production URLs like `https://yumi-ticket-control-bff-api.cencosudx.com` and `https://seki.cencosud.corp/yumi-ticket-control/api/reports` did not match these patterns, so they were incorrectly classified as staging by default.

**Details**:
- The `extractEndpointsFromEvents` function relied solely on URL pattern matching to determine the environment
- Production pipelines (tags) and staging pipelines (commits) both used the same URL extraction logic
- Without explicit environment information, production endpoints were misclassified as staging
- The health monitor would then show these endpoints under the wrong environment

**Solution**: Modified the environment detection to use context-based inference instead of relying solely on URL patterns:

1. **Modified `usePipelineWithHealth`** (`src/hooks/usePipelineWithHealth.ts`):
   - Added an optional `environment` parameter to `UsePipelineWithHealthOptions`
   - Implemented automatic environment inference: `tag` present = production, no `tag` = staging
   - Passed the inferred environment to `extractEndpointsFromEvents`

2. **Modified `extractEndpointsFromEvents`** (`src/hooks/useHealthMonitor.ts`):
   - Added an optional `environment` parameter
   - Uses the explicit environment if provided, otherwise falls back to `detectEnvironment(url)`

**Files Modified**:
- `src/hooks/usePipelineWithHealth.ts` (lines 5-15, 20-33, 42-47): Added environment inference and parameter passing
- `src/hooks/useHealthMonitor.ts` (lines 163-194): Added environment parameter to `extractEndpointsFromEvents`

**Verification**: After the fix, production endpoints from tag-based pipelines now appear correctly in the health monitor with `environment: production`. The endpoints are:
- `https://yumi-ticket-control-bff-api.cencosudx.com` (production)
- `https://seki.cencosud.corp/yumi-ticket-control/api/reports` (production)

**Note**: The health monitor automatically removes endpoints from products that are not in favorites. To see production endpoints, the product must be added to favorites first.

## Seki API Capabilities

Based on review of Seki BFF source code at `/Users/cenco/Github/seki/apps/bff/src/api`

### v1 Endpoints

#### Health (Public)
- `GET /health` - Health check endpoint
- `GET /ping` - Ping endpoint

#### Me (Authenticated)
- `GET /me` - Get user information
- `GET /me/organizations` - Get user organizations

#### Pipelines (Authenticated)
- `GET /products/:organization/:name/pipelines/:commit/:tag?` - Get pipeline by commit (and optional tag)
  - Returns `IPipeline | null`
  - Uses md5 hash of `commit|tag` as ID to query pipelinr service
  - With metadata and markdown enabled
- `GET /products/:organization/:name/pipelines` - List all pipelines with query params
  - Query params: `limit`, `offset`, `search`, `filters`, `sort`
  - Returns `ICollection<IPipeline>`
  - **Note**: Currently throws `PIPELINES_EXCEPTION` when querying

#### Repositories (Authenticated)
- `GET /repositories/:organization/:name/available` - Check if repository is available
- `POST /repositories/:organization/` - Create repository

#### Operations (Authenticated)
- `POST /operations/:organization/:environment/:product` - Execute operation in control plane
  - Body: `IOperation` with command_args
  - Product is automatically added to command_args

#### Secrets (Authenticated)
- `GET /secrets/:product/:environment?keys=` - Get secrets by product and environment
  - Optional `keys` query param to filter specific keys (comma-separated)
  - Organization resolved from user scopes
- `POST /secrets/:product/:environment/:key` - Set secret by product, environment, and key
  - Body: secret value
  - Metadata includes owner from user primarysid

### v2 Endpoints

#### Secrets (Authenticated)
- `GET /v2/secrets/:organization/:product/:environment?keys=` - Get secrets (organization explicit)
  - Organization is passed as parameter (lowercased)
  - Optional `keys` query param to filter specific keys
- `POST /v2/secrets/:organization/:product/:environment/:key` - Set secret (organization explicit)
  - Organization is passed as parameter (lowercased)
  - Body: secret value
  - Metadata includes owner from user primarysid

### Pipeline Data Structure

The pipeline data returned by Seki includes:
- `state`: IDLE, STARTED, SUCCESS, FAILED, WARN
- `events`: Array of pipeline events (VA, DR, BS, GD, BG, CI, TS, CD)
  - Each event has subevents with detailed step information
  - Events are sorted by order
- `git`: Git metadata (organization, product, commit, commit_message, commit_author, stage, event, ref)

### Known Issues

- `/products/:organization/:name/pipelines` endpoint throws `PIPELINES_EXCEPTION` when attempting to list pipelines
- This prevents using the list endpoint to verify if a product is compatible with Seki

## Seki Pipeline Architecture

**Created**: April 2025 · **Refactored**: June 2026 (latest-by-environment endpoint)

### Overview

Seki pipeline monitoring module, autónomo y agnóstico. Sin abstracción multi-provider.
Usa el endpoint `/pipelines/latest-by-environment` que devuelve staging + production
en una sola llamada, sin necesidad de conocer el commit o tag de antemano.

**Location**: `src/plugins/pipeline/seki/`

### API Endpoint

```
GET /products/:org/:repo/pipelines/latest-by-environment
```

Returns:
```json
{
  "staging": { "state": "...", "events": [...], "git": { "commit": "...", "event": "commit", ... } },
  "production": { "state": "...", "events": [...], "git": { "commit": "...", "ref": "v1.0.0", "event": "tag", ... } }
}
```

The `git.event` field determines `refType`: `'tag'` → TAG, anything else → COMMIT.

### Architecture Components

#### 1. Types (`src/plugins/pipeline/seki/types.ts`)
Seki-specific types:
- `SekiPipelineData` - Data structure for a single environment's pipeline
- `SekiPipelineEvent` - Event representation with markdown support
- `SekiPipelineState` - State machine (IDLE, STARTED, RUNNING, COMPLETED, FAILED, CANCELLED, SUCCESS, WARN)
- `MetaPart` - UI metadata part for card rendering

#### 2. Adapter (`src/plugins/pipeline/seki/adapter.ts`)
**sekiAdapter**:
- `hasToken()` - checks if Seki token exists
- `fetchByEnvironment(org, repo)` - fetches both staging + production pipelines
  in a single call, returns `SekiPipelinesByEnv | null`

#### 3. Hooks (`src/plugins/pipeline/seki/hooks/`)
**useSekiPipelinesByEnv** - Direct hook (no provider detection):
- Fetches both environments in one call
- If no token → no fetch, returns `data: null`
- Smart polling: 15s when any pipeline is active (STARTED/RUNNING)

**useHealthMonitor** - Health endpoint management:
- Extracts URLs from DEPLOY_* events markdown
- Detects environment (staging/production) from URL patterns or context
- Health checks with 5s timeout
- Persists endpoints in localStorage

**usePipelineWithHealth** - Combines pipeline fetching with health extraction:
- Uses `useSekiPipelinesByEnv` internally
- Extracts endpoints from both staging and production events
- No longer requires commit/tag parameters

#### 4. Components (`src/plugins/pipeline/seki/components/`)
**SekiPipelineMonitor** - Main component, renders both environments in parallel
  (staging card + production card). Silent total: renders null if no token,
  loading, error, or no data in either environment.
**SekiPipelineCard** - Card UI for pipeline status (used per environment)
**SekiTimeline** - Visual timeline for pipeline events

### Usage Example

```typescript
import { SekiPipelineMonitor } from '@/plugins/pipeline/seki/components'

function MyComponent() {
  return (
    <SekiPipelineMonitor
      org="my-org"
      repo="my-repo"
    />
  )
  // Renders staging + production cards in parallel.
  // Renders null if no token or no data in either environment.
}
```

### Testing

Vitest test suite:
- `npm test` - Run tests in watch mode
- `npm run test:run` - Run tests once

Test files (alongside source code):
- `src/plugins/pipeline/seki/types.test.ts`
- `src/plugins/pipeline/seki/adapter.test.ts`
- `src/plugins/pipeline/seki/utils.test.ts`
- `src/plugins/pipeline/seki/components/SekiPipelineCard.test.tsx`
- `src/plugins/pipeline/seki/components/SekiTimeline.test.tsx`

### Migration History

- **June 2026**: Migrated from per-ref fetching (`/pipelines/:commit` and
  `/pipelines/:commit/:tag`) to the unified `/pipelines/latest-by-environment`
  endpoint. Removed `ViewMode`, `fetchPipeline`, `fetchPipelineWithTag`, and
  `useSekiPipeline`. Both environments now fetched in a single call.
- **June 2026**: Separated Seki from the unified pipeline architecture
  (`src/pipeline-core/`). Pulsar/GitHub Actions adapter eliminated.

## Pulsar Build Monitor Architecture

**Created**: July 2026

### Overview

Pulsar es el sistema de despliegue que reemplaza a Seki. El monitor visualiza
el OK/error al crear imágenes Docker del workflow `pulsar-nx-build.yml`.
Coexiste con SekiPipelineMonitor: se autodetecta si el repo tiene el workflow.

**Location**: `src/plugins/pipeline/pulsar/`

### Detección

Un repo es "Pulsar" si tiene el workflow `.github/workflows/pulsar-nx-build.yml`.
Se detecta via `gh api repos/:org/:repo/actions/workflows` y se cachea con
`staleTime` de 5 min (los workflows cambian raramente).

### Ambiente

- **Tag push** (`v*.*.*` en `head_branch`) → **production**
- **Commit push** (`main`/`staging` en `head_branch`) → **staging**

### API Calls (via `gh api` + `runCommand`)

1. `GET /repos/:org/:repo/actions/workflows` — detectar Pulsar + obtener workflow ID
2. `GET /repos/:org/:repo/actions/workflows/:id/runs?per_page=10` — últimos runs
3. `GET /repos/:org/:repo/actions/runs/:runId/jobs` — jobs del run más reciente por ambiente

Solo se fetchean jobs del run más reciente por ambiente (no de todos los runs)
para minimizar API calls y rate limiting.

### Architecture Components

#### 1. Types (`src/plugins/pipeline/pulsar/types.ts`)
- `PulsarBuildState` - IDLE, RUNNING, COMPLETED, FAILED, CANCELLED, SKIPPED
- `PulsarImageJob` - Imagen Docker (app, appType, state, steps, errorStep)
- `PulsarBuildData` - Data de un run (ref, refType, environment, images, fallbackJob)
- `PulsarBuildsByEnv` - staging + production

#### 2. Adapter (`src/plugins/pipeline/pulsar/adapter.ts`)
**pulsarAdapter**:
- `isPulsarRepo(org, repo)` - verifica si tiene el workflow
- `getWorkflowId(org, repo)` - obtiene el ID del workflow
- `fetchLatestBuilds(org, repo)` - obtiene builds separados por ambiente
- `fetchJobs(org, repo, runId)` - obtiene jobs de un run

#### 3. Hook (`src/plugins/pipeline/pulsar/hooks/usePulsarBuilds.ts`)
- Query 1: detección de Pulsar (staleTime 5 min)
- Query 2: builds (solo si es Pulsar repo)
- Smart polling: 15s cuando hay runs `in_progress`

#### 4. Component (`src/plugins/pipeline/pulsar/components/PulsarBuildMonitor.tsx`)
- **PulsarBuildMonitor** - Componente productivo, silencioso total (null si no es Pulsar)
- **PulsarBuildMonitorData** - Variante para sandbox con data directa
- Image chips: verde=OK, rojo=FAILED, azul=building, gris=skipped
- Click en chip fallida → expande panel con steps + link a GitHub Actions
- Fallback: si todas las imágenes están skipped, muestra el job no-imagen fallido

### Usage

```typescript
import { PulsarBuildMonitor } from '@/plugins/pipeline/pulsar/components'

function MyComponent() {
  return (
    <PulsarBuildMonitor org="Cencosud-Cencommerce" repo="coe-utils-components" />
  )
  // Renders staging + production cards if repo uses Pulsar.
  // Renders null if repo doesn't have pulsar-nx-build.yml.
}
```

### Coexistence with Seki

En `/github/$org.$repo`, PulsarBuildMonitor se renderiza ARRIBA de SekiPipelineMonitor.
Como Pulsar renderiza null si el repo no tiene el workflow, Seki sigue apareciendo
para repos no-Pulsar. Para repos Pulsar, ambos monitores pueden mostrarse
(esperable durante la transición).

### Testing

- `src/plugins/pipeline/pulsar/types.test.ts`
- `src/plugins/pipeline/pulsar/adapter.test.ts`
- `src/plugins/pipeline/pulsar/utils.test.ts`

## Workflow Preferences

**Updated**: April 2026

### UI Development Workflow

When working on UI/frontend tasks, always use MCP (Playwright) to iterate, refine, and debug:

- Use Playwright MCP tools to verify visual changes in the browser
- Take browser snapshots to verify UI state after changes
- Iterate rapidly by verifying changes in real-time
- Use browser automation for visual debugging
- Verify each change visually before continuing

**IMPORTANT**: Do not open unnecessary browser tabs. Vite does hot reload automatically, so use the same existing browser tab and leverage hot reload instead of opening new tabs for each verification.
