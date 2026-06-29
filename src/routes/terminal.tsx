import { createFileRoute } from '@tanstack/react-router';
import { Terminal } from '@/components/shared/Terminal';
import { PageLayout } from '@/layouts/PageLayout';
import { Terminal as TerminalIcon } from 'lucide-react';
import { detectOS } from '@/utils/os';

export const Route = createFileRoute('/terminal')({
  component: TerminalPage,
});

function TerminalPage() {
  const os = detectOS();
  const shell = os === 'Windows' ? 'powershell.exe' : os === 'macOS' ? 'zsh' : 'bash';

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
      <div className="flex-1 flex flex-col min-h-0 bg-zinc-950 rounded-xl overflow-hidden border border-border/40 shadow-2xl">
        <div className="flex items-center justify-between px-4 py-2.5 bg-muted/20 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Sesión Local Activa</span>
            </div>
            <div className="w-px h-3 bg-border/40" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/40 font-mono">/bin/{shell}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
               <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/40">Status</span>
               <span className="px-1.5 py-0.5 rounded bg-success/20 border border-success/20 text-[10px] font-bold text-success uppercase tracking-wider">Connected</span>
            </div>
            <div className="w-px h-3 bg-border/40" />
            <div className="flex items-center gap-1.5">
               <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/40">OS</span>
               <span className="px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary uppercase tracking-wider">{os}</span>
            </div>
          </div>
        </div>
        <Terminal type="local" className="border-none rounded-none flex-1" />
      </div>
    </PageLayout>
  );
}
