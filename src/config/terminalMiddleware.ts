import { spawn } from 'node:child_process';
import * as pty from 'node-pty';
import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { Duplex } from 'stream';

interface ServerWithUpgrade {
  on(event: 'upgrade', listener: (request: IncomingMessage, socket: Duplex, head: Buffer) => void): void;
}

/**
 * Secure alternative to execAsync for internal middleware use.
 */
const spawnAsync = (
  args: string[],
): Promise<{ stdout: string; stderr: string; success: boolean; error?: string }> => {
  return new Promise((resolve) => {
    const [cmd, ...cmdArgs] = args;
    const child = spawn(cmd, cmdArgs, { shell: false });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    child.on('close', (code: number | null) => {
      resolve({ stdout, stderr, success: code === 0 });
    });

    child.on('error', (err: Error) => {
      resolve({ stdout, stderr, success: false, error: err.message });
    });
  });
};

async function resolveNameToPod(name: string, namespace: string, context?: string | null): Promise<string | null> {
  try {
    // First: check if name is already a pod
    const checkPodArgs = ['kubectl', 'get', 'pod', name, '-n', namespace, '-o', 'jsonpath={.metadata.name}'];
    if (context) checkPodArgs.push('--context', context);

    const { stdout: podCheckRaw, success: podCheckSuccess } = await spawnAsync(checkPodArgs);
    const podCheck = podCheckRaw.trim();
    if (podCheckSuccess && podCheck && podCheck !== 'null' && podCheck !== '') {
      return podCheck;
    }
  } catch {
    // Not a pod, continue to deployment resolution
  }

  try {
    // Get deployment selector
    const selectorArgs = ['kubectl', 'get', 'deployment', name, '-n', namespace, '-o', 'jsonpath={.spec.selector.matchLabels}'];
    if (context) selectorArgs.push('--context', context);

    const { stdout: selectorRaw, success: selectorSuccess } = await spawnAsync(selectorArgs);
    const selector = selectorRaw.trim();
    if (!selectorSuccess || !selector || selector === 'null') return null;

    const labels = JSON.parse(selector);
    const labelSelector = Object.entries(labels).map(([k, v]) => `${k}=${v}`).join(',');

    // Get first running pod matching selector
    const podArgs = ['kubectl', 'get', 'pods', '-n', namespace, '-l', labelSelector, '--field-selector=status.phase=Running', '-o', 'jsonpath={.items[0].metadata.name}'];
    if (context) podArgs.push('--context', context);

    const { stdout: podNameRaw, success: podNameSuccess } = await spawnAsync(podArgs);
    const podName = podNameRaw.trim();
    if (!podNameSuccess || !podName || podName === 'null') return null;

    return podName;
  } catch {
    return null;
  }
}

export function setupTerminalMiddleware(server: ServerWithUpgrade) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    const { pathname } = new URL(request.url || '', `http://${request.headers.host}`);

    if (pathname === '/terminal') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', async (ws: WebSocket, request: IncomingMessage) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const type = url.searchParams.get('type');
    const name = url.searchParams.get('name');
    const namespace = url.searchParams.get('namespace') || 'default';
    const context = url.searchParams.get('context');
    const container = url.searchParams.get('container');

    // Validation patterns (RFC 1123 for K8s DNS labels/subdomains, standard Docker container names)
    const k8sNameRegex =
      /^[a-z0-9]([-a-z0-9]{0,61}[a-z0-9])?(\.[a-z0-9]([-a-z0-9]{0,61}[a-z0-9])?)*$/;
    const k8sNamespaceRegex = /^[a-z0-9]([-a-z0-9]{0,61}[a-z0-9])?$/;
    const contextRegex = /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/;
    const dockerNameRegex = /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/;

    // Validate type
    if (!type || !['k8s', 'docker', 'local'].includes(type)) {
      ws.send('\r\n[ERROR] Invalid terminal type\r\n');
      ws.close();
      return;
    }

    // Validate name if present
    if (name) {
      const nameRegex = type === 'k8s' ? k8sNameRegex : dockerNameRegex;
      if (!nameRegex.test(name)) {
        ws.send(`\r\n[ERROR] Invalid ${type === 'k8s' ? 'resource' : 'container'} name format\r\n`);
        ws.close();
        return;
      }
    }

    // Validate namespace if present
    if (namespace && namespace !== 'default' && !k8sNamespaceRegex.test(namespace)) {
      ws.send('\r\n[ERROR] Invalid namespace format\r\n');
      ws.close();
      return;
    }

    // Validate context if present
    if (context && !contextRegex.test(context)) {
      ws.send('\r\n[ERROR] Invalid context format\r\n');
      ws.close();
      return;
    }

    // Validate container if present
    if (container) {
      const isK8s = type === 'k8s';
      const containerRegex = isK8s ? k8sNameRegex : dockerNameRegex;
      if (!containerRegex.test(container)) {
        ws.send('\r\n[ERROR] Invalid container name format\r\n');
        ws.close();
        return;
      }
    }

    let command = '';
    let args: string[] = [];

    if (type === 'k8s') {
      if (!name) {
        ws.send('\r\n[ERROR] Missing deployment name\r\n');
        ws.close();
        return;
      }
      const podName = await resolveNameToPod(name, namespace, context);
      if (!podName) {
        ws.send(`\r\n[ERROR] No running pods found for deployment "${name}" in namespace "${namespace}"\r\n`);
        ws.close();
        return;
      }
      command = 'kubectl';
      args = ['exec', '-it', podName, '-n', namespace];
      if (context) args.push('--context', context);
      if (container) args.push('-c', container);
      args.push('--', 'sh', '-c', 'command -v bash >/dev/null && exec bash || exec sh');
    } else if (type === 'docker') {
      command = 'docker';
      args = ['exec', '-it', name!, 'sh', '-c', 'command -v bash >/dev/null && exec bash || exec sh'];
    } else {
      if (process.platform === 'win32') {
        command = 'powershell.exe';
      } else if (process.platform === 'darwin') {
        command = 'zsh';
      } else {
        command = 'bash';
      }
      args = [];
    }

    let term: pty.IPty;
    try {
      term = pty.spawn(command, args, {
        name: 'xterm-color',
        cols: 80,
        rows: 24,
        cwd: process.cwd(),
        env: process.env as Record<string, string>,
      });
    } catch (spawnError) {
      console.error(`[Terminal] Failed to spawn ${command}:`, spawnError);
      ws.send(`\r\n[ERROR] Failed to start terminal: ${spawnError instanceof Error ? spawnError.message : String(spawnError)}\r\n`);
      ws.close();
      return;
    }

    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    ws.on('message', (message: Buffer) => {
      const msg = message.toString();
      try {
        const parsed = JSON.parse(msg);
        if (parsed.type === 'resize') {
          term.resize(parsed.cols, parsed.rows);
        } else if (parsed.type === 'input') {
          term.write(parsed.data);
        }
      } catch {
        term.write(msg);
      }
    });

    ws.on('close', () => {
      term.kill();
    });

    term.onExit(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });
  });
}
