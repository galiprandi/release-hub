import { useEffect, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

interface XTermLogsProps {
  logs: string;
  autoScroll?: boolean;
  className?: string;
}

export function XTermLogs({ logs, autoScroll = true, className }: XTermLogsProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const lastLogsRef = useRef<string>('');

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new XTerm({
      cursorBlink: false,
      fontSize: 12,
      fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      theme: {
        background: '#09090b', // zinc-950
        foreground: '#e4e4e7', // zinc-200
      },
      disableStdin: true,
      convertEol: true,
      scrollback: 10000,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());

    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    const handleResize = () => {
      fitAddon.fit();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
    };
  }, []);

  useEffect(() => {
    if (xtermRef.current) {
      if (!logs) {
        xtermRef.current.clear();
        lastLogsRef.current = '';
        return;
      }

      if (logs.startsWith(lastLogsRef.current) && lastLogsRef.current.length > 0) {
        // Incremental update
        const newPart = logs.substring(lastLogsRef.current.length);
        if (newPart) {
          xtermRef.current.write(newPart);
        }
      } else {
        // Full rewrite (if logs were filtered or completely changed)
        xtermRef.current.clear();
        xtermRef.current.write(logs);
      }

      lastLogsRef.current = logs;

      if (autoScroll) {
        xtermRef.current.scrollToBottom();
      }
    }
  }, [logs, autoScroll]);

  return (
    <div
      ref={terminalRef}
      className={`w-full h-full bg-[#09090b] rounded-md overflow-hidden ${className}`}
    />
  );
}
