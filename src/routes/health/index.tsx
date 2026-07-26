import { createFileRoute, Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { Activity, ExternalLink, Box, HelpCircle, CheckCircle2 } from 'lucide-react';
import { useHealthMonitor } from '@/plugins/pipeline/seki/hooks/useHealthMonitor';
import { useUserCollections } from '@/hooks/useUserCollections';
import { Table } from '@/components/ui/Table';
import { EmptyState } from '@/components/shared/EmptyState';
import { IndustrialTabs } from '@/components/shared/IndustrialTabs';
import type { ColumnDef } from '@tanstack/react-table';
import { PageLayout } from '../../layouts/PageLayout';
import DayJS from '@/lib/dayjs';
import { ActionButton, ACTION_DEFINITIONS } from '@/components/ui/ActionButton';
import { BaseDialog } from '@/components/ui/BaseDialog';
import { CopyButton } from '@/components/shared/CopyButton';

export const Route = createFileRoute('/health/')({
  component: HealthMonitorPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      environment: typeof search.environment === 'string' ? search.environment : undefined,
      sortBy: (['default', 'errors', 'recent'].includes(search.sortBy as string)
        ? search.sortBy
        : undefined) as 'default' | 'errors' | 'recent' | undefined,
    };
  },
});

const FOCUS_RING = "focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none focus-visible:ring-offset-1";

function HealthHelpDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <BaseDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-primary" />
          <span>Health Monitor</span>
        </div>
      }
    >
      <div className="space-y-4 py-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          The Health Monitor tracks the availability of your services in real time.
        </p>

        <div className="space-y-3">
          <h4 className="text-xs font-medium text-muted-foreground">How it works</h4>
          <ul className="space-y-2">
            {[
              "Automatic endpoint detection from deployment pipelines",
              "Periodic health checks on the /health endpoint of each detected URL",
              "Automatic cleanup when repositories are removed from favorites",
              "Health state persistence for stability analysis"
            ].map((text, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <div className="mt-1.5 w-1 h-1 rounded-full bg-primary shrink-0" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-3 rounded-md bg-card border border-border">
          <p className="text-xs text-muted-foreground leading-relaxed italic">
            Tip: Filter by environment or error state from the header bar to focus your attention during incidents.
          </p>
        </div>
      </div>
    </BaseDialog>
  );
}

function ProductSection({
  product,
  endpoints,
  isChecking,
  onCheckEndpoint,
  onRemoveEndpoint,
}: {
  product: string;
  endpoints: ReturnType<typeof useHealthMonitor>['endpoints'];
  isChecking: boolean;
  onCheckEndpoint: (id: string) => void;
  onRemoveEndpoint: (id: string) => void;
}) {
  const [org, productName] = product.split('/');

  // Agrupar endpoints por servicio
  const endpointsByService = endpoints.reduce((acc, ep) => {
    const service = ep.service || '/';
    if (!acc[service]) {
      acc[service] = [];
    }
    acc[service].push(ep);
    return acc;
  }, {} as Record<string, typeof endpoints>);

  // Separar servicios con error primero
  const services = Object.keys(endpointsByService).sort((a, b) => {
    const aHasErrors = endpointsByService[a].some((ep) => ep.isHealthy === false);
    const bHasErrors = endpointsByService[b].some((ep) => ep.isHealthy === false);
    if (aHasErrors && !bHasErrors) return -1;
    if (!aHasErrors && bHasErrors) return 1;
    return a.localeCompare(b);
  });

  // Ordenar endpoints: production primero, luego staging
  const sortedEndpoints = [...endpoints].sort((a, b) => {
    if (a.environment !== b.environment) {
      return a.environment === 'production' ? -1 : 1;
    }
    return a.url.localeCompare(b.url);
  });

  return (
    <div className="bg-card rounded-md border border-border overflow-hidden shadow-sm">
      {/* Header del producto */}
      <div className="flex items-center justify-between bg-background border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
          <Box className="w-4 h-4 text-primary" />
          <Link
            to="/github/$org/$repo"
            params={{ org, repo: productName }}
            className={`font-medium tracking-tighter text-foreground hover:text-primary transition-colors ${FOCUS_RING} rounded-md px-1 -ml-1`}
          >
            {productName}
          </Link>
          <span className="text-xs font-medium text-muted-foreground">({services.length} servicios)</span>
        </div>
        <div className="flex items-center gap-2">
          {(() => {
            const healthy = endpoints.filter((ep) => ep.isHealthy === true).length;
            const unhealthy = endpoints.filter((ep) => ep.isHealthy === false).length;
            const pending = endpoints.filter((ep) => ep.isHealthy === null).length;
            return (
              <>
                {healthy > 0 && (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-success/20 border border-success/40 text-xs font-medium text-success">
                    <div className="w-2.5 h-2.5 rounded-full bg-success" />
                    {healthy} OK
                  </span>
                )}
                {pending > 0 && (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-card border border-border text-xs font-medium text-muted-foreground">
                    <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/40" />
                    {pending} Pendiente
                  </span>
                )}
                {unhealthy > 0 && (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-destructive/20 border border-destructive/40 text-xs font-medium text-destructive">
                    <div className="w-2.5 h-2.5 rounded-full bg-destructive" />
                    {unhealthy} Error
                  </span>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* Tabla de endpoints */}
      <EndpointsTable
        endpoints={sortedEndpoints}
        isChecking={isChecking}
        onCheckEndpoint={onCheckEndpoint}
        onRemoveEndpoint={onRemoveEndpoint}
      />
    </div>
  );
}

function EndpointsTable({
  endpoints,
  isChecking,
  onCheckEndpoint,
  onRemoveEndpoint,
}: {
  endpoints: ReturnType<typeof useHealthMonitor>['endpoints']
  isChecking: boolean
  onCheckEndpoint: (id: string) => void
  onRemoveEndpoint: (id: string) => void
}) {
  const columns: ColumnDef<(typeof endpoints)[0]>[] = [
    {
      id: "status",
      accessorFn: (row) => row.isHealthy,
      header: () => <span className="text-xs font-medium text-muted-foreground">Status</span>,
      cell: ({ row }) => <StatusCell endpoint={row.original} />,
    },
    {
      accessorKey: "service",
      header: () => <span className="text-xs font-medium text-muted-foreground">Ruta</span>,
      cell: ({ row }) => <span className="font-medium tracking-tight text-foreground">{row.original.service || '/'}</span>,
    },
    {
      id: "environment",
      accessorFn: (row) => row.environment,
      header: () => <span className="text-xs font-medium text-muted-foreground">Ambiente</span>,
      cell: ({ row }) => <EnvironmentCell endpoint={row.original} />,
    },
    {
      accessorKey: "lastChecked",
      header: () => <span className="text-xs font-medium text-muted-foreground">Verificado</span>,
      cell: ({ row }) => <LastCheckedCell endpoint={row.original} />,
    },
    {
      accessorKey: "responseTime",
      header: () => <span className="text-xs font-medium text-muted-foreground">Tiempo</span>,
      cell: ({ row }) => <ResponseTimeCell endpoint={row.original} />,
    },
    {
      accessorKey: "url",
      header: () => <span className="text-xs font-medium text-muted-foreground">URL</span>,
      cell: ({ row }) => <UrlCell endpoint={row.original} />,
    },
    {
      accessorKey: "error",
      header: () => <span className="text-xs font-medium text-muted-foreground">Error</span>,
      cell: ({ row }) => <ErrorCell endpoint={row.original} />,
    },
    {
      id: "actions",
      accessorKey: "actions",
      header: () => <span className="text-xs font-medium text-muted-foreground">Acciones</span>,
      enableSorting: false,
      cell: ({ row }) => (
        <ActionsCell
          endpoint={row.original}
          isChecking={isChecking}
          onCheckEndpoint={onCheckEndpoint}
          onRemoveEndpoint={onRemoveEndpoint}
        />
      ),
    },
  ]

  return (
    <div className='p-4'>
      <Table
        columns={columns}
        data={endpoints}
      />
    </div>
  )
}

function StatusCell({ endpoint }: { endpoint: ReturnType<typeof useHealthMonitor>['endpoints'][0] }) {
  if (endpoint.isHealthy === null) return <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/40" title="Pendiente" />
  if (endpoint.isHealthy === true) return <div className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" title="Healthy" />
  return <div className="w-2.5 h-2.5 rounded-full bg-destructive ring-2 ring-destructive/30" title="Error" />
}

function EnvironmentCell({ endpoint }: { endpoint: ReturnType<typeof useHealthMonitor>['endpoints'][0] }) {
  const isProd = endpoint.environment === 'production';
  return (
    <span
      className={`px-2 py-0.5 rounded-md border text-xs font-medium ${
        isProd
          ? 'bg-primary/20 text-primary border-primary/30'
          : 'bg-info/20 text-info border-info/40'
      }`}
    >
      {endpoint.environment}
    </span>
  )
}

function ResponseTimeCell({ endpoint }: { endpoint: ReturnType<typeof useHealthMonitor>['endpoints'][0] }) {
  if (endpoint.responseTime !== undefined) {
    // Performance thresholds decoupled from health status
    const rt = endpoint.responseTime
    const perfColor = rt < 200 ? 'text-success' : rt < 500 ? 'text-warning' : 'text-destructive'
    return (
      <span className={`text-xs font-medium ${perfColor}`} title={`${rt}ms`}>
        {rt}ms
      </span>
    )
  }
  return <span className="text-xs font-medium text-muted-foreground">-</span>
}

function ErrorCell({ endpoint }: { endpoint: ReturnType<typeof useHealthMonitor>['endpoints'][0] }) {
  const [expanded, setExpanded] = useState(false)

  if (!endpoint.error) return <span className="text-xs font-medium text-muted-foreground">-</span>

  const errorMessage = (() => {
    if (endpoint.details) {
      try {
        const parsed = JSON.parse(endpoint.details);
        return parsed.data || parsed.statusText || endpoint.error;
      } catch {
        return endpoint.error;
      }
    }
    return endpoint.error;
  })()

  const isLong = errorMessage.length > 50
  const displayMessage = isLong && !expanded ? `${errorMessage.slice(0, 50)}...` : errorMessage

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-destructive">
        {displayMessage}
      </span>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          {expanded ? "Ver menos" : "Ver más"}
        </button>
      )}
      {expanded && endpoint.details && (
        <pre className="text-xs font-mono text-muted-foreground bg-muted p-2 rounded-md mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap">
          {endpoint.details}
        </pre>
      )}
    </div>
  )
}

function LastCheckedCell({ endpoint }: { endpoint: ReturnType<typeof useHealthMonitor>['endpoints'][0] }) {
  const fullTimestamp = endpoint.lastChecked
    ? new Date(endpoint.lastChecked).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short',
      })
    : 'Unknown'
  return (
    <span className="text-xs font-medium text-muted-foreground" title={fullTimestamp}>
      {DayJS(endpoint.lastChecked).fromNow()}
    </span>
  )
}

function UrlCell({ endpoint }: { endpoint: ReturnType<typeof useHealthMonitor>['endpoints'][0] }) {
  let domain = '';
  let path = endpoint.url;

  try {
    const url = new URL(endpoint.url);
    domain = url.hostname;
    path = url.pathname + url.search;
  } catch {
    // Fallback for invalid URLs
  }

  return (
    <div className="flex flex-col gap-0.5" title={endpoint.url}>
      {domain && (
        <span className="text-xs font-medium text-muted-foreground leading-none truncate max-w-[250px]">
          {domain}
        </span>
      )}
      <span className="text-xs font-mono text-foreground leading-none truncate max-w-[250px]">
        {path}
      </span>
    </div>
  )
}

function ActionsCell({
  endpoint,
  isChecking,
  onCheckEndpoint,
  onRemoveEndpoint,
}: {
  endpoint: ReturnType<typeof useHealthMonitor>['endpoints'][0]
  isChecking: boolean
  onCheckEndpoint: (id: string) => void
  onRemoveEndpoint: (id: string) => void
}) {
  return (
    <div className="flex items-center gap-1">
      <ActionButton
        action={ACTION_DEFINITIONS.refresh}
        onClick={() => onCheckEndpoint(endpoint.id)}
        loading={isChecking}
        size="sm"
        tooltipSide="top"
      />
      <CopyButton
        text={endpoint.url}
        tooltip="Copiar URL"
        className="opacity-100 hover:bg-accent focus-visible:ring-offset-1"
      />
      <ActionButton
        action={ACTION_DEFINITIONS.link}
        onClick={() => window.open(endpoint.url.endsWith('/') ? `${endpoint.url}health` : `${endpoint.url}/health`, '_blank')}
        size="sm"
        tooltipSide="top"
      />
      <ActionButton
        action={ACTION_DEFINITIONS.delete}
        onClick={() => onRemoveEndpoint(endpoint.id)}
        size="sm"
        tooltipSide="top"
      />
    </div>
  )
}

function HealthMonitorPage() {
  const {
    endpoints,
    checkAllEndpoints,
    checkEndpoint,
    removeEndpoint,
    removeProductEndpoints,
    isChecking,
    stats,
  } = useHealthMonitor();

  const { favorites } = useUserCollections();
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const navigate = useNavigate();
  const search = useSearch({ from: '/health/' });

  const sortBy = (search.sortBy as 'default' | 'errors' | 'recent') || 'default';
  const environment = search.environment || 'all';

  const handleSortChange = useCallback((newSort: string) => {
    navigate({
      to: '.',
      search: (prev: Record<string, unknown>) => ({ ...prev, sortBy: newSort }),
    });
  }, [navigate]);

  const handleEnvironmentChange = useCallback((newEnv: string) => {
    navigate({
      to: '.',
      search: (prev: Record<string, unknown>) => ({
        ...prev,
        environment: newEnv === 'all' ? undefined : newEnv
      }),
    });
  }, [navigate]);

  // Derivar filtro activo de query params
  const activeFilter = useMemo(() => {
    if (!search.environment || search.environment === 'all') return null;
    if (search.environment === 'staging' || search.environment === 'production') {
      return { id: 'environment', value: search.environment };
    }
    if (search.environment === 'unhealthy') {
      return { id: 'status', value: 'false' };
    }
    return null;
  }, [search.environment]);

  // Filtrar endpoints según el filtro seleccionado
  const filteredEndpoints = endpoints.filter((ep) => {
    if (!activeFilter) return true;
    if (activeFilter.id === 'environment' && ep.environment !== activeFilter.value) return false;
    if (activeFilter.id === 'status' && ep.isHealthy !== (activeFilter.value === 'false' ? false : true)) return false;
    return true;
  });

  // Auto-check on mount
  useEffect(() => {
    const pending = endpoints.filter((ep) => ep.isHealthy === null);
    if (pending.length > 0) {
      pending.forEach((ep) => checkEndpoint(ep.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh periódico cada 10 minutos
  useEffect(() => {
    const interval = setInterval(() => {
      checkAllEndpoints();
    }, 10 * 60 * 1000); // 10 minutos

    return () => clearInterval(interval);
  }, [checkAllEndpoints]);

  // Cleanup endpoints from removed favorites
  useEffect(() => {
    const productsWithEndpoints = new Set(endpoints.map((ep) => ep.product));
    const favoriteSet = new Set(favorites);

    productsWithEndpoints.forEach((product) => {
      if (!favoriteSet.has(product)) {
        removeProductEndpoints(product);
      }
    });
  }, [favorites, endpoints, removeProductEndpoints]);

  // Agrupar endpoints por producto
  const endpointsByProduct = filteredEndpoints.reduce((acc, ep) => {
    if (!acc[ep.product]) {
      acc[ep.product] = [];
    }
    acc[ep.product].push(ep);
    return acc;
  }, {} as Record<string, typeof filteredEndpoints>);

  // Ordenar productos: primero los que tienen endpoints con error
  const sortedProducts = Object.keys(endpointsByProduct).sort((a, b) => {
    if (sortBy === 'errors') {
      const aHasErrors = endpointsByProduct[a].some((ep) => ep.isHealthy === false);
      const bHasErrors = endpointsByProduct[b].some((ep) => ep.isHealthy === false);
      if (aHasErrors && !bHasErrors) return -1;
      if (!aHasErrors && bHasErrors) return 1;
    }
    
    if (sortBy === 'recent') {
      const aLatest = new Date(Math.max(...endpointsByProduct[a].map((ep) => new Date(ep.lastChecked).getTime())));
      const bLatest = new Date(Math.max(...endpointsByProduct[b].map((ep) => new Date(ep.lastChecked).getTime())));
      return bLatest.getTime() - aLatest.getTime();
    }

    return a.localeCompare(b);
  });

  const headerActions = (
    <div key="header-actions" className="flex gap-2">
      <ActionButton
        action={{
          icon: HelpCircle,
          label: "Ayuda",
          color: "default"
        }}
        onClick={() => setIsHelpOpen(true)}
        size="md"
        className="bg-background hover:bg-muted/30"
      />
      <div className="w-px h-6 bg-border mx-1" />
      {stats.unhealthy > 0 && (
        <ActionButton
          action={{
            ...ACTION_DEFINITIONS.refresh,
            label: isChecking ? 'Verificando...' : `Verificar ${stats.unhealthy}`,
            color: "destructive"
          }}
          onClick={() => {
            const unhealthy = filteredEndpoints.filter((ep) => ep.isHealthy === false);
            unhealthy.forEach((ep) => checkEndpoint(ep.id));
          }}
          loading={isChecking}
          showLabel
          className="bg-destructive/15 border border-destructive/40"
        />
      )}
    </div>
  );

  const envOptions = useMemo(() => {
    const stagingCount = endpoints.filter(e => e.environment === 'staging').length;
    const productionCount = endpoints.filter(e => e.environment === 'production').length;
    const unhealthyCount = endpoints.filter(e => e.isHealthy === false).length;

    return [
      { id: 'all', label: 'Todos' },
      { id: 'production', label: `Production (${productionCount})` },
      { id: 'staging', label: `Staging (${stagingCount})` },
      { id: 'unhealthy', label: `Unhealthy (${unhealthyCount})` },
    ];
  }, [endpoints]);

  return (
    <PageLayout
      header={{
        title: (
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <span>Health Monitor</span>
            {isChecking && (
              <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" title="Revalidando..." />
            )}
          </div>
        ),
        searchComponent: (
          <div className="flex items-center gap-2">
            <IndustrialTabs
              options={envOptions}
              activeId={environment}
              onChange={handleEnvironmentChange}
              className="w-96"
            />
            <div className="w-px h-6 bg-border mx-1" />
            <IndustrialTabs
              options={[
                { id: 'default', label: 'Nombre' },
                { id: 'errors', label: 'Errores' },
                { id: 'recent', label: 'Recientes' },
              ]}
              activeId={sortBy}
              onChange={handleSortChange}
              className="w-96"
            />
          </div>
        )
      }}
      actions={[headerActions]}
      refreshFn={checkAllEndpoints}
    >
      <div className="space-y-6">
      <HealthHelpDialog open={isHelpOpen} onOpenChange={setIsHelpOpen} />

      {/* All systems operational banner */}
      {filteredEndpoints.length > 0 && stats.unhealthy === 0 && stats.pending === 0 && (
        <div className="flex items-center gap-3 p-3 rounded-md border border-success/30 bg-success/15">
          <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
          <div>
            <span className="text-sm font-medium text-foreground">All systems operational</span>
            <span className="text-xs text-muted-foreground ml-2">{stats.healthy} endpoint{stats.healthy !== 1 ? 's' : ''} healthy</span>
          </div>
        </div>
      )}

      {/* Endpoints by product */}
      {filteredEndpoints.length === 0 ? (
        <EmptyState
          icon={<Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />}
          label="Sin resultados"
          caption={!activeFilter
            ? 'Navega a un producto favorito para detectar servicios automáticamente y comenzar el monitoreo.'
            : 'No hay servicios que coincidan con los filtros aplicados actualmente.'}
          action={!activeFilter && (
            <Link
              to="/github"
              className={`inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground text-xs font-medium rounded-md shadow-sm hover:opacity-90 transition-all ${FOCUS_RING}`}
            >
              <ExternalLink className="w-4 h-4" />
              Explorar Repositorios
            </Link>
          )}
        />
      ) : (
        <div className="space-y-4">
          {sortedProducts.map((product) => (
            <ProductSection
              key={product}
              product={product}
              endpoints={endpointsByProduct[product]}
              isChecking={isChecking}
              onCheckEndpoint={checkEndpoint}
              onRemoveEndpoint={removeEndpoint}
            />
          ))}
        </div>
      )}
      </div>
    </PageLayout>
  );
}
