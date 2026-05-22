import { createFileRoute } from '@tanstack/react-router';
import {
  Github,
  Database,
  Activity,
  Blocks,
  Send,
  Newspaper,
  MessageSquare,
  Settings,
  Search,
  Moon,
  Sun,
  Plus,
  MoreHorizontal,
  ExternalLink,
  Star,
  GitCommit,
  Tag
} from 'lucide-react';
import { useState, useEffect } from 'react';
import * as Tooltip from "@radix-ui/react-tooltip";

export const Route = createFileRoute('/v2')({
  component: V2Layout,
});

function V2Layout() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <div className="flex min-h-screen bg-background text-foreground transition-colors duration-200">
      {/* Aside Nav */}
      <aside className="w-[50px] h-screen sticky top-0 flex flex-col items-center py-4 bg-muted/30 border-r border-border/40 shrink-0">
        <div className="p-1.5 rounded-lg bg-primary/10 mb-4">
          <Github className="w-6 h-6 text-primary" />
        </div>

        <div className="w-6 h-px bg-border/60 mb-4" />

        <nav className="flex flex-col gap-4 flex-1">
          <NavIcon icon={Database} label="Repositorios" active />
          <NavIcon icon={Activity} label="Kubernetes" />
          <NavIcon icon={Blocks} label="Docker" />
          <NavIcon icon={Send} label="Fetcher" />

          <div className="flex-1" /> {/* Total separation */}

          <NavIcon icon={Newspaper} label="Novedades" />
          <NavIcon icon={MessageSquare} label="Feedback" />
          <NavIcon icon={Settings} label="Opciones" />
        </nav>

        <div className="mt-4">
          <a href="https://github.com" target="_blank" rel="noreferrer" className="block">
            <img
              src="https://github.com/identicons/jasonlong.png"
              alt="User"
              className="w-8 h-8 rounded-full border border-border/60 hover:border-primary/60 transition-colors"
            />
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header Bar */}
        <header className="h-[30px] sticky top-0 bg-background/80 backdrop-blur-sm border-b border-border/40 flex items-center justify-between px-4 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">Dashboard / Repositorios</span>

            <div className="relative group">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar... (CMD+F)"
                className="h-[20px] w-48 bg-muted/40 border-none rounded px-7 text-[10px] focus:ring-1 focus:ring-primary/30 transition-all outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="flex items-center gap-1.5 h-[20px] px-2 bg-primary text-primary-foreground rounded text-[10px] font-medium hover:bg-primary/90 transition-colors">
              <Plus className="w-3 h-3" />
              Nuevo Repo
            </button>
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              {isDark ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
            </button>
            <button className="p-1 text-muted-foreground hover:text-foreground transition-colors">
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Metrics/Widgets Bar */}
        <section className="h-[50px] bg-muted/10 border-b border-border/20 flex items-center px-4 gap-4 overflow-x-auto no-scrollbar shrink-0">
          <div className="flex items-center gap-3 bg-background/60 border border-border/30 rounded-lg px-3 py-1.5 shrink-0">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-tighter text-muted-foreground font-bold leading-none">SekiMonitor</span>
              <span className="text-[11px] font-medium leading-tight">API-Gateway: Healthy</span>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-background/60 border border-border/30 rounded-lg px-3 py-1.5 shrink-0">
            <div className="w-2 h-2 rounded-full bg-info animate-pulse" />
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-tighter text-muted-foreground font-bold leading-none">Pulse Monitor</span>
              <span className="text-[11px] font-medium leading-tight">Auth-Service: Syncing</span>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-background/60 border border-border/30 rounded-lg px-3 py-1.5 shrink-0">
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-tighter text-muted-foreground font-bold leading-none">System Load</span>
              <div className="flex items-center gap-1">
                <div className="h-1 w-12 bg-muted rounded-full overflow-hidden">
                  <div className="h-full w-1/3 bg-primary" />
                </div>
                <span className="text-[10px] font-medium">32%</span>
              </div>
            </div>
          </div>
        </section>

        {/* Data Section */}
        <section className="flex-1 overflow-auto p-4">
          <div className="bg-card rounded-xl border border-border/40 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b border-border/60">
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Repositorio</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Último Commit</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tag</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center">Estado</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                <RepoRow name="release-hub" commit="Merge pull request #12" author="galiprandi" tag="v1.2.4" status="success" />
                <RepoRow name="seki-api" commit="feat: add e2e tests for bff" author="jdoe" tag="v0.8.2" status="running" />
                <RepoRow name="pulsar-monitor" commit="fix: memory leak in logs" author="alex_smith" tag="v2.1.0" status="error" />
                <RepoRow name="yumi-ticket" commit="chore: update dependencies" author="m_garcia" tag="v1.0.5" status="success" />
                <RepoRow name="infra-k8s" commit="deploy: update configmap" author="sysadm" tag="v1.12.0" status="warning" />
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function NavIcon({ icon: Icon, label, active = false }: { icon: any, label: string, active?: boolean }) {
  return (
    <Tooltip.Provider delayDuration={0}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button className={`p-2 rounded-lg transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
            active
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          }`}>
            <Icon className="w-5 h-5" />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="right"
            sideOffset={10}
            className="bg-popover text-popover-foreground border px-2 py-1 rounded shadow-md text-[10px] font-medium z-50 animate-in fade-in zoom-in-95"
          >
            {label}
            <Tooltip.Arrow className="fill-popover" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

function RepoRow({ name, commit, author, tag, status }: { name: string, commit: string, author: string, tag: string, status: string }) {
  const statusColors = {
    success: 'bg-success/20 text-success border-success/30',
    running: 'bg-info/20 text-info border-info/30',
    error: 'bg-destructive/20 text-destructive border-destructive/30',
    warning: 'bg-warning/20 text-warning border-warning/30',
  };

  const statusLabels = {
    success: 'Healthy',
    running: 'Deploying',
    error: 'Failed',
    warning: 'Degraded',
  };

  return (
    <tr className="group hover:bg-muted/20 transition-colors">
      <td className="px-4 py-3">
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors cursor-pointer">{name}</span>
          <span className="text-[10px] text-muted-foreground">github.com/galiprandi/{name}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <GitCommit className="w-3.5 h-3.5 text-muted-foreground" />
          <div className="flex flex-col">
            <span className="text-[11px] font-medium truncate max-w-[200px]">{commit}</span>
            <span className="text-[9px] text-muted-foreground">por {author}</span>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <Tag className="w-3 h-3 text-muted-foreground" />
          <span className="text-[11px] font-mono font-medium bg-muted/60 px-1.5 py-0.5 rounded border border-border/40">{tag}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-center">
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${statusColors[status as keyof typeof statusColors]}`}>
            {statusLabels[status as keyof typeof statusLabels]}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors" title="Favorito">
            <Star className="w-3.5 h-3.5" />
          </button>
          <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors" title="Abrir en GitHub">
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}
