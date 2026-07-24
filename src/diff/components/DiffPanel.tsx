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
    <div className="flex flex-col h-full border rounded-xl bg-muted/5 shadow-sm overflow-hidden border-border/40 group transition-all duration-200 hover:border-border/60">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/20 border-border/40">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-primary/40 shadow-[0_0_8px_rgba(var(--primary),0.2)]" />
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
            {title}
          </h3>
        </div>
        <CopyButton
          text={value}
          className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity"
        />
      </div>
      <div className="relative flex-1 bg-zinc-950/20">
        <textarea
          ref={scrollRef}
          onScroll={onScroll}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="absolute inset-0 w-full h-full p-4 text-[13px] font-mono bg-transparent border-none focus:ring-2 focus:ring-primary/20 outline-none resize-none z-10 overflow-auto scrollbar-hide text-foreground/90 placeholder:text-muted-foreground/30"
          spellCheck={false}
        />
      </div>
    </div>
  );
}
