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
    const result = await runCommand('kubectl version --client --output=json');
    return result.stdout.includes('clientVersion');
  } catch {
    return false;
  }
}

export async function getCurrentContext(): Promise<string | null> {
  try {
    const result = await runCommand('kubectl config current-context');
    const ctx = result.stdout.trim();
    return ctx || null;
  } catch {
    return null;
  }
}

export async function getContexts(): Promise<string[]> {
  try {
    const result = await runCommand('kubectl config get-contexts -o name');
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
        containers: { image: string }[];
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
  const nsFlag = `-n ${sanitizeNamespace(namespace)}`;
  const ctxFlag = context ? `--context=${sanitizeContext(context)}` : '';
  try {
    const result = await runCommand(`kubectl get deployment ${sanitizeK8sName(name)} ${nsFlag} ${ctxFlag} -o json`.trim());
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
    };
  } catch {
    return null;
  }
}

export async function getDeployments(namespace?: string, context?: string): Promise<DeploymentInfo[]> {
  const nsFlag = namespace ? `-n ${sanitizeNamespace(namespace)}` : '--all-namespaces';
  const ctxFlag = context ? `--context=${sanitizeContext(context)}` : '';
  try {
    const result = await runCommand(`kubectl get deployments ${nsFlag} ${ctxFlag} -o json`.trim());
    return parseDeploymentsJson(result.stdout, namespace);
  } catch {
    // If using --all-namespaces and getting Forbidden errors, try namespace by namespace
    if (!namespace) {
      try {
        const namespacesResult = await runCommand(`kubectl get namespaces -o jsonpath='{.items[*].metadata.name}' ${ctxFlag}`.trim());
        const namespaces = namespacesResult.stdout.trim().split(' ').filter(Boolean);

        // Execute all namespace queries in parallel for better performance
        const deploymentPromises = namespaces.map(async (ns) => {
          try {
            const result = await runCommand(`kubectl get deployments -n ${sanitizeNamespace(ns)} ${ctxFlag} -o json`.trim());
            return parseDeploymentsJson(result.stdout, ns);
          } catch {
            // Skip namespaces where we don't have permission
            return [];
          }
        });

        const allResults = await Promise.all(deploymentPromises);
        return allResults.flat();
      } catch {
        // If we can't even list namespaces, try known namespaces
        const knownNamespaces = ['argentina-arcus', 'colombia-arcus', 'jc-test', 'seki-runners', 'default'];
        
        // Execute all known namespace queries in parallel
        const deploymentPromises = knownNamespaces.map(async (ns) => {
          try {
            const result = await runCommand(`kubectl get deployments -n ${sanitizeNamespace(ns)} ${ctxFlag} -o json`.trim());
            return parseDeploymentsJson(result.stdout, ns);
          } catch {
            // Skip namespaces where we don't have permission
            return [];
          }
        });

        const allResults = await Promise.all(deploymentPromises);
        return allResults.flat();
      }
    }
    // If specific namespace was requested and failed, return empty
    return [];
  }
}

export async function getPodsForDeployment(deploymentName: string, namespace?: string, context?: string): Promise<PodInfo[]> {
  const sanitizedDeploymentName = sanitizeK8sName(deploymentName);
  const nsFlag = namespace ? `-n ${sanitizeNamespace(namespace)}` : '';
  const ctxFlag = context ? `--context=${sanitizeContext(context)}` : '';
  const selectorResult = await runCommand(`kubectl get deployment ${sanitizedDeploymentName} ${nsFlag} ${ctxFlag} -o jsonpath='{.spec.selector.matchLabels}'`.trim());
  const selector = selectorResult.stdout.trim();
  if (!selector) {
    return [];
  }
  // Convertir selector JSON a formato -l key=value,key2=value2
  const labels = JSON.parse(selector);
  const labelSelector = Object.entries(labels).map(([k, v]) => `${k}=${v}`).join(',');
  const result = await runCommand(`kubectl get pods ${nsFlag} ${ctxFlag} -l ${labelSelector}`.trim());
  return parsePods(result.stdout);
}

export async function getResourceLogs(resourceType: 'deployment' | 'pod', name: string, namespace?: string, tail = 100, context?: string, since?: number): Promise<string> {
  const sanitizedName = sanitizeK8sName(name);
  const nsFlag = namespace ? `-n ${sanitizeNamespace(namespace)}` : '';
  const ctxFlag = context ? `--context=${sanitizeContext(context)}` : '';
  const sinceFlag = since ? `--since-time="${new Date(since * 1000).toISOString()}"` : '';
  
  if (resourceType === 'deployment') {
    // Get deployment selector and use label selector for logs
    const selectorResult = await runCommand(`kubectl get deployment ${sanitizedName} ${nsFlag} ${ctxFlag} -o jsonpath='{.spec.selector.matchLabels}'`.trim());
    const selector = selectorResult.stdout.trim();
    if (!selector) {
      throw new Error('No se pudo obtener selector del deployment');
    }
    // Convert selector JSON to format -l key=value,key2=value2
    const labels = JSON.parse(selector);
    const labelSelector = Object.entries(labels).map(([k, v]) => `${k}=${v}`).join(',');
    const result = await runCommand(`kubectl logs ${nsFlag} ${ctxFlag} -l ${labelSelector} --tail=${tail} ${sinceFlag} --ignore-errors`.trim());
    return cleanLogs(result.stdout);
  }
  const result = await runCommand(`kubectl logs ${sanitizedName} ${nsFlag} ${ctxFlag} --tail=${tail} ${sinceFlag}`.trim());
  return cleanLogs(result.stdout);
}

/**
 * Clean logs by removing ANSI escape codes and fixing escaped quotes
 */
function cleanLogs(logs: string): string {
  const escapeChar = String.fromCharCode(27);
  const ansiRegex = new RegExp(`${escapeChar}\\[[0-9;]*m`, 'g');
  return logs
    .replace(ansiRegex, '') // Remove ANSI escape codes
    .replace(/\\"/g, '"') // Fix escaped quotes
    .replace(/\\\\/g, '\\'); // Fix double backslashes
}

