import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupTerminalMiddleware } from './terminalMiddleware';
import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage, Server } from 'node:http';

// Mock ws and node-pty
vi.mock('ws', () => {
  const WebSocketServer = vi.fn(() => ({
    handleUpgrade: vi.fn((_req, _socket, _head, cb) => cb({ on: vi.fn(), send: vi.fn(), close: vi.fn(), readyState: 1 })),
    on: vi.fn(),
    emit: vi.fn(),
  }));
  return { WebSocketServer, WebSocket: vi.fn() };
});

vi.mock('node-pty', () => ({
  spawn: vi.fn(() => ({
    onData: vi.fn(),
    onExit: vi.fn(),
    write: vi.fn(),
    resize: vi.fn(),
    kill: vi.fn(),
  })),
}));

describe('terminalMiddleware', () => {
  let mockServer: { on: ReturnType<typeof vi.fn> };
  interface MockWebSocketServer {
    on: {
      mock: {
        calls: [string, ...unknown[]][];
      };
    };
  }
  let wssInstance: MockWebSocketServer;

  beforeEach(() => {
    vi.clearAllMocks();
    mockServer = { on: vi.fn() };
    setupTerminalMiddleware(mockServer as unknown as Server);
    wssInstance = vi.mocked(WebSocketServer).mock.results[0].value;
  });

  it('should register upgrade handler', () => {
    expect(mockServer.on).toHaveBeenCalledWith('upgrade', expect.any(Function));
  });

  describe('Connection Validation', () => {
    let connectionHandler: (ws: WebSocket, req: IncomingMessage) => Promise<void>;
    let mockWs: { send: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn>; on: ReturnType<typeof vi.fn>; readyState: number };

    beforeEach(() => {
      // @ts-expect-error - Accessing internal vitest mock structure for event handler extraction
      connectionHandler = wssInstance.on.mock.calls.find((call) => call[0] === 'connection')![1];
      mockWs = {
        send: vi.fn(),
        close: vi.fn(),
        on: vi.fn(),
        readyState: 1
      };
    });

    it('should reject invalid terminal type', async () => {
      const mockReq = {
        url: '/terminal?type=invalid',
        headers: { host: 'localhost' }
      } as IncomingMessage;

      await connectionHandler(mockWs as unknown as WebSocket, mockReq);
      expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('Invalid terminal type'));
      expect(mockWs.close).toHaveBeenCalled();
    });

    it('should reject invalid k8s resource name', async () => {
      const mockReq = {
        url: '/terminal?type=k8s&name=invalid_name;rm -rf /',
        headers: { host: 'localhost' }
      } as IncomingMessage;

      await connectionHandler(mockWs as unknown as WebSocket, mockReq);
      expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('Invalid resource name format'));
      expect(mockWs.close).toHaveBeenCalled();
    });

    it('should reject invalid namespace', async () => {
      const mockReq = {
        url: '/terminal?type=k8s&name=valid-pod&namespace=invalid_ns',
        headers: { host: 'localhost' }
      } as IncomingMessage;

      await connectionHandler(mockWs as unknown as WebSocket, mockReq);
      expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('Invalid namespace format'));
      expect(mockWs.close).toHaveBeenCalled();
    });

    it('should reject invalid context', async () => {
      const mockReq = {
        url: '/terminal?type=k8s&name=valid-pod&context=invalid;context',
        headers: { host: 'localhost' }
      } as IncomingMessage;

      await connectionHandler(mockWs as unknown as WebSocket, mockReq);
      expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('Invalid context format'));
      expect(mockWs.close).toHaveBeenCalled();
    });

    it('should reject invalid docker container name', async () => {
      const mockReq = {
        url: '/terminal?type=docker&name=invalid;name',
        headers: { host: 'localhost' }
      } as IncomingMessage;

      await connectionHandler(mockWs as unknown as WebSocket, mockReq);
      expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('Invalid container name format'));
      expect(mockWs.close).toHaveBeenCalled();
    });
  });
});
