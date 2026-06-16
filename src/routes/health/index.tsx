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
    <div className="bg-info/10 border border-info/20 rounded-xl overflow-hidden transition-all duration-200">
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
  activeFilter,
  onFilterChange,
}: {
  product: string;
  endpoints: ReturnType<typeof useHealthMonitor>['endpoints'];
  isChecking: boolean;
  onCheckEndpoint: (id: string) => void;
  onRemoveEndpoint: (id: string) => void;
  activeFilter?: { id: string; value: string } | null
  onFilterChange?: (filter: { id: string; value: string } | null) => void
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
  const sortedEndpoints = endpoints.sort((a, b) => {
    if (a.environment !== b.environment) {
      return a.environment === 'production' ? -1 : 1;
    }
    return a.url.localeCompare(b.url);
  });

  return (
    <div className="bg-muted/10 rounded-xl border border-border/40 overflow-hidden shadow-sm">
      {/* Header del producto */}
      <div className="flex items-center justify-between bg-muted/20 border-b border-border/40 px-4 py-2">
        <div className="flex items-center gap-2">
          <Box className="w-4 h-4 text-primary/60" />
          <Link
            to="/github/$org/$repo"
            params={{ org, repo: productName }}
            className={`font-medium tracking-tighter text-foreground hover:text-primary transition-colors ${FOCUS_RING} rounded-md px-1 -ml-1`}
          >
            {productName}
          </Link>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">({services.length} servicios)</span>
        </div>
        <div className="flex items-center gap-2">
          {(() => {
            const healthy = endpoints.filter((ep) => ep.isHealthy === true).length;
            const unhealthy = endpoints.filter((ep) => ep.isHealthy === false).length;
            const pending = endpoints.filter((ep) => ep.isHealthy === null).length;
            return (
              <>
                {healthy > 0 && (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-success/20 border border-success/20 text-[10px] font-bold uppercase tracking-wider text-success">
                    <div className="w-1.5 h-1.5 rounded-full bg-success" />
                    {healthy} OK
                  </span>
                )}
                {pending > 0 && (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted/20 border border-border/20 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                    {pending} Pendiente
                  </span>
                )}
                {unhealthy > 0 && (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-destructive/20 border border-destructive/20 text-[10px] font-bold uppercase tracking-wider text-destructive">
                    <div className="w-1.5 h-1.5 rounded-full bg-destructive" />
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
        activeFilter={activeFilter}
        onFilterChange={onFilterChange}
      />
    </div>
  );
}

function EndpointsTable({
  endpoints,
  isChecking,
  onCheckEndpoint,
  onRemoveEndpoint,
  activeFilter,
  onFilterChange,
}: {
  endpoints: ReturnType<typeof useHealthMonitor>['endpoints']
  isChecking: boolean
  onCheckEndpoint: (id: string) => void
  onRemoveEndpoint: (id: string) => void
  activeFilter?: { id: string; value: string } | null
  onFilterChange?: (filter: { id: string; value: string } | null) => void
}) {
  const columns: ColumnDef<(typeof endpoints)[0]>[] = [
    {
      id: "status",
      accessorFn: (row) => row.isHealthy,
      header: () => <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Status</span>,
      cell: ({ row }) => <StatusCell endpoint={row.original} />,
      filterFn: (row, columnId, filterValue) => {
        const value = row.getValue(columnId);
        return value === (filterValue === 'false' ? false : filterValue);
      },
    },
    {
      accessorKey: "service",
      header: () => <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Ruta</span>,
      cell: ({ row }) => <span className="font-medium tracking-tight text-foreground">{row.original.service || '/'}</span>,
    },
    {
      id: "environment",
      accessorFn: (row) => row.environment,
      header: () => <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Ambiente</span>,
      cell: ({ row }) => <EnvironmentCell endpoint={row.original} />,
      filterFn: 'equalsString',
    },
    {
      accessorKey: "lastChecked",
      header: () => <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Verificado</span>,
      cell: ({ row }) => <LastCheckedCell endpoint={row.original} />,
    },
    {
      accessorKey: "responseTime",
      header: () => <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Tiempo</span>,
      cell: ({ row }) => <ResponseTimeCell endpoint={row.original} />,
    },
    {
      accessorKey: "url",
      header: () => <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">URL</span>,
      cell: ({ row }) => <UrlCell endpoint={row.original} />,
    },
    {
      accessorKey: "error",
      header: () => <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Error</span>,
      cell: ({ row }) => <ErrorCell endpoint={row.original} />,
    },
    {
      id: "actions",
      accessorKey: "actions",
      header: () => <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Acciones</span>,
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

  const filters = useMemo(() => {
    const stagingCount = endpoints.filter(e => e.environment === 'staging').length;
    const productionCount = endpoints.filter(e => e.environment === 'production').length;
    const unhealthyCount = endpoints.filter(e => e.isHealthy === false).length;

    return [
      { label: 'Staging', columnId: 'environment', value: 'staging', count: stagingCount },
      { label: 'Production', columnId: 'environment', value: 'production', count: productionCount },
      { label: 'Con errores', columnId: 'status', value: 'false', count: unhealthyCount },
    ];
  }, [endpoints]);

  return (
    <div className='p-4'>
    <Table
      columns={columns}
      data={endpoints}
      filters={filters}
      activeFilter={activeFilter}
      onFilterChange={onFilterChange}
      />
      </div>
  )
}

function StatusCell({ endpoint }: { endpoint: ReturnType<typeof useHealthMonitor>['endpoints'][0] }) {
  if (endpoint.isHealthy === null) return <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
  if (endpoint.isHealthy === true) return <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
  return <div className="w-1.5 h-1.5 rounded-full bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
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
        <span className="text-[10px] font-medium text-muted-foreground/60 leading-none truncate max-w-[250px]">
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

  const handleFilterChange = useCallback((filter: { id: string; value: string } | null) => {
    navigate({
      to: '.',
      search: filter ? { environment: filter.value === 'false' ? 'unhealthy' : filter.value } : {},
    });
  }, [navigate]);

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
            <Activity className="w-4 h-4 text-primary" />
            <span>Health Monitor</span>
            {isChecking && (
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" title="Revalidando..." />
            )}
          </div>
        ),
        searchComponent: (
          <IndustrialTabs
            options={[
              { id: 'all', label: 'Todos' },
              { id: 'production', label: 'Production' },
              { id: 'staging', label: 'Staging' },
              { id: 'unhealthy', label: 'Unhealthy' },
            ]}
            activeId={environment}
            onChange={handleEnvironmentChange}
            className="w-96"
          />
        )
      }}
      actions={[headerActions]}
      refreshFn={checkAllEndpoints}
    >
      <div className="space-y-6">
      {/* Ordenamiento */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Ordenar por:</span>
          <IndustrialTabs
            options={[
              { id: 'default', label: 'Nombre' },
              { id: 'errors', label: 'Errores' },
              { id: 'recent', label: 'Recientes' },
            ]}
            activeId={sortBy}
            onChange={handleSortChange}
            className="w-72"
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
          caption={!activeFilter
            ? 'Navega a un producto favorito para detectar servicios automáticamente y comenzar el monitoreo.'
            : 'No hay servicios que coincidan con los filtros aplicados actualmente.'}
          action={!activeFilter && (
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
        <div className="space-y-4">
          {sortedProducts.map((product) => (
            <ProductSection
              key={product}
              product={product}
              endpoints={endpointsByProduct[product]}
              isChecking={isChecking}
              onCheckEndpoint={checkEndpoint}
              onRemoveEndpoint={removeEndpoint}
              activeFilter={activeFilter}
              onFilterChange={handleFilterChange}
            />
          ))}
        </div>
      )}
      </div>
    </PageLayout>
  );
}
