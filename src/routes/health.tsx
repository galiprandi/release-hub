import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Activity, RefreshCw, Trash2, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { useHealthMonitor } from '@/hooks/useHealthMonitor';
import { useFavorites } from '@/hooks/useFavorites';

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
  const [, productName] = product.split('/');

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

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      {/* Contenedor del producto con padding base */}
      <div className="px-4">
        {/* Header del producto */}
        <div className="flex items-center justify-between py-3 bg-gray-50 border-b -mx-4 px-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-800">{productName}</span>
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

        {/* Servicios del producto */}
        <div className="ml-4 space-y-3 py-3">
          {services.map((service) => {
          const serviceEndpoints = endpointsByService[service];
          
          // Ordenar: production primero, luego staging
          const sortedEndpoints = serviceEndpoints.sort((a, b) => {
            if (a.environment !== b.environment) {
              return a.environment === 'production' ? -1 : 1;
            }
            return a.url.localeCompare(b.url);
          });
          
          return (
            <div key={service}>
              {/* Servicio */}
              <div className="font-medium text-gray-700 py-1">
                {service === '/' ? '/' : `/${service}`}
              </div>
              
              {/* Endpoints del servicio */}
              <div className="ml-4 space-y-1">
                {sortedEndpoints.map((endpoint) => (
                  <div key={endpoint.id} className="flex items-center gap-3 px-4 py-1 hover:bg-gray-50 rounded group">
                    {/* Status emoji */}
                    <div className="flex-shrink-0">
                      {endpoint.isHealthy === null && (
                        <span className="text-gray-400">⚪</span>
                      )}
                      {endpoint.isHealthy === true && (
                        <span className="text-green-500">🟢</span>
                      )}
                      {endpoint.isHealthy === false && (
                        <span className="text-red-500">🔴</span>
                      )}
                    </div>

                    {/* Ambiente badge */}
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${
                        endpoint.environment === 'production'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {endpoint.environment}
                    </span>

                    {/* Response time */}
                    {endpoint.responseTime !== undefined && (
                      <span className={`text-xs ${endpoint.isHealthy ? 'text-green-600' : 'text-red-600'}`}>
                        {endpoint.responseTime}ms
                      </span>
                    )}

                    {/* Última verificación */}
                    <span className="text-xs text-gray-400">
                        {formatTimeAgo(endpoint.lastChecked)}
                    </span>

                    {/* URL */}
                    <span className="flex-1 text-xs text-gray-500 truncate">
                      {endpoint.url}
                    </span>

                    {/* Actions - solo visible al hover */}
                    <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onCheckEndpoint(endpoint.id)}
                        disabled={isChecking}
                        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                        title="Verificar ahora"
                      >
                        <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
                      </button>
                      <a
                        href={endpoint.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                        title="Abrir URL"
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
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
    </div>
  );
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

  const { favorites } = useFavorites();

  // Estado para filtros
  const [environmentFilter, setEnvironmentFilter] = useState<'all' | 'staging' | 'production' | 'unhealthy'>('all');
  const [searchQuery, setSearchQuery] = useState('');
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

  return (
    <div className="space-y-6">
      {/* Filtros por ambiente + CTAs */}
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

          {/* Búsqueda de servicios */}
          <div>
            <input
              type="text"
              placeholder="Buscar servicio o URL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
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
        <div className="flex gap-2">
          {/* CTA Principal: Verificar solo los con fallo */}
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

          {/* CTA Secundario: Verificar todos */}
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
              to="/"
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
  );
}
