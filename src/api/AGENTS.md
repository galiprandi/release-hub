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

## Unified Pipeline Architecture

**Created**: April 2025

### Overview

New unified pipeline monitoring architecture introduced to simplify and make the system more extensible:

**Location**: `src/pipeline-core/`

### Architecture Components

#### 1. Types (`src/pipeline-core/types.ts`)
Unified types that work with any pipeline provider:
- `PipelineData` - Common data structure for all pipelines
- `PipelineEvent` - Standardized event representation
- `PipelineState` - Unified state machine (IDLE, STARTED, RUNNING, COMPLETED, FAILED, CANCELLED)
- `PipelineProvider` - 'seki' | 'pulsar' | null
- `PipelineAdapter` - Interface for implementing new providers

#### 2. Adapters (`src/pipeline-core/adapters/`)
Adapter pattern for different pipeline providers:

**SekiAdapter** (`sekiAdapter.ts`):
- Transforms Seki API responses to unified format
- Supports token-based authentication
- Handles staging (commit) and production (tag) pipelines

**PulsarAdapter** (`pulsarAdapter.ts`):
- Transforms GitHub Actions workflow data
- Detects Nx Build workflow
- Fetches runs, jobs, and commit info

**Adding a new adapter**:
```typescript
export const myAdapter: PipelineAdapter = {
  name: 'my-provider',
  async supports(org: string, repo: string): Promise<boolean> {
    // Detect if this provider is available
  },
  async fetch(org: string, repo: string, stage: StageType, ref: string): Promise<PipelineData | null> {
    // Fetch and transform data
  }
}
```

#### 3. Hooks (`src/pipeline-core/hooks/`)
**useUnifiedPipeline** - Single hook for all providers:
- Automatically detects the appropriate provider
- Fetches pipeline data with smart polling
- Unified error handling

**usePipelineDetection** - Provider detection:
- Checks adapters in priority order (Pulsar > Seki)
- Caches results for 1 hour

#### 4. Components (`src/pipeline-core/components/`)
**UnifiedPipelineMonitor** - Displays pipeline from any provider
**PipelineCard** - Reusable card UI
**SimpleTimeline** - Visual timeline for pipeline events

### Usage Example

```typescript
import { useUnifiedPipeline } from '@/pipeline-core'

function MyComponent() {
  const { data, provider, isLoading, error } = useUnifiedPipeline({
    org: 'my-org',
    repo: 'my-repo',
    stage: 'staging',
    ref: 'abc1234',
  })
  
  // Works with any provider automatically!
}
```

### Testing

Added Vitest test suite:
- `npm test` - Run tests in watch mode
- `npm run test:run` - Run tests once
- `npm run coverage` - Generate coverage report

Test files:
- `src/pipeline-core/__tests__/types.test.ts`
- `src/pipeline-core/__tests__/adapters.test.ts`
- `src/pipeline-core/__tests__/PipelineCard.test.tsx`
- `src/pipeline-core/__tests__/SimpleTimeline.test.tsx`

### Migration from Old System

Old components (kept for backward compatibility):
- `PipelineMonitor` - Routes to appropriate monitor
- `SekiMonitor` - Seki-specific implementation
- `PulsarMonitor` - GitHub Actions implementation

New unified approach:
- Use `UnifiedPipelineMonitor` for new code
- Adapters handle provider-specific logic
- Single hook `useUnifiedPipeline` replaces multiple hooks
