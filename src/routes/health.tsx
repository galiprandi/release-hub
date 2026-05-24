import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Activity, RefreshCw, Trash2, ExternalLink, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import { useHealthMonitor } from '@/hooks/useHealthMonitor';
import { useUserCollections } from '@/hooks/useUserCollections';
import { Table } from '@/components/ui/Table';
import type { ColumnDef } from '@tanstack/react-table';
import { PageLayout } from '../layouts/PageLayout';

export const Route = createFileRoute('/health')({
  component: HealthMonitorPage,
});

// Función para formatear tiempo relativo
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'ahora mismo';
  if (diffMins < 60) return `hace ${diffMins} min`;
  if (diffHours < 24) return `hace ${diffHours} h`;
  if (diffDays < 7) return `hace ${diffDays} días`;
  return date.toLocaleDateString();
}

function InfoBanner() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-blue-100/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          <span className="font-medium text-blue-800">Cómo funciona</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-blue-600" />
        ) : (
          <ChevronDown className="w-5 h-5 text-blue-600" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4">
          <div className="text-sm text-blue-800 pt-2 border-t border-blue-200">
            <ul className="space-y-1 list-disc list-inside">
              <li>Los endpoints se detectan automáticamente desde los pipelines de deploy</li>
              <li>Se verifica el endpoint <code className="bg-blue-100 px-1 rounded">/health</code> en cada URL</li>
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
  const [expandedEndpoints, setExpandedEndpoints] = useState<Set<string>>(new Set());

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
    <div className="bg-white rounded-lg border overflow-hidden">
      {/* Header del producto */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
        <div className="flex items-center gap-2">
          <Link
            to="/github/$org/$repo"
            params={{ org, repo: productName }}
            className="font-semibold text-gray-800 hover:text-blue-600 transition-colors"
          >
            {productName}
          </Link>
          <span className="text-sm text-gray-500">({services.length} servicios)</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {(() => {
            const healthy = endpoints.filter((ep) => ep.isHealthy === true).length;
            const unhealthy = endpoints.filter((ep) => ep.isHealthy === false).length;
            const pending = endpoints.filter((ep) => ep.isHealthy === null).length;
            return (
              <>
                {healthy > 0 && (
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    {healthy} OK
                  </span>
                )}
                {pending > 0 && (
                  <span className="flex items-center gap-1 text-gray-500">
                    <div className="w-2 h-2 rounded-full bg-gray-400" />
                    {pending} Pendientes
                  </span>
                )}
                {unhealthy > 0 && (
                  <span className="flex items-center gap-1 text-red-600 font-medium">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
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
        expandedEndpoints={expandedEndpoints}
        setExpandedEndpoints={setExpandedEndpoints}
        isChecking={isChecking}
        onCheckEndpoint={onCheckEndpoint}
        onRemoveEndpoint={onRemoveEndpoint}
      />
    </div>
  );
}

function EndpointsTable({
  endpoints,
  expandedEndpoints,
  setExpandedEndpoints,
  isChecking,
  onCheckEndpoint,
  onRemoveEndpoint,
}: {
  endpoints: ReturnType<typeof useHealthMonitor>['endpoints']
  expandedEndpoints: Set<string>
  setExpandedEndpoints: React.Dispatch<React.SetStateAction<Set<string>>>
  isChecking: boolean
  onCheckEndpoint: (id: string) => void
  onRemoveEndpoint: (id: string) => void
}) {
  const columns: ColumnDef<(typeof endpoints)[0]>[] = [
    {
      accessorKey: "status",
      header: "",
      cell: ({ row }) => <StatusCell endpoint={row.original} />,
    },
    {
      accessorKey: "service",
      header: "Ruta",
      cell: ({ row }) => <span className="font-medium text-gray-700">{row.original.service || '/'}</span>,
    },
    {
      accessorKey: "environment",
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
      header: "Acciones",
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

  return <Table columns={columns} data={endpoints} />
}

function StatusCell({ endpoint }: { endpoint: ReturnType<typeof useHealthMonitor>['endpoints'][0] }) {
  if (endpoint.isHealthy === null) return <span className="text-gray-400">⚪</span>
  if (endpoint.isHealthy === true) return <span className="text-green-500">🟢</span>
  return <span className="text-red-500">🔴</span>
}

function EnvironmentCell({ endpoint }: { endpoint: ReturnType<typeof useHealthMonitor>['endpoints'][0] }) {
  return (
    <span
      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${
        endpoint.environment === 'production'
          ? 'bg-purple-100 text-purple-700'
          : 'bg-blue-100 text-blue-700'
      }`}
    >
      {endpoint.environment}
    </span>
  )
}

function ResponseTimeCell({ endpoint }: { endpoint: ReturnType<typeof useHealthMonitor>['endpoints'][0] }) {
  if (endpoint.responseTime !== undefined) {
    return (
      <span className={`text-xs ${endpoint.isHealthy ? 'text-green-600' : 'text-red-600'}`}>
        {endpoint.responseTime}ms
      </span>
    )
  }
  return <span className="text-muted-foreground">-</span>
}

function ErrorCell({ endpoint }: { endpoint: ReturnType<typeof useHealthMonitor>['endpoints'][0] }) {
  if (!endpoint.error) return <span className="text-muted-foreground">-</span>

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
    <span className="text-xs text-red-600" title={errorMessage}>
      {truncatedMessage}
    </span>
  )
}

function LastCheckedCell({ endpoint }: { endpoint: ReturnType<typeof useHealthMonitor>['endpoints'][0] }) {
  return <span className="text-xs text-gray-400">{formatTimeAgo(endpoint.lastChecked)}</span>
}

function UrlCell({ endpoint }: { endpoint: ReturnType<typeof useHealthMonitor>['endpoints'][0] }) {
  const truncatedUrl = endpoint.url.length > 60 ? `${endpoint.url.slice(0, 60)}...` : endpoint.url
  return <span className="flex-1 text-xs text-gray-500" title={endpoint.url}>{truncatedUrl}</span>
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
    <div className="flex items-center gap-0.5">
      <button
        onClick={() => onCheckEndpoint(endpoint.id)}
        disabled={isChecking}
        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
        title="Verificar ahora"
      >
        <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
      </button>
      <button
        onClick={() => navigator.clipboard.writeText(endpoint.url)}
        className="p-1 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
        title="Copiar URL"
      >
        <Copy className="w-3 h-3" />
      </button>
      <a
        href={endpoint.url.endsWith('/') ? `${endpoint.url}health` : `${endpoint.url}/health`}
        target="_blank"
        rel="noopener noreferrer"
        className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
        title="Abrir /health"
      >
        <ExternalLink className="w-3 h-3" />
      </a>
      <button
        onClick={() => onRemoveEndpoint(endpoint.id)}
        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
        title="Eliminar del monitoreo"
      >
        <Trash2 className="w-3 h-3" />
      </button>
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

  // Estado para filtros
  const [environmentFilter, setEnvironmentFilter] = useState<'all' | 'staging' | 'production' | 'unhealthy'>('all');
  const [searchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'errors' | 'recent'>('default');

  // Filtrar endpoints según el filtro seleccionado y búsqueda
  const filteredEndpoints = endpoints.filter((ep) => {
    // Filtro por ambiente
    if (environmentFilter === 'staging' && ep.environment !== 'staging') return false;
    if (environmentFilter === 'production' && ep.environment !== 'production') return false;
    if (environmentFilter === 'unhealthy' && ep.isHealthy !== false) return false;

    // Filtro por búsqueda (servicio o URL)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const serviceMatch = ep.service?.toLowerCase().includes(query);
      const urlMatch = ep.url.toLowerCase().includes(query);
      if (!serviceMatch && !urlMatch) return false;
    }

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
        <button
          onClick={() => {
            const unhealthy = filteredEndpoints.filter((ep) => ep.isHealthy === false);
            unhealthy.forEach((ep) => checkEndpoint(ep.id));
          }}
          disabled={isChecking}
          className="flex items-center justify-center gap-2 px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
          {isChecking ? 'Verificando...' : `Verificar ${stats.unhealthy}`}
        </button>
      )}
      <button
        onClick={() => checkAllEndpoints()}
        disabled={isChecking}
        className="flex items-center justify-center gap-2 px-3 py-1.5 text-sm border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
        {isChecking ? 'Verificando...' : 'Verificar todos'}
      </button>
    </div>
  );

  return (
    <PageLayout 
      header={{ title: "Health Monitor" }}
      actions={[headerActions]}
      refreshFn={checkAllEndpoints}
    >
      <div className="space-y-6">
      {/* Filtros por ambiente */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Filtrar:</span>
            {[
              { value: 'all' as const, label: `Todos (${filteredEndpoints.length})` },
              { value: 'staging' as const, label: `Staging (${filteredEndpoints.filter(e => e.environment === 'staging').length})` },
              { value: 'production' as const, label: `Production (${filteredEndpoints.filter(e => e.environment === 'production').length})` },
              { value: 'unhealthy' as const, label: `Con errores (${filteredEndpoints.filter(e => e.isHealthy === false).length})` },
            ].map((filter) => (
              <button
                key={filter.value}
                onClick={() => setEnvironmentFilter(filter.value)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  environmentFilter === filter.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Ordenamiento */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Ordenar:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'default' | 'errors' | 'recent')}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="default">Por defecto</option>
              <option value="errors">Con errores primero</option>
              <option value="recent">Más recientes</option>
            </select>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => checkAllEndpoints()}
            disabled={isChecking}
            className="flex items-center justify-center gap-2 px-3 py-1.5 text-sm border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            {isChecking ? 'Verificando...' : 'Verificar todos'}
          </button>
        </div>
      </div>

      {/* Info banner - expandible */}
      <InfoBanner />

      {/* Endpoints by product */}
      {filteredEndpoints.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed">
          <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No hay endpoints que coincidan con el filtro</p>
          <p className="text-sm text-gray-400 mt-1">
            {environmentFilter === 'all' ? 'Navega a un producto favorito para detectar servicios automáticamente' : 'Intenta con otro filtro'}
          </p>
          {environmentFilter === 'all' && (
            <Link
              to="/github"
              className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Ir al inicio
            </Link>
          )}
        </div>
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
