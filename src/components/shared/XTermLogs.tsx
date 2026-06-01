import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SearchAddon } from '@xterm/addon-search';
import '@xterm/xterm/css/xterm.css';

interface XTermLogsProps {
  logs: string;
  autoScroll?: boolean;
  className?: string;
}

export interface XTermLogsHandle {
  findNext: (term: string) => boolean;
  findPrevious: (term: string) => boolean;
  clearSearch: () => void;
}

export const XTermLogs = forwardRef<XTermLogsHandle, XTermLogsProps>(function XTermLogs(
  { logs, autoScroll = true, className },
  ref
) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const lastLogsRef = useRef<string>('');

  useImperativeHandle(ref, () => ({
    findNext: (term: string) => {
      if (!searchAddonRef.current || !term) return false;
      return searchAddonRef.current.findNext(term, { incremental: false });
    },
    findPrevious: (term: string) => {
      if (!searchAddonRef.current || !term) return false;
      return searchAddonRef.current.findPrevious(term, { incremental: false });
    },
    clearSearch: () => {
      searchAddonRef.current?.clearDecorations();
    },
  }), []);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new XTerm({
      cursorBlink: false,
      fontSize: 12,
      fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      theme: {
        background: '#09090b',
        foreground: '#e4e4e7',
        black: '#71717a',
        brightBlack: '#a1a1aa',
        red: '#f87171',
        brightRed: '#fca5a5',
        green: '#4ade80',
        brightGreen: '#86efac',
        yellow: '#facc15',
        brightYellow: '#fde047',
        blue: '#60a5fa',
        brightBlue: '#93c5fd',
        magenta: '#c084fc',
        brightMagenta: '#d8b4fe',
        cyan: '#22d3ee',
        brightCyan: '#67e8f9',
        white: '#e4e4e7',
        brightWhite: '#fafafa',
      },
      disableStdin: true,
      convertEol: true,
      scrollback: 10000,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    const searchAddon = new SearchAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());
    term.loadAddon(searchAddon);

    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;
    searchAddonRef.current = searchAddon;

    const handleResize = () => {
      fitAddon.fit();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
      searchAddonRef.current = null;
    };
  }, [ref]);

  useEffect(() => {
    if (xtermRef.current) {
      if (!logs) {
        xtermRef.current.clear();
        lastLogsRef.current = '';
        return;
      }

      if (logs.startsWith(lastLogsRef.current) && lastLogsRef.current.length > 0) {
        const newPart = logs.substring(lastLogsRef.current.length);
        if (newPart) {
          xtermRef.current.write(newPart);
        }
      } else {
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
});
