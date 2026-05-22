import { createFileRoute } from '@tanstack/react-router';
import { AppLayout } from '../layouts/AppLayout';
import {
  ExternalLink,
  Star,
  GitCommit,
  Tag
} from 'lucide-react';

export const Route = createFileRoute('/v2')({
  component: V2Page,
});

function V2Page() {
  return (
    <AppLayout 
      title="Repositorios"
      headerActions={
        <button className="flex items-center gap-1.5 h-9 px-3 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
          Nuevo Repo
        </button>
      }
    >
      {/* Metrics/Widgets Bar */}
      <section aria-label="Widgets del sistema">
        <article className="h-16 bg-muted/10 border-border/20 flex items-center gap-4 overflow-x-auto no-scrollbar shrink-0">
          <div className="flex items-center gap-3 bg-background/60 border border-border/30 rounded-lg px-4 py-2 shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" aria-hidden="true" />
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-tighter text-muted-foreground font-bold leading-none">SekiMonitor</span>
              <span className="text-sm font-medium leading-tight">API-Gateway: Healthy</span>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-background/60 border border-border/30 rounded-lg px-4 py-2 shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-info animate-pulse" aria-hidden="true" />
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-tighter text-muted-foreground font-bold leading-none">Pulse Monitor</span>
              <span className="text-sm font-medium leading-tight">Auth-Service: Syncing</span>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-background/60 border border-border/30 rounded-lg px-4 py-2 shrink-0">
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-tighter text-muted-foreground font-bold leading-none">System Load</span>
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden" aria-hidden="true">
                  <div className="h-full w-1/3 bg-primary" />
                </div>
                <span className="text-xs font-medium">32%</span>
              </div>
            </div>
          </div>
        </article>
      </section>

      {/* Data Section */}
      <section className="flex-1 overflow-auto" aria-labelledby="repos-heading">
        <h2 id="repos-heading" className="sr-only">Lista de repositorios</h2>
        <div className="bg-card rounded-xl border border-border/40 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b border-border/60">
                <th scope="col" className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Repositorio</th>
                <th scope="col" className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Último Commit</th>
                <th scope="col" className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Tag</th>
                <th scope="col" className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">Estado</th>
                <th scope="col" className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              <RepoRow name="release-hub" commit="Merge pull request #12" author="galiprandi" tag="v1.2.4" status="success" />
              <RepoRow name="seki-api" commit="feat: add e2e tests for bff" author="jdoe" tag="v0.8.2" status="running" />
              <RepoRow name="pulsar-monitor" commit="fix: memory leak in logs" author="alex_smith" tag="v2.1.0" status="error" />
              <RepoRow name="yumi-ticket" commit="chore: update dependencies" author="m_garcia" tag="v1.0.5" status="success" />
              <RepoRow name="infra-k8s" commit="deploy: update configmap" author="sysadm" tag="v1.12.0" status="warning" />
              {/* Duplicates for scroll testing */}
              <RepoRow name="release-hub" commit="Merge pull request #12" author="galiprandi" tag="v1.2.4" status="success" />
              <RepoRow name="seki-api" commit="feat: add e2e tests for bff" author="jdoe" tag="v0.8.2" status="running" />
              <RepoRow name="pulsar-monitor" commit="fix: memory leak in logs" author="alex_smith" tag="v2.1.0" status="error" />
              <RepoRow name="yumi-ticket" commit="chore: update dependencies" author="m_garcia" tag="v1.0.5" status="success" />
              <RepoRow name="infra-k8s" commit="deploy: update configmap" author="sysadm" tag="v1.12.0" status="warning" />
              <RepoRow name="release-hub" commit="Merge pull request #12" author="galiprandi" tag="v1.2.4" status="success" />
              <RepoRow name="seki-api" commit="feat: add e2e tests for bff" author="jdoe" tag="v0.8.2" status="running" />
              <RepoRow name="pulsar-monitor" commit="fix: memory leak in logs" author="alex_smith" tag="v2.1.0" status="error" />
              <RepoRow name="yumi-ticket" commit="chore: update dependencies" author="m_garcia" tag="v1.0.5" status="success" />
              <RepoRow name="infra-k8s" commit="deploy: update configmap" author="sysadm" tag="v1.12.0" status="warning" />
              <RepoRow name="release-hub" commit="Merge pull request #12" author="galiprandi" tag="v1.2.4" status="success" />
              <RepoRow name="seki-api" commit="feat: add e2e tests for bff" author="jdoe" tag="v0.8.2" status="running" />
              <RepoRow name="pulsar-monitor" commit="fix: memory leak in logs" author="alex_smith" tag="v2.1.0" status="error" />
              <RepoRow name="yumi-ticket" commit="chore: update dependencies" author="m_garcia" tag="v1.0.5" status="success" />
              <RepoRow name="infra-k8s" commit="deploy: update configmap" author="sysadm" tag="v1.12.0" status="warning" />
              <RepoRow name="release-hub" commit="Merge pull request #12" author="galiprandi" tag="v1.2.4" status="success" />
              <RepoRow name="seki-api" commit="feat: add e2e tests for bff" author="jdoe" tag="v0.8.2" status="running" />
              <RepoRow name="pulsar-monitor" commit="fix: memory leak in logs" author="alex_smith" tag="v2.1.0" status="error" />
              <RepoRow name="yumi-ticket" commit="chore: update dependencies" author="m_garcia" tag="v1.0.5" status="success" />
              <RepoRow name="infra-k8s" commit="deploy: update configmap" author="sysadm" tag="v1.12.0" status="warning" />
              <RepoRow name="release-hub" commit="Merge pull request #12" author="galiprandi" tag="v1.2.4" status="success" />
              <RepoRow name="seki-api" commit="feat: add e2e tests for bff" author="jdoe" tag="v0.8.2" status="running" />
              <RepoRow name="pulsar-monitor" commit="fix: memory leak in logs" author="alex_smith" tag="v2.1.0" status="error" />
              <RepoRow name="yumi-ticket" commit="chore: update dependencies" author="m_garcia" tag="v1.0.5" status="success" />
              <RepoRow name="infra-k8s" commit="deploy: update configmap" author="sysadm" tag="v1.12.0" status="warning" />
            </tbody>
          </table>
        </div>
      </section>
    </AppLayout>
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
          <span className="text-base font-semibold text-foreground group-hover:text-primary transition-colors cursor-pointer">{name}</span>
          <span className="text-xs text-muted-foreground">github.com/galiprandi/{name}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <GitCommit className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <div className="flex flex-col">
            <span className="text-sm font-medium truncate max-w-[200px]">{commit}</span>
            <span className="text-xs text-muted-foreground">por {author}</span>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <Tag className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <span className="text-sm font-mono font-medium bg-muted/60 px-2 py-0.5 rounded border border-border/40">{tag}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-center">
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${statusColors[status as keyof typeof statusColors]}`}>
            {statusLabels[status as keyof typeof statusLabels]}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors" title="Favorito" aria-label={`Agregar ${name} a favoritos`}>
            <Star className="w-4 h-4" aria-hidden="true" />
          </button>
          <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors" title="Abrir en GitHub" aria-label={`Abrir ${name} en GitHub`}>
            <ExternalLink className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </td>
    </tr>
  );
}
