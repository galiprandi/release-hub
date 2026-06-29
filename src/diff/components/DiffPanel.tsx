import React from 'react';
import { CopyButton } from '@/components/shared/CopyButton';

interface DiffPanelProps {
  title: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  onScroll: (e: React.UIEvent<HTMLTextAreaElement>) => void;
  scrollRef: React.RefObject<HTMLTextAreaElement | null>;
}

export function DiffPanel({
  title,
  value,
  onChange,
  placeholder,
  onScroll,
  scrollRef
}: DiffPanelProps) {
  return (
    <div className="flex flex-col h-full border rounded-xl bg-muted/10 shadow-sm overflow-hidden border-border/60 group">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/20 border-border/60">
        <div className="flex items-center gap-2">
          <div className="w-1 h-1 rounded-full bg-primary/40" />
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
            {title}
          </h3>
        </div>
        <CopyButton
          text={value}
          className="opacity-100! group-hover:opacity-100"
        />
      </div>
      <div className="relative flex-1">
        <textarea
          ref={scrollRef}
          onScroll={onScroll}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="absolute inset-0 w-full h-full p-4 text-xs font-mono bg-transparent border-none focus:ring-2 focus:ring-primary/20 outline-none resize-none z-10 overflow-auto scrollbar-hide"
          spellCheck={false}
        />
      </div>
    </div>
  );
}
