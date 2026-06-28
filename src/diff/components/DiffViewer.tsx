import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import type { DiffMode, DiffLine } from '@/utils/diffEngine';
import { computeDiff, normalizeJson, decodeAndNormalizeJwt, normalizeCurl, formatExpiration, detectContentType } from '@/utils/diffEngine';
import { decodeJWT } from '@/hooks/useToken';
import { DiffPanel } from './DiffPanel';
import { clsx } from 'clsx';
import { GitCompare, Maximize2, Minimize2, Clock, Filter } from 'lucide-react';
import { highlight } from 'sugar-high';
import { escapeHtml } from '@/components/shared/logUtils';
import { EmptyState } from '@/components/shared/EmptyState';

interface DiffViewerProps {
  mode: DiffMode;
  onModeChange?: (mode: DiffMode) => void;
}

export function DiffViewer({ mode, onModeChange }: DiffViewerProps) {
  const [textA, setTextA] = useState('');
  const [textB, setTextB] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showOnlyDiffs, setShowOnlyDiffs] = useState(false);
  const hasAutoDetectedRef = useRef(false);

  // Auto-detect content type when pasting in left panel
  useEffect(() => {
    // Only auto-detect when transitioning from empty to non-empty and haven't detected yet
    if (textA && !hasAutoDetectedRef.current && onModeChange) {
      const detectedType = detectContentType(textA);
      if (detectedType !== mode) {
        onModeChange(detectedType);
        hasAutoDetectedRef.current = true;
      }
    }
    // Reset detection flag when text becomes empty
    if (!textA) {
      hasAutoDetectedRef.current = false;
    }
  }, [textA, mode, onModeChange]);

  const leftScrollRef = useRef<HTMLTextAreaElement>(null);
  const rightScrollRef = useRef<HTMLTextAreaElement>(null);
  const diffScrollRef = useRef<HTMLDivElement>(null);

  // Synchronize scrolling logic encapsulated in a stable callback to avoid render-phase ref access
  const syncScroll = useCallback((source: 'left' | 'right' | 'diff', target: HTMLElement) => {
    const { scrollTop, scrollLeft } = target;

    if (source !== 'left' && leftScrollRef.current) {
      leftScrollRef.current.scrollTop = scrollTop;
      leftScrollRef.current.scrollLeft = scrollLeft;
    }
    if (source !== 'right' && rightScrollRef.current) {
      rightScrollRef.current.scrollTop = scrollTop;
      rightScrollRef.current.scrollLeft = scrollLeft;
    }
    if (source !== 'diff' && diffScrollRef.current) {
      diffScrollRef.current.scrollTop = scrollTop;
      diffScrollRef.current.scrollLeft = scrollLeft;
    }
  }, []);

  const handleLeftScroll = useCallback((e: React.UIEvent<HTMLTextAreaElement>) => {
    syncScroll('left', e.currentTarget);
  }, [syncScroll]);

  const handleRightScroll = useCallback((e: React.UIEvent<HTMLTextAreaElement>) => {
    syncScroll('right', e.currentTarget);
  }, [syncScroll]);

  const handleDiffScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    syncScroll('diff', e.currentTarget);
  }, [syncScroll]);

  const diff = useMemo(() => {
    let processedA = textA;
    let processedB = textB;

    if (textA || textB) {
      if (mode === 'json') {
        processedA = textA ? normalizeJson(textA) : '';
        processedB = textB ? normalizeJson(textB) : '';
      } else if (mode === 'jwt') {
        processedA = textA ? decodeAndNormalizeJwt(textA) : '';
        processedB = textB ? decodeAndNormalizeJwt(textB) : '';
      } else if (mode === 'curl') {
        processedA = textA ? normalizeCurl(textA) : '';
        processedB = textB ? normalizeCurl(textB) : '';
      }
    }

    return computeDiff(processedA, processedB);
  }, [textA, textB, mode]);

  // Extract expiration info for JWT mode
  const expirationA = useMemo(() => {
    if (mode !== 'jwt' || !textA) return null;
    try {
      const payload = decodeJWT(textA);
      return payload?.exp ? formatExpiration(payload.exp) : null;
    } catch {
      return null;
    }
  }, [mode, textA]);

  const expirationB = useMemo(() => {
    if (mode !== 'jwt' || !textB) return null;
    try {
      const payload = decodeJWT(textB);
      return payload?.exp ? formatExpiration(payload.exp) : null;
    } catch {
      return null;
    }
  }, [mode, textB]);

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-180px)]">
      <div className={clsx("grid grid-cols-2 gap-4 transition-all duration-300", isExpanded ? "hidden" : "h-1/2")}>
        <DiffPanel
          title="Origen (Panel A)"
          value={textA}
          onChange={setTextA}
          placeholder={`Pega aquí el contenido ${mode.toUpperCase()}...`}
          scrollRef={leftScrollRef}
          onScroll={handleLeftScroll}
        />
        <DiffPanel
          title="Destino (Panel B)"
          value={textB}
          onChange={setTextB}
          placeholder={`Pega aquí el contenido ${mode.toUpperCase()} a comparar...`}
          scrollRef={rightScrollRef}
          onScroll={handleRightScroll}
        />
      </div>

      <div className="flex-1 flex flex-col border rounded-xl bg-muted/5 shadow-sm overflow-hidden border-border/40 min-h-0 transition-all duration-300 hover:border-border/60">
        <div className="px-4 py-2 border-b bg-muted/20 border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--primary),0.3)]" />
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                Resultado de Comparación
              </h3>
            </div>
            {mode === 'jwt' && (expirationA || expirationB) && (
              <div className="flex items-center gap-3">
                {expirationA && (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-warning/10 text-warning border border-warning/20 text-[10px] font-bold uppercase tracking-wider shadow-[0_0_10px_rgba(var(--warning),0.05)]">
                    <Clock className="w-3 h-3" />
                    <span>A: {expirationA}</span>
                  </span>
                )}
                {expirationB && (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-warning/10 text-warning border border-warning/20 text-[10px] font-bold uppercase tracking-wider shadow-[0_0_10px_rgba(var(--warning),0.05)]">
                    <Clock className="w-3 h-3" />
                    <span>B: {expirationB}</span>
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowOnlyDiffs(!showOnlyDiffs)}
              className={clsx(
                "px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider border",
                showOnlyDiffs
                  ? "bg-primary/20 text-primary border-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.1)] ring-1 ring-primary/10"
                  : "text-muted-foreground/60 hover:text-foreground hover:bg-muted/40 border-transparent"
              )}
              title={showOnlyDiffs ? "Mostrar todas las líneas" : "Mostrar solo diferencias"}
            >
              <Filter className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Solo diffs</span>
            </button>
            <div className="w-px h-4 bg-border/40 mx-1" />
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-muted/40 transition-all border border-transparent active:scale-95"
              title={isExpanded ? "Restaurar" : "Expandir"}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div
          ref={diffScrollRef}
          onScroll={handleDiffScroll}
          className="flex-1 overflow-auto p-4 font-mono text-[13px] scrollbar-hide flex flex-col bg-zinc-950/20"
        >
          {!textA && !textB ? (
            <EmptyState
              icon={<GitCompare className="w-8 h-8 text-primary/20" />}
              label="Esperando entrada técnica"
              caption="Pega contenido en los paneles superiores para iniciar la comparación binaria."
              className="min-h-0 flex-1"
            />
          ) : (
            <div className="min-w-full inline-block">
              {diff
                .filter(line => !showOnlyDiffs || hasDiff(line))
                .map((line, idx) => (
                  <DiffLineRow key={idx} line={line} mode={mode} />
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function hasDiff(line: DiffLine): boolean {
  return (
    line.left?.type === 'removed' ||
    line.left?.type === 'changed' ||
    line.right?.type === 'added' ||
    line.right?.type === 'changed'
  );
}

function DiffLineRow({ line, mode }: { line: DiffLine; mode: DiffMode }) {
  const leftValue = line.left?.value;
  const highlightedLeft = useMemo(() => {
    if (!leftValue || mode === 'text') return leftValue || ' ';
    try {
      return highlight(leftValue);
    } catch {
      // Fallback seguro si falla el resaltado
      return escapeHtml(leftValue);
    }
  }, [leftValue, mode]);

  const rightValue = line.right?.value;
  const highlightedRight = useMemo(() => {
    if (!rightValue || mode === 'text') return rightValue || ' ';
    try {
      return highlight(rightValue);
    } catch {
      // Fallback seguro si falla el resaltado
      return escapeHtml(rightValue);
    }
  }, [rightValue, mode]);

  return (
    <div className="flex w-full group transition-colors duration-100 hover:bg-muted/5">
      {/* Left side */}
      <div className={clsx(
        "flex-1 flex border-r border-border/10 transition-colors",
        line.left?.type === 'removed' && "bg-destructive/20 text-destructive/90 shadow-[inset_4px_0_0_0_theme(colors.destructive.DEFAULT/0.4)]",
        line.left?.type === 'changed' && "bg-warning/20 text-warning/90 shadow-[inset_4px_0_0_0_theme(colors.warning.DEFAULT/0.4)]",
        !line.left && "bg-muted/5 opacity-40"
      )}>
        <span className="w-10 shrink-0 text-right pr-3 text-muted-foreground/30 select-none text-[10px] pt-0.5">
          {line.left?.lineNumber || ''}
        </span>
        <span className="w-4 shrink-0 flex justify-center select-none font-bold text-[11px] pt-0.5">
          {line.left?.type === 'removed' ? '-' : line.left?.type === 'changed' ? '!' : ''}
        </span>
        {mode !== 'text' && line.left?.value ? (
          <span
            className="whitespace-pre break-all px-2 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: highlightedLeft }}
          />
        ) : (
          <span className="whitespace-pre break-all px-2 leading-relaxed">
            {line.left?.value || ' '}
          </span>
        )}
      </div>

      {/* Right side */}
      <div className={clsx(
        "flex-1 flex transition-colors",
        line.right?.type === 'added' && "bg-success/20 text-success/90 shadow-[inset_4px_0_0_0_theme(colors.success.DEFAULT/0.4)]",
        line.right?.type === 'changed' && "bg-warning/20 text-warning/90 shadow-[inset_4px_0_0_0_theme(colors.warning.DEFAULT/0.4)]",
        !line.right && "bg-muted/5 opacity-40"
      )}>
        <span className="w-10 shrink-0 text-right pr-3 text-muted-foreground/30 select-none text-[10px] pt-0.5">
          {line.right?.lineNumber || ''}
        </span>
        <span className="w-4 shrink-0 flex justify-center select-none font-bold text-[11px] pt-0.5">
          {line.right?.type === 'added' ? '+' : line.right?.type === 'changed' ? '!' : ''}
        </span>
        {mode !== 'text' && line.right?.value ? (
          <span
            className="whitespace-pre break-all px-2 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: highlightedRight }}
          />
        ) : (
          <span className="whitespace-pre break-all px-2 leading-relaxed">
            {line.right?.value || ' '}
          </span>
        )}
      </div>
    </div>
  );
}
