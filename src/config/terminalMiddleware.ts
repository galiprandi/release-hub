import * as pty from 'node-pty';
import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { Duplex } from 'stream';

export function setupTerminalMiddleware(server: any) {
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
      command = process.platform === 'win32' ? 'powershell.exe' : 'bash';
      args = [];
    }

    const term = pty.spawn(command, args, {
      name: 'xterm-color',
      cols: 80,
      rows: 24,
      cwd: process.cwd(),
      env: process.env as Record<string, string>,
    });

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
