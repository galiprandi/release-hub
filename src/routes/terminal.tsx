import { createFileRoute } from '@tanstack/react-router';
import { Terminal } from '@/components/shared/Terminal';
import { PageLayout } from '@/layouts/PageLayout';
import { Terminal as TerminalIcon } from 'lucide-react';

export const Route = createFileRoute('/terminal')({
  component: TerminalPage,
});

function TerminalPage() {
  return (
    <PageLayout
      header={{ title: "Terminal" }}
    >
      <div className="flex-1 flex flex-col min-h-0 bg-black rounded-xl overflow-hidden border border-border/40 shadow-2xl">
        <div className="flex items-center gap-2 px-4 py-2 bg-muted/40 border-b border-border/60">
            <TerminalIcon className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sesión Local</span>
        </div>
        <Terminal type="local" className="border-none rounded-none flex-1" />
      </div>
    </PageLayout>
  );
}
