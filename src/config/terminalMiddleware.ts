import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import * as pty from 'node-pty';
import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { Duplex } from 'stream';

const execAsync = promisify(exec);

interface ServerWithUpgrade {
  on(event: 'upgrade', listener: (request: IncomingMessage, socket: Duplex, head: Buffer) => void): void;
}

async function resolveNameToPod(name: string, namespace: string, context?: string | null): Promise<string | null> {
  const ctxFlag = context ? `--context=${context}` : '';
  const nsFlag = `-n ${namespace}`;

  try {
    // First: check if name is already a pod
    const checkPodCmd = `kubectl get pod ${name} ${nsFlag} ${ctxFlag} -o jsonpath='{.metadata.name}'`;
    const { stdout: podCheckRaw } = await execAsync(checkPodCmd);
    const podCheck = podCheckRaw.trim();
    if (podCheck && podCheck !== 'null' && podCheck !== '') {
      return podCheck;
    }
  } catch {
    // Not a pod, continue to deployment resolution
  }

  try {
    // Get deployment selector
    const selectorCmd = `kubectl get deployment ${name} ${nsFlag} ${ctxFlag} -o jsonpath='{.spec.selector.matchLabels}'`;
    const { stdout: selectorRaw } = await execAsync(selectorCmd);
    const selector = selectorRaw.trim();
    if (!selector || selector === 'null') return null;

    const labels = JSON.parse(selector);
    const labelSelector = Object.entries(labels).map(([k, v]) => `${k}=${v}`).join(',');

    // Get first running pod matching selector
    const podCmd = `kubectl get pods ${nsFlag} ${ctxFlag} -l ${labelSelector} --field-selector=status.phase=Running -o jsonpath='{.items[0].metadata.name}'`;
    const { stdout: podNameRaw } = await execAsync(podCmd);
    const podName = podNameRaw.trim();
    if (!podName || podName === 'null') return null;

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

    console.log(`[Terminal] Started ${command} ${args.join(' ')} (PID: ${term.pid})`);

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
      console.log(`[Terminal] Closing session (PID: ${term.pid})`);
      term.kill();
    });

    term.onExit(() => {
      console.log(`[Terminal] Process exited (PID: ${term.pid})`);
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });
  });
}
