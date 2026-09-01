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
import { IconButton } from '@/components/shared/IconButton';

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
  const diffLeftScrollRef = useRef<HTMLDivElement>(null);
  const diffRightScrollRef = useRef<HTMLDivElement>(null);

  // Synchronize scrolling logic encapsulated in a stable callback to avoid render-phase ref access
  const syncScroll = useCallback((source: 'left' | 'right' | 'diffLeft' | 'diffRight', target: HTMLElement) => {
    const { scrollTop, scrollLeft } = target;

    if (source !== 'left' && leftScrollRef.current) {
      leftScrollRef.current.scrollTop = scrollTop;
      leftScrollRef.current.scrollLeft = scrollLeft;
    }
    if (source !== 'right' && rightScrollRef.current) {
      rightScrollRef.current.scrollTop = scrollTop;
      rightScrollRef.current.scrollLeft = scrollLeft;
    }
    if (source !== 'diffLeft' && diffLeftScrollRef.current) {
      diffLeftScrollRef.current.scrollTop = scrollTop;
      diffLeftScrollRef.current.scrollLeft = scrollLeft;
    }
    if (source !== 'diffRight' && diffRightScrollRef.current) {
      diffRightScrollRef.current.scrollTop = scrollTop;
      diffRightScrollRef.current.scrollLeft = scrollLeft;
    }
  }, []);

  const handleLeftScroll = useCallback((e: React.UIEvent<HTMLTextAreaElement>) => {
    syncScroll('left', e.currentTarget);
  }, [syncScroll]);

  const handleRightScroll = useCallback((e: React.UIEvent<HTMLTextAreaElement>) => {
    syncScroll('right', e.currentTarget);
  }, [syncScroll]);

  const handleDiffLeftScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    syncScroll('diffLeft', e.currentTarget);
  }, [syncScroll]);

  const handleDiffRightScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    syncScroll('diffRight', e.currentTarget);
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
      <div
        data-testid="diff-panels"
        className={clsx("grid grid-cols-2 gap-4 transition-all duration-300", isExpanded ? "hidden" : "h-1/2")}
      >
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

      {/* Result toolbar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <h3 className="text-xs font-medium text-muted-foreground">
              Resultado de Comparación
            </h3>
          </div>
          {mode === 'jwt' && (expirationA || expirationB) && (
            <div className="flex items-center gap-3">
              {expirationA && (
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-warning/10 text-warning border border-warning/30 text-xs font-medium">
                  <Clock className="w-3 h-3" />
                  <span>A: {expirationA}</span>
                </span>
              )}
              {expirationB && (
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-warning/10 text-warning border border-warning/30 text-xs font-medium">
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
              "px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 text-xs font-medium border",
              showOnlyDiffs
                ? "bg-primary/20 text-primary border-primary/30 shadow-sm ring-1 ring-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-card border-transparent"
            )}
            title={showOnlyDiffs ? "Mostrar todas las líneas" : "Mostrar solo diferencias"}
          >
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Solo diffs</span>
          </button>
          <div className="w-px h-4 bg-border mx-1" />
          <IconButton
            onClick={() => setIsExpanded(!isExpanded)}
            icon={isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            tooltip={isExpanded ? "Restaurar" : "Expandir"}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-card active:scale-95 border border-transparent"
          />
        </div>
      </div>

      {/* Result: two cards side by side */}
      <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
        <div className="flex flex-col border rounded-md bg-card shadow-sm overflow-hidden border-border">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
            <div className="w-1.5 h-1.5 rounded-full bg-destructive/60" />
            <h4 className="text-xs font-medium text-muted-foreground">Origen</h4>
          </div>
          <div
            ref={diffLeftScrollRef}
            onScroll={handleDiffLeftScroll}
            className="flex-1 overflow-auto p-4 font-mono text-xs scrollbar-hide flex flex-col bg-card"
          >
            {!textA && !textB ? (
              <EmptyState
                icon={<GitCompare className="w-8 h-8 text-primary/20" />}
                label="Esperando entrada técnica"
                caption="Pega contenido en los paneles superiores para iniciar la comparación."
                className="min-h-0 flex-1"
              />
            ) : (
              <div className="min-w-full inline-block">
                {diff
                  .filter(line => !showOnlyDiffs || hasDiff(line))
                  .map((line, idx) => (
                    <DiffSideRow key={idx} side="left" line={line} mode={mode} />
                  ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col border rounded-md bg-card shadow-sm overflow-hidden border-border">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
            <div className="w-1.5 h-1.5 rounded-full bg-success/60" />
            <h4 className="text-xs font-medium text-muted-foreground">Destino</h4>
          </div>
          <div
            ref={diffRightScrollRef}
            onScroll={handleDiffRightScroll}
            className="flex-1 overflow-auto p-4 font-mono text-xs scrollbar-hide flex flex-col bg-card"
          >
            {!textA && !textB ? (
              <EmptyState
                icon={<GitCompare className="w-8 h-8 text-primary/20" />}
                label="Esperando entrada técnica"
                caption="Pega contenido en los paneles superiores para iniciar la comparación."
                className="min-h-0 flex-1"
              />
            ) : (
              <div className="min-w-full inline-block">
                {diff
                  .filter(line => !showOnlyDiffs || hasDiff(line))
                  .map((line, idx) => (
                    <DiffSideRow key={idx} side="right" line={line} mode={mode} />
                  ))}
              </div>
            )}
          </div>
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

function DiffSideRow({ side, line, mode }: { side: 'left' | 'right'; line: DiffLine; mode: DiffMode }) {
  const result = side === 'left' ? line.left : line.right;
  const value = result?.value;

  const highlighted = useMemo(() => {
    if (!value || mode === 'text') return value || ' ';
    try {
      return highlight(value);
    } catch {
      return escapeHtml(value);
    }
  }, [value, mode]);

  return (
    <div className={clsx(
      "flex w-full transition-colors duration-100",
      result?.type === 'removed' && "bg-destructive/20 text-destructive border-l-2 border-destructive/40",
      result?.type === 'added' && "bg-success/20 text-success/90 border-l-2 border-success/40",
      result?.type === 'changed' && "bg-warning/20 text-warning/90 border-l-2 border-warning/40",
      !result && "opacity-40"
    )}>
      <span className="w-10 shrink-0 text-right pr-3 text-muted-foreground/30 select-none text-xs pt-0.5">
        {result?.lineNumber || ''}
      </span>
      <span className="w-4 shrink-0 flex justify-center select-none font-bold text-xs pt-0.5">
        {result?.type === 'removed' ? '-' : result?.type === 'added' ? '+' : result?.type === 'changed' ? '!' : ''}
      </span>
      {mode !== 'text' && result?.value ? (
        <span
          className="whitespace-pre break-all px-2 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      ) : (
        <span className="whitespace-pre break-all px-2 leading-relaxed">
          {result?.value || ' '}
        </span>
      )}
    </div>
  );
}
