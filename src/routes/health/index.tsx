import { createFileRoute, Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { Activity, ExternalLink, ChevronDown, Box } from 'lucide-react';
import { useHealthMonitor } from '@/hooks/useHealthMonitor';
import { useUserCollections } from '@/hooks/useUserCollections';
import { Table } from '@/components/ui/Table';
import { EmptyState } from '@/components/EmptyState';
import { IndustrialTabs } from '@/components/shared/IndustrialTabs';
import type { ColumnDef } from '@tanstack/react-table';
import { PageLayout } from '../../layouts/PageLayout';
import DayJS from '@/lib/dayjs';
import { ActionButton, ACTION_DEFINITIONS } from '@/components/ui/ActionButton';

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

const FOCUS_RING = "focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1";

function InfoBanner() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-info/20 border border-info/20 rounded-xl overflow-hidden transition-all duration-200">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-info/20 transition-colors ${FOCUS_RING}`}
      >
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-info" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-info">Cómo funciona</span>
        </div>
        <ChevronDown className={`w-5 h-5 text-info transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {isExpanded && (
        <div className="px-4 pb-4">
          <div className="text-sm text-info/90 pt-2 border-t border-info/20">
            <ul className="space-y-1 list-disc list-inside">
              <li>Los endpoints se detectan automáticamente desde los pipelines de deploy</li>
              <li>Se verifica el endpoint <code className="bg-info/20 px-1 rounded font-mono">/health</code> en cada URL</li>
              <li>Los servicios se eliminan automáticamente cuando quitas un repo de favoritos</li>
            </ul>
          </div>
        </div>
      )}
    </div>
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
    <div className="bg-muted/10 rounded-xl border border-border/40 overflow-hidden shadow-sm transition-all duration-200">
      {/* Header del producto */}
      <div className="flex items-center justify-between bg-muted/40 border-b border-border/40 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Box className="w-4 h-4 text-primary" />
          </div>
          <div className="flex flex-col">
            <Link
              to="/github/$org/$repo"
              params={{ org, repo: productName }}
              className={`text-sm font-semibold tracking-tighter text-foreground hover:text-primary transition-colors ${FOCUS_RING} rounded-md px-1 -ml-1`}
            >
              {productName}
            </Link>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">{org} • {services.length} servicios</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(() => {
            const healthy = endpoints.filter((ep) => ep.isHealthy === true).length;
            const unhealthy = endpoints.filter((ep) => ep.isHealthy === false).length;
            const pending = endpoints.filter((ep) => ep.isHealthy === null).length;
            return (
              <>
                {healthy > 0 && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-success/20 border border-success/20 text-[10px] font-bold uppercase tracking-wider text-success shadow-sm shadow-success/10">
                    <div className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                    {healthy} OK
                  </span>
                )}
                {pending > 0 && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/20 border border-border/20 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                    {pending} Pendiente
                  </span>
                )}
                {unhealthy > 0 && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-destructive/20 border border-destructive/20 text-[10px] font-bold uppercase tracking-wider text-destructive shadow-sm shadow-destructive/10">
                    <div className="w-1.5 h-1.5 rounded-full bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
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
      header: "",
      cell: ({ row }) => <StatusCell endpoint={row.original} />,
    },
    {
      accessorKey: "service",
      header: "Ruta",
      cell: ({ row }) => <span className="font-medium tracking-tight text-foreground">{row.original.service || '/'}</span>,
    },
    {
      id: "environment",
      accessorFn: (row) => row.environment,
      header: "Ambiente",
      cell: ({ row }) => <EnvironmentCell endpoint={row.original} />,
    },
    {
      accessorKey: "lastChecked",
      header: "Verificado",
      cell: ({ row }) => <LastCheckedCell endpoint={row.original} />,
    },
    {
      accessorKey: "responseTime",
      header: "Tiempo",
      cell: ({ row }) => <ResponseTimeCell endpoint={row.original} />,
    },
    {
      accessorKey: "url",
      header: "URL",
      cell: ({ row }) => <UrlCell endpoint={row.original} />,
    },
    {
      accessorKey: "error",
      header: "Error",
      cell: ({ row }) => <ErrorCell endpoint={row.original} />,
    },
    {
      id: "actions",
      accessorKey: "actions",
      header: () => <span className="text-right block">Acciones</span>,
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
    <div className='px-1 py-1'>
      <Table
        columns={columns}
        data={endpoints}
        className="border-none shadow-none rounded-none bg-transparent"
      />
    </div>
  )
}

function StatusCell({ endpoint }: { endpoint: ReturnType<typeof useHealthMonitor>['endpoints'][0] }) {
  if (endpoint.isHealthy === null) return <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 ml-2" />
  if (endpoint.isHealthy === true) return <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.4)] ml-2" />
  return <div className="w-1.5 h-1.5 rounded-full bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.4)] ml-2" />
}

function EnvironmentCell({ endpoint }: { endpoint: ReturnType<typeof useHealthMonitor>['endpoints'][0] }) {
  const isProd = endpoint.environment === 'production';
  return (
    <span
      className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${
        isProd
          ? 'bg-primary/20 text-primary border-primary/20'
          : 'bg-info/20 text-info border-info/20'
      }`}
    >
      {endpoint.environment}
    </span>
  )
}

function ResponseTimeCell({ endpoint }: { endpoint: ReturnType<typeof useHealthMonitor>['endpoints'][0] }) {
  if (endpoint.responseTime !== undefined) {
    return (
      <span className={`text-[10px] font-bold uppercase tracking-wider ${endpoint.isHealthy ? 'text-success' : 'text-destructive'}`}>
        {endpoint.responseTime}ms
      </span>
    )
  }
  return <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/40">-</span>
}

function ErrorCell({ endpoint }: { endpoint: ReturnType<typeof useHealthMonitor>['endpoints'][0] }) {
  if (!endpoint.error) return <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/40">-</span>

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

  const truncatedMessage = errorMessage.length > 50 ? `${errorMessage.slice(0, 50)}...` : errorMessage

  return (
    <span className="text-[10px] font-bold uppercase tracking-wider text-destructive" title={errorMessage}>
      {truncatedMessage}
    </span>
  )
}

function LastCheckedCell({ endpoint }: { endpoint: ReturnType<typeof useHealthMonitor>['endpoints'][0] }) {
  return (
    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
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
        <span className="text-[10px] font-bold uppercase text-muted-foreground/60 leading-none truncate max-w-[250px]">
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
    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <ActionButton
        action={ACTION_DEFINITIONS.refresh}
        onClick={() => onCheckEndpoint(endpoint.id)}
        loading={isChecking}
        size="sm"
        tooltipSide="top"
      />
      <ActionButton
        action={ACTION_DEFINITIONS.copy}
        onClick={() => navigator.clipboard.writeText(endpoint.url)}
        size="sm"
        tooltipSide="top"
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

  // Dynamic counts for environment filters
  const envCounts = useMemo(() => {
    return {
      all: endpoints.length,
      staging: endpoints.filter(e => e.environment === 'staging').length,
      production: endpoints.filter(e => e.environment === 'production').length,
      unhealthy: endpoints.filter(e => e.isHealthy === false).length,
    };
  }, [endpoints]);

  // Filtrar endpoints según el filtro seleccionado
  const filteredEndpoints = useMemo(() => {
    return endpoints.filter((ep) => {
      if (environment === 'all') return true;
      if (environment === 'unhealthy') return ep.isHealthy === false;
      return ep.environment === environment;
    });
  }, [endpoints, environment]);

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
    <div className="flex gap-2">
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
          className="bg-destructive/10 border border-destructive/20"
        />
      )}
    </div>
  );

  return (
    <PageLayout 
      header={{
        title: (
          <div className="flex items-center gap-2">
            <span>Health Monitor</span>
            {isChecking && (
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" title="Revalidando..." />
            )}
          </div>
        )
      }}
      actions={[headerActions]}
      refreshFn={checkAllEndpoints}
    >
      <div className="space-y-6">
      {/* Filtros y Ordenamiento */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/10 p-4 rounded-xl border border-border/40">
        <div className="flex flex-col gap-2 w-full sm:w-auto">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 ml-1">Ambiente</span>
          <IndustrialTabs
            options={[
              { id: 'all', label: `Todos (${envCounts.all})` },
              { id: 'production', label: `Production (${envCounts.production})` },
              { id: 'staging', label: `Staging (${envCounts.staging})` },
              { id: 'unhealthy', label: `Con errores (${envCounts.unhealthy})` },
            ]}
            activeId={environment}
            onChange={handleEnvironmentChange}
            className="w-full sm:w-[540px]"
          />
        </div>
        <div className="flex flex-col gap-2 w-full sm:w-auto">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 ml-1">Ordenar por</span>
          <IndustrialTabs
            options={[
              { id: 'default', label: 'Nombre' },
              { id: 'errors', label: 'Errores' },
              { id: 'recent', label: 'Recientes' },
            ]}
            activeId={sortBy}
            onChange={handleSortChange}
            className="w-full sm:w-[320px]"
          />
        </div>
      </div>

      {/* Info banner - expandible */}
      <InfoBanner />

      {/* Endpoints by product */}
      {filteredEndpoints.length === 0 ? (
        <EmptyState
          icon={<Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground/20" />}
          label="Sin resultados"
          caption={environment === 'all'
            ? 'Navega a un producto favorito para detectar servicios automáticamente y comenzar el monitoreo.'
            : 'No hay servicios que coincidan con los filtros aplicados actualmente.'}
          action={environment === 'all' && (
            <Link
              to="/github"
              className={`inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm hover:opacity-90 transition-all ${FOCUS_RING}`}
            >
              <ExternalLink className="w-4 h-4" />
              Explorar Repositorios
            </Link>
          )}
        />
      ) : (
        <div className="space-y-6">
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
