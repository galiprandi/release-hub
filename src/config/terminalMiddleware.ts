import * as pty from 'node-pty';
import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { Duplex } from 'stream';

interface ServerWithUpgrade {
  on(event: 'upgrade', listener: (request: IncomingMessage, socket: Duplex, head: Buffer) => void): void;
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

  wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const type = url.searchParams.get('type');
    const name = url.searchParams.get('name');
    const namespace = url.searchParams.get('namespace') || 'default';
    const context = url.searchParams.get('context');
    const container = url.searchParams.get('container');

    let command = '';
    let args: string[] = [];

    if (type === 'k8s') {
      command = 'kubectl';
      args = ['exec', '-it', name!, '-n', namespace];
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
