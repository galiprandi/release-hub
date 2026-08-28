import { runCommand } from '@/api/exec';

function sanitizeContext(context: string): string {
  if (!context) {
    throw new Error('Context name cannot be empty');
  }
  // Kubernetes context names can contain alphanumeric, -, _, ., /
  // Reject shell metacharacters to prevent command injection
  const safeContextRegex = /^[a-zA-Z0-9_./-]+$/;
  if (!safeContextRegex.test(context)) {
    throw new Error(`Invalid context name format: ${context}`);
  }
  return context;
}

export interface DeploymentInfo {
  namespace: string;
  name: string;
  ready: string;
  upToDate: string;
  available: string;
  age: string;
  images: string[];
  status: 'healthy' | 'progressing' | 'degraded' | 'unknown';
  gitCommit?: string;
}

export interface PodInfo {
  namespace: string;
  name: string;
  ready: string;
  status: string;
  restarts: string;
  age: string;
  node?: string;
}

/**
 * Sanitizes Kubernetes resource names to prevent command injection.
 * Kubernetes names must comply with: RFC 1123 subdomain (DNS subdomain)
 * - Must consist of lowercase alphanumeric characters, '-' or '.'
 * - Must start and end with an alphanumeric character
 * - Maximum length: 253 characters
 */
function sanitizeK8sName(name: string): string {
  if (!name) {
    throw new Error('Kubernetes name cannot be empty');
  }

  if (name.length > 253) {
    throw new Error(`Kubernetes name exceeds maximum length of 253 characters: ${name}`);
  }

  // Validate Kubernetes name format (RFC 1123 subdomain)
  const k8sNameRegex = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$/;
  
  if (!k8sNameRegex.test(name)) {
    throw new Error(`Invalid Kubernetes name format: ${name}. Names must consist of lowercase alphanumeric characters, '-' or '.', and must start and end with an alphanumeric character.`);
  }

  return name;
}

/**
 * Sanitizes Kubernetes namespace names.
 * Namespaces follow the same rules as resource names.
 */
function sanitizeNamespace(namespace: string): string {
  return sanitizeK8sName(namespace);
}

/**
 * Verifies that kubectl is installed and accessible.
 */
export async function checkKubectlInstalled(): Promise<boolean> {
  try {
    const result = await runCommand(['kubectl', 'version', '--client', '--output=json']);
    return result.stdout.includes('clientVersion');
  } catch {
    return false;
  }
}

export async function getCurrentContext(): Promise<string | null> {
  try {
    const result = await runCommand(['kubectl', 'config', 'current-context']);
    const ctx = result.stdout.trim();
    return ctx || null;
  } catch {
    return null;
  }
}

export async function getContexts(): Promise<string[]> {
  try {
    const result = await runCommand(['kubectl', 'config', 'get-contexts', '-o', 'name']);
    return result.stdout.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}


function formatAge(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 365) return `${days}d`;
  const years = Math.floor(days / 365);
  return `${years}y`;
}

function deriveStatus(conditions?: { type: string; status: string }[]): DeploymentInfo['status'] {
  const available = conditions?.find(c => c.type === 'Available');
  const progressing = conditions?.find(c => c.type === 'Progressing');

  if (available?.status === 'True') return 'healthy';
  if (progressing?.status === 'True') return 'progressing';
  if (available?.status === 'False') return 'degraded';
  return 'unknown';
}

interface K8sDeploymentItem {
  metadata: {
    name: string;
    namespace: string;
    creationTimestamp: string;
  };
  spec: {
    replicas?: number;
    template: {
      spec: {
        containers: { image: string; env?: { name: string; value?: string }[] }[];
      };
    };
  };
  status: {
    readyReplicas?: number;
    updatedReplicas?: number;
    availableReplicas?: number;
    conditions?: { type: string; status: string }[];
  };
}

function extractGitCommit(containers: { env?: { name: string; value?: string }[] }[]): string | undefined {
  for (const container of containers) {
    const envVar = container.env?.find(e => e.name === 'GIT_COMMIT');
    if (envVar?.value) return envVar.value;
  }
  return undefined;
}

function parseDeploymentsJson(output: string, defaultNamespace?: string): DeploymentInfo[] {
  try {
    const json = JSON.parse(output);
    const items: K8sDeploymentItem[] = json.items || [];

    return items.map((item) => {
      const ready = item.status.readyReplicas ?? 0;
      const desired = item.spec.replicas ?? 0;
      const updated = item.status.updatedReplicas ?? 0;
      const available = item.status.availableReplicas ?? 0;

      return {
        namespace: item.metadata.namespace || defaultNamespace || '',
        name: item.metadata.name,
        ready: `${ready}/${desired}`,
        upToDate: String(updated),
        available: String(available),
        age: formatAge(item.metadata.creationTimestamp),
        images: item.spec.template.spec.containers.map(c => c.image),
        status: deriveStatus(item.status.conditions),
        gitCommit: extractGitCommit(item.spec.template.spec.containers),
      };
    });
  } catch {
    return [];
  }
}

function parsePods(output: string): PodInfo[] {
  const lines = output.trim().split('\n');
  const pods: PodInfo[] = [];
  
  // Detect if it has NAMESPACE column (all-namespaces) or only NAME
  const hasNamespace = lines[0]?.includes('NAMESPACE');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('NAME')) continue;
    const parts = trimmed.split(/\s+/);
    
    if (hasNamespace) {
      // Formato: NAMESPACE NAME READY STATUS RESTARTS AGE NODE
      if (parts.length >= 6) {
        pods.push({
          namespace: parts[0],
          name: parts[1],
          ready: parts[2],
          status: parts[3],
          restarts: parts[4],
          age: parts[5] || '',
          node: parts[6] || '',
        });
      }
    } else {
      // Formato: NAME READY STATUS RESTARTS AGE NODE
      if (parts.length >= 5) {
        pods.push({
          namespace: '',
          name: parts[0],
          ready: parts[1],
          status: parts[2],
          restarts: parts[3],
          age: parts[4] || '',
          node: parts[5] || '',
        });
      }
    }
  }
  return pods;
}

export async function getDeployment(name: string, namespace: string, context?: string): Promise<DeploymentInfo | null> {
  const args = ['kubectl', 'get', 'deployment', sanitizeK8sName(name), '-n', sanitizeNamespace(namespace)];
  if (context) args.push(`--context=${sanitizeContext(context)}`);
  args.push('-o', 'json');

  try {
    const result = await runCommand(args);
    const json = JSON.parse(result.stdout);
    const item: K8sDeploymentItem = json;
    const ready = item.status.readyReplicas ?? 0;
    const desired = item.spec.replicas ?? 0;
    const updated = item.status.updatedReplicas ?? 0;
    const available = item.status.availableReplicas ?? 0;

    return {
      namespace: item.metadata.namespace || namespace,
      name: item.metadata.name,
      ready: `${ready}/${desired}`,
      upToDate: String(updated),
      available: String(available),
      age: formatAge(item.metadata.creationTimestamp),
      images: item.spec.template.spec.containers.map(c => c.image),
      status: deriveStatus(item.status.conditions),
      gitCommit: extractGitCommit(item.spec.template.spec.containers),
    };
  } catch {
    return null;
  }
}

export async function searchDeploymentsByNamespace(namespace: string, contexts: string[]): Promise<Array<DeploymentInfo & { context: string }>> {
  const results = await Promise.all(
    contexts.map(async (ctx) => {
      try {
        const args = ['kubectl', 'get', 'deployments', '-n', sanitizeNamespace(namespace), '-o', 'json'];
        args.push(`--context=${sanitizeContext(ctx)}`);
        const result = await runCommand(args);
        const deployments = parseDeploymentsJson(result.stdout, namespace);
        return deployments.map(d => ({ ...d, context: ctx }));
      } catch {
        return [];
      }
    })
  );
  return results.flat();
}

export async function getDeployments(namespace?: string, context?: string): Promise<DeploymentInfo[]> {
  const args = ['kubectl', 'get', 'deployments'];
  if (namespace) {
    args.push('-n', sanitizeNamespace(namespace));
  } else {
    args.push('--all-namespaces');
  }
  if (context) args.push(`--context=${sanitizeContext(context)}`);
  args.push('-o', 'json');

  try {
    const result = await runCommand(args);
    return parseDeploymentsJson(result.stdout, namespace);
  } catch {
    // If using --all-namespaces and getting Forbidden errors, try namespace by namespace
    if (!namespace) {
      try {
        const nsArgs = ['kubectl', 'get', 'namespaces', '-o', "jsonpath='{.items[*].metadata.name}'"];
        if (context) nsArgs.push(`--context=${sanitizeContext(context)}`);

        const namespacesResult = await runCommand(nsArgs);
        const namespaces = namespacesResult.stdout.trim().replace(/'/g, '').split(' ').filter(Boolean);

        // Execute all namespace queries in parallel for better performance
        const deploymentPromises = namespaces.map(async (ns) => {
          try {
            const innerArgs = ['kubectl', 'get', 'deployments', '-n', sanitizeNamespace(ns), '-o', 'json'];
            if (context) innerArgs.push(`--context=${sanitizeContext(context)}`);
            const result = await runCommand(innerArgs);
            return parseDeploymentsJson(result.stdout, ns);
          } catch {
            // Skip namespaces where we don't have permission
            return [];
          }
        });

        const allResults = await Promise.all(deploymentPromises);
        return allResults.flat();
      } catch {
        // No permissions to list namespaces and no specific namespace requested
        return [];
      }
    }
    // If specific namespace was requested and failed, return empty
    return [];
  }
}

export async function getPodsForDeployment(deploymentName: string, namespace?: string, context?: string): Promise<PodInfo[]> {
  const sanitizedDeploymentName = sanitizeK8sName(deploymentName);

  const getArgs = ['kubectl', 'get', 'deployment', sanitizedDeploymentName];
  if (namespace) getArgs.push('-n', sanitizeNamespace(namespace));
  if (context) getArgs.push(`--context=${sanitizeContext(context)}`);
  getArgs.push('-o', "jsonpath='{.spec.selector.matchLabels}'");

  const selectorResult = await runCommand(getArgs);
  const selector = selectorResult.stdout.trim().replace(/'/g, '');
  if (!selector) {
    return [];
  }
  // Convertir selector JSON a formato -l key=value,key2=value2
  const labels = JSON.parse(selector);
  const labelSelector = Object.entries(labels).map(([k, v]) => `${k}=${v}`).join(',');

  const podsArgs = ['kubectl', 'get', 'pods', '-l', labelSelector];
  if (namespace) podsArgs.push('-n', sanitizeNamespace(namespace));
  if (context) podsArgs.push(`--context=${sanitizeContext(context)}`);

  const result = await runCommand(podsArgs);
  return parsePods(result.stdout);
}

export interface PodCommitInfo {
  name: string;
  phase: string;
  gitCommit?: string;
  images: string[];
}

interface K8sPodItem {
  metadata: { name: string };
  status: { phase?: string };
  spec: {
    containers: { image: string; env?: { name: string; value?: string }[] }[];
  };
}

/**
 * Returns the GIT_COMMIT and images actually running in each pod of a deployment.
 * Useful to detect incomplete rollouts where old pods survive a failed deploy.
 */
export async function getPodCommits(deploymentName: string, namespace: string, context?: string): Promise<PodCommitInfo[]> {
  const sanitizedDeploymentName = sanitizeK8sName(deploymentName);

  const getArgs = ['kubectl', 'get', 'deployment', sanitizedDeploymentName, '-n', sanitizeNamespace(namespace)];
  if (context) getArgs.push(`--context=${sanitizeContext(context)}`);
  getArgs.push('-o', "jsonpath='{.spec.selector.matchLabels}'");

  const selectorResult = await runCommand(getArgs);
  const selector = selectorResult.stdout.trim().replace(/'/g, '');
  if (!selector) return [];

  const labels = JSON.parse(selector);
  const labelSelector = Object.entries(labels).map(([k, v]) => `${k}=${v}`).join(',');

  const podsArgs = ['kubectl', 'get', 'pods', '-l', labelSelector, '-n', sanitizeNamespace(namespace)];
  if (context) podsArgs.push(`--context=${sanitizeContext(context)}`);
  podsArgs.push('-o', 'json');

  const result = await runCommand(podsArgs);
  try {
    const json = JSON.parse(result.stdout);
    const items: K8sPodItem[] = json.items || [];
    return items.map((item) => ({
      name: item.metadata.name,
      phase: item.status.phase || 'Unknown',
      gitCommit: extractGitCommit(item.spec.containers),
      images: item.spec.containers.map(c => c.image),
    }));
  } catch {
    return [];
  }
}

export async function getResourceLogs(resourceType: 'deployment' | 'pod', name: string, namespace?: string, tail = 100, context?: string, since?: number): Promise<string> {
  const sanitizedName = sanitizeK8sName(name);
  
  if (resourceType === 'deployment') {
    const getArgs = ['kubectl', 'get', 'deployment', sanitizedName];
    if (namespace) getArgs.push('-n', sanitizeNamespace(namespace));
    if (context) getArgs.push(`--context=${sanitizeContext(context)}`);
    getArgs.push('-o', "jsonpath='{.spec.selector.matchLabels}'");

    const selectorResult = await runCommand(getArgs);
    const selector = selectorResult.stdout.trim().replace(/'/g, '');
    if (!selector) {
      throw new Error('No se pudo obtener selector del deployment');
    }
    const labels = JSON.parse(selector);
    const labelSelector = Object.entries(labels).map(([k, v]) => `${k}=${v}`).join(',');

    const logsArgs = ['kubectl', 'logs', '-l', labelSelector, `--tail=${tail}`, '--ignore-errors'];
    if (namespace) logsArgs.push('-n', sanitizeNamespace(namespace));
    if (context) logsArgs.push(`--context=${sanitizeContext(context)}`);
    if (since) logsArgs.push(`--since-time=${new Date(since * 1000).toISOString()}`);

    const result = await runCommand(logsArgs);
    return cleanLogs(result.stdout);
  }

  const podLogsArgs = ['kubectl', 'logs', sanitizedName, `--tail=${tail}`];
  if (namespace) podLogsArgs.push('-n', sanitizeNamespace(namespace));
  if (context) podLogsArgs.push(`--context=${sanitizeContext(context)}`);
  if (since) podLogsArgs.push(`--since-time=${new Date(since * 1000).toISOString()}`);

  const result = await runCommand(podLogsArgs);
  return cleanLogs(result.stdout);
}

/**
 * Clean logs by fixing escaped quotes and backslashes.
 * ANSI escape codes are preserved so xterm.js can render colors.
 */
function cleanLogs(logs: string): string {
  return logs
    .replace(/\\"/g, '"') // Fix escaped quotes
    .replace(/\\\\/g, '\\'); // Fix double backslashes
}
