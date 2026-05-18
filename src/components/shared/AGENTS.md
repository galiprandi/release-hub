# LogsViewer Component

## Overview

LogsViewer is a reusable component for displaying and managing logs from various sources (Kubernetes pods/deployments, Docker containers). It provides real-time log viewing with filtering, search, AI-powered summarization, and auto-scroll capabilities.

## Props

```typescript
export interface LogsViewerProps {
  queryFn: () => Promise<string>;
  onClose: () => void;
  asModal?: boolean;
  resources?: { id: string; name: string; type: string }[];
  selectedResourceId?: string;
  onResourceChange?: (resourceId: string) => void;
}
```

- **queryFn**: Function that fetches logs as a Promise<string>
- **onClose**: Callback to close the viewer
- **asModal**: Whether to render as a modal (default: true)
- **resources**: List of available resources (pods, deployments, containers)
- **selectedResourceId**: Currently selected resource ID
- **onResourceChange**: Callback when resource selection changes

## Key Features

### 0. Modal Integration (BaseDialog)

- When `asModal` is true, `LogsViewer` uses `BaseDialog` for standardized behavior.
- Use `maxWidth="max-w-[1800px]"` and custom `className="w-[95vw] h-[95vh] !p-0"` for immersive log viewing.
- Header controls are passed to `BaseDialog` via the `headerExtra` prop.

### 1. Data Fetching

- Uses React Query (`useQuery`) to fetch logs via `queryFn`
- Query key: `['logs', selectedResourceId]` to invalidate when resource changes
- Auto-refresh every 3 seconds (`refetchInterval: 3000`)
- Shows "Live" indicator when logs are loading

### 2. Resource Selection

- Displays a dropdown selector when `resources` prop is provided
- Shows only resource name (not type) in dropdown
- Triggers `onResourceChange` callback when selection changes
- Query automatically invalidates when `selectedResourceId` changes

### 3. Auto-Scroll

- Automatically scrolls to bottom when new logs arrive
- **Manual scroll detection**: When user scrolls up from bottom, auto-scroll is automatically disabled
- **Re-enabling**: User can re-enable auto-scroll via Pause/Play button (existing IconButton)
- Uses ResizeObserver to detect content expansion and scroll

### 4. Log Filtering

- **Text search**: Filter logs by text content (Cmd+F)
- **Keyboard shortcut**: Cmd+F (Mac) or Ctrl+F (Windows/Linux) focuses the search input
- **Log level filter**: Filter by ERROR, WARN, INFO, DEBUG, or ALL
- Filters are applied after logs are fetched
- Search input has placeholder "Buscar (Cmd+F)" and `aria-label="Buscar logs"`
- Search input width: `w-48` (30% wider than default)

### 5. AI-Powered Summarization

- Integrates with Chrome AI Summarizer via `useAISummarize` hook
- Generates key-point summaries of logs
- Shows availability status (checking, available, unavailable)
- Displays summary in AISummaryCard component
- Handles errors with AI error processing via `useAIErrorProcessor`

### 6. Log Display

- **LazyRender**: Renders logs in chunks for performance
- **Syntax highlighting**: Highlights log lines with colors
- **Log grouping**: Groups related log lines together
- **Copy functionality**: Copy all filtered logs to clipboard

## Usage Examples

### Kubernetes Integration (K8sSection)

```typescript
const queryFn = () => getResourceLogs(currentType, currentName, namespace, 100, activeContext);

const resources = useMemo(() => {
  const list: { id: string; name: string; type: string }[] = [];
  if (deployments && deployments.length > 0) {
    deployments.forEach(dep => {
      list.push({ id: dep.name, name: dep.name, type: 'deployment' });
    });
  }
  return list;
}, [deployments]);

<LogsViewer
  queryFn={queryFn}
  onClose={() => setIsLogsModalOpen(false)}
  resources={resources}
  selectedResourceId={selectedResourceId}
  onResourceChange={handleResourceChange}
/>
```

### Docker Integration (ContainerList)

```typescript
const queryFn = () => {
  if (!selectedContainer) return Promise.resolve('');
  return getContainerLogs(selectedContainer.id, 100);
};

const resources = useMemo(() => {
  if (!containers) return [];
  return containers.map(c => ({ id: c.id, name: c.name, type: 'container' }));
}, [containers]);

<LogsViewer
  queryFn={queryFn}
  onClose={() => setIsLogsModalOpen(false)}
  resources={resources}
  selectedResourceId={selectedResourceId}
  onResourceChange={handleResourceChange}
/>
```

## Log Cleaning (Kubernetes)

When fetching logs from Kubernetes via `getResourceLogs` in `src/api/kubectl.ts`, logs are cleaned to remove formatting artifacts:

```typescript
function cleanLogs(logs: string): string {
  const escapeChar = String.fromCharCode(27);
  const ansiRegex = new RegExp(`${escapeChar}\\[[0-9;]*m`, 'g');
  return logs
    .replace(ansiRegex, '') // Remove ANSI escape codes
    .replace(/\\"/g, '"') // Fix escaped quotes
    .replace(/\\\\/g, '\\'); // Fix double backslashes
}
```

This removes:
- ANSI color codes (e.g., `[35m`, `[1m`, `[22m`)
- Escaped quotes (`\"` → `"`)
- Double backslashes (`\\` → `\`)

## Deployment Logs

When fetching logs from Kubernetes deployments, the command includes `--ignore-errors` to continue fetching logs from other pods if one pod's container is unavailable:

```bash
kubectl logs -n <namespace> --context=<context> -l <label-selector> --tail=100 --ignore-errors
```

This prevents failures when pods are in CrashLoopBackOff, Error, or terminating states.

## Performance Considerations

- **LazyRender**: Logs are rendered in chunks to prevent UI freezing with large logs
- **ResizeObserver**: Efficiently detects content changes without polling
- **React Query caching**: Logs are cached and refetched on interval
- **Filtering**: Applied client-side after fetch to avoid refetching

## Accessibility

- Search input has `aria-label="Buscar logs"`
- All buttons have tooltips for context
- Keyboard navigation supported
- Screen reader friendly

## Dependencies

- React Query: Data fetching and caching
- @radix-ui/react-tooltip: Tooltip components
- @galiprandi/react-tools: LazyRender, useAISummarize
- lucide-react: Icons (Terminal, Pause, Play, Sparkles, etc.)
