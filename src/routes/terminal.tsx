import { createFileRoute } from '@tanstack/react-router';
import { Terminal, type TerminalHandle } from '@/components/shared/Terminal';
import { PageLayout } from '@/layouts/PageLayout';
import { Terminal as TerminalIcon, AlertCircle, RotateCw, Loader2 } from 'lucide-react';
import { detectOS } from '@/utils/os';
import { useCallback, useEffect, useRef, useState } from 'react';

export const Route = createFileRoute('/terminal')({
  component: TerminalPage,
});

type TerminalStatus = 'loading' | 'ready' | 'error';

function TerminalPage() {
  const os = detectOS();
  const shell = os === 'Windows' ? 'powershell.exe' : os === 'macOS' ? 'zsh' : 'bash';

  const [status, setStatus] = useState<TerminalStatus>('loading');
  const [retryKey, setRetryKey] = useState(0);
  const terminalRef = useRef<TerminalHandle>(null);

  const handleReady = useCallback(() => setStatus('ready'), []);
  const handleError = useCallback(() => setStatus('error'), []);

  const handleRetry = useCallback(() => {
    setStatus('loading');
    setRetryKey((k) => k + 1);
  }, []);

  const handleClear = useCallback(() => {
    terminalRef.current?.clear();
  }, []);

  const handleFocus = useCallback(() => {
    terminalRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        handleFocus();
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        handleClear();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFocus, handleClear]);

  return (
    <PageLayout
      header={{
        title: (
          <div className="flex items-center gap-2">
            <TerminalIcon className="w-4 h-4 text-primary" />
            <span>Terminal</span>
          </div>
        )
      }}
    >
      <div className="flex-1 flex flex-col min-h-0 bg-zinc-950 rounded-md overflow-hidden border border-border shadow-2xl">
        <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse " />
              <span className="text-xs font-medium text-muted-foreground">Sesión Local Activa</span>
            </div>
            <div className="w-px h-3 bg-border" />
            <span className="text-xs font-medium text-muted-foreground font-mono">/bin/{shell}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
               <span className="text-xs font-medium text-muted-foreground">Status</span>
               <span className="px-1.5 py-0.5 rounded bg-success/20 border border-success/40 text-xs font-bold text-success">Connected</span>
            </div>
            <div className="w-px h-3 bg-border" />
            <div className="flex items-center gap-1.5">
               <span className="text-xs font-medium text-muted-foreground">OS</span>
               <span className="px-1.5 py-0.5 rounded bg-primary/10 border border-primary/30 text-xs font-bold text-primary">{os}</span>
            </div>
          </div>
        </div>
        <div className="relative flex-1 min-h-0">
          <Terminal
            key={retryKey}
            ref={terminalRef}
            type="local"
            className="border-none rounded-none flex-1"
            onReady={handleReady}
            onError={handleError}
          />
          {status === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Inicializando terminal...</p>
              </div>
            </div>
          )}
          {status === 'error' && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">
              <div className="flex flex-col items-center gap-4">
                <AlertCircle className="w-8 h-8 text-destructive" />
                <p className="text-sm text-muted-foreground">No se pudo inicializar la terminal</p>
                <button
                  onClick={handleRetry}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-card text-sm font-medium text-foreground hover:bg-muted/30 focus:ring-2 focus:ring-primary/30 focus:border-primary focus:outline-none"
                >
                  <RotateCw className="w-4 h-4" />
                  Reintentar
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-center px-4 py-1.5 bg-muted/30 border-t border-border">
          <p className="text-xs text-muted-foreground">
            <kbd className="font-mono">⌘K</kbd> enfocar · <kbd className="font-mono">⌘L</kbd> limpiar
          </p>
        </div>
      </div>
    </PageLayout>
  );
}
