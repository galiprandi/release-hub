import { useCallback, useEffect, useState, useRef } from 'react';
import { extractRoutes } from '@/components/SekiMonitor/helpers';
import type { Event } from '@/api/seki.type';

const HEALTH_STORAGE_KEY = 'seki:health:endpoints:v1';
const HEALTH_CHECK_TIMEOUT = 5000; // 5 segundos

export type Environment = 'staging' | 'production';

export interface HealthEndpoint {
  id: string; // product:service:env format
  product: string; // org/repo
  service: string; // nombre del servicio (ej: stock-control, users)
  url: string;
  environment: Environment;
  lastChecked: string;
  isHealthy: boolean | null; // null = no verificado aún
  responseTime?: number;
  error?: string;
}

interface StoredEndpoints {
  endpoints: HealthEndpoint[];
  version: number;
}

function getStoredEndpoints(): HealthEndpoint[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(HEALTH_STORAGE_KEY);
  if (!stored) return [];
  try {
    const parsed: StoredEndpoints = JSON.parse(stored);
    return parsed.endpoints || [];
  } catch {
    return [];
  }
}

function saveEndpoints(endpoints: HealthEndpoint[]) {
  if (typeof window === 'undefined') return;
  const data: StoredEndpoints = {
    endpoints,
    version: 1,
  };
  localStorage.setItem(HEALTH_STORAGE_KEY, JSON.stringify(data));
}

function extractServiceName(url: string): string {
  // Extraer nombre del servicio de URLs tipo:
  // https://seki-stag.cencosud.corp/argentina-arcus/api/stock-control
  // https://seki-stag.cencosud.corp/yumi-shrinkage-record/api/
  // https://yumi-shrinkage-record-bff-api-staging.cencosudx.com (root path -> /)

  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);

    // Si es URL de seki (tiene /api/ en el path)
    if (pathParts.includes('api')) {
      const apiIndex = pathParts.indexOf('api');
      // Si hay algo después de /api/ (ej: /api/stock-control)
      if (pathParts[apiIndex + 1]) {
        return pathParts[apiIndex + 1];
      }
      // Si /api/ está al final (ej: /yumi-shrinkage-record/api/)
      // usar el segmento anterior (el nombre del repo)
      if (apiIndex > 0) {
        return pathParts[apiIndex - 1];
      }
    }

    // Si hay path parts, usar el último
    if (pathParts.length > 0) {
      return pathParts[pathParts.length - 1];
    }

    // Si no hay path (URL termina en /), es una ruta root
    // Mostrar "/" en lugar de extraer del hostname
    return '/';
  } catch {
    return 'unknown';
  }
}

function detectEnvironment(url: string): Environment {
  // Detectar environment basado en la URL
  if (url.includes('-stag.') || url.includes('staging') || url.includes('.stag.')) {
    return 'staging';
  }
  // URLs internas de cluster sin "stag" se consideran del environment actual
  // Por defecto asumimos staging para URLs de seki-stag
  if (url.includes('seki-stag')) {
    return 'staging';
  }
  if (url.includes('seki-prod') || url.includes('prod.')) {
    return 'production';
  }
  // Default a staging si no se puede determinar
  return 'staging';
}

async function checkHealth(url: string): Promise<{ isHealthy: boolean; responseTime: number; error?: string }> {
  const startTime = performance.now();

  try {
    // Usar el proxy local para evitar CORS en desarrollo
    // El proxy está configurado en vite.config.ts
    const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';
    const proxyUrl = isDev
      ? `/health-proxy?url=${encodeURIComponent(url)}`
      : url.endsWith('/') ? `${url}health` : `${url}/health`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

    const response = await fetch(proxyUrl, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Para el proxy, verificamos el status code de la respuesta
    const isHealthy = response.status >= 200 && response.status < 300;
    const responseTime = Math.round(performance.now() - startTime);

    if (!response.ok) {
      return { isHealthy: false, responseTime, error: `HTTP ${response.status}` };
    }

    return { isHealthy, responseTime };
  } catch (error) {
    const responseTime = Math.round(performance.now() - startTime);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return { isHealthy: false, responseTime, error: 'Timeout' };
      }
      return { isHealthy: false, responseTime, error: error.message };
    }

    return { isHealthy: false, responseTime, error: 'Unknown error' };
  }
}

export function useHealthMonitor() {
  const [endpoints, setEndpoints] = useState<HealthEndpoint[]>(getStoredEndpoints);
  const [isChecking, setIsChecking] = useState(false);
  const checkingRef = useRef<Set<string>>(new Set());
  const endpointsRef = useRef(endpoints);

  // Keep ref in sync with state
  useEffect(() => {
    endpointsRef.current = endpoints;
  }, [endpoints]);

  // Persistir cambios
  useEffect(() => {
    saveEndpoints(endpoints);
  }, [endpoints]);

  // Extraer endpoints de eventos de pipeline
  const extractEndpointsFromEvents = useCallback((product: string, events: Event[], environment?: Environment) => {
    // extractRoutes ya filtra solo URLs externas accesibles desde el navegador
    const urls = extractRoutes(events);

    if (urls.length === 0) return;

    setEndpoints((prev) => {
      const newEndpoints = [...prev];

      for (const url of urls) {
        const service = extractServiceName(url);
        const env = environment || detectEnvironment(url);
        const id = `${product}:${service}:${env}`;

        // Evitar duplicados
        const exists = newEndpoints.some((ep) => ep.id === id);
        if (!exists) {
          newEndpoints.push({
            id,
            product,
            service,
            url,
            environment: env,
            lastChecked: new Date().toISOString(),
            isHealthy: null, // Pendiente de verificación
          });
        }
      }

      return newEndpoints;
    });
  }, []);

  // Verificar health de un endpoint específico
  const checkEndpoint = useCallback(async (id: string) => {
    if (checkingRef.current.has(id)) return; // Evitar checks concurrentes

    // Usar ref para evitar dependencia en endpoints
    const endpoint = endpointsRef.current.find((ep) => ep.id === id);
    if (!endpoint) return;

    checkingRef.current.add(id);

    try {
      const result = await checkHealth(endpoint.url);

      setEndpoints((prev) =>
        prev.map((ep) =>
          ep.id === id
            ? {
                ...ep,
                isHealthy: result.isHealthy,
                responseTime: result.responseTime,
                error: result.error,
                lastChecked: new Date().toISOString(),
              }
            : ep
        )
      );
    } finally {
      checkingRef.current.delete(id);
    }
  }, []);

  // Verificar todos los endpoints
  const checkAllEndpoints = useCallback(async () => {
    if (isChecking) return;
    setIsChecking(true);

    // Usar ref para evitar dependencia en endpoints
    const checkPromises = endpointsRef.current.map(async (ep) => {
      await checkEndpoint(ep.id);
    });

    await Promise.all(checkPromises);
    setIsChecking(false);
  }, [checkEndpoint, isChecking]);

  // Verificar endpoints de un producto específico
  const checkProductEndpoints = useCallback(async (product: string) => {
    // Usar ref para evitar dependencia en endpoints
    const productEndpoints = endpointsRef.current.filter((ep) => ep.product === product);

    for (const ep of productEndpoints) {
      await checkEndpoint(ep.id);
    }
  }, [checkEndpoint]);

  // Eliminar endpoints de un producto (cuando se quita de favoritos)
  const removeProductEndpoints = useCallback((product: string) => {
    setEndpoints((prev) => prev.filter((ep) => ep.product !== product));
  }, []);

  // Eliminar un endpoint específico
  const removeEndpoint = useCallback((id: string) => {
    setEndpoints((prev) => prev.filter((ep) => ep.id !== id));
  }, []);

  // Obtener endpoints por ambiente
  const getEndpointsByEnvironment = useCallback((env: Environment) => {
    return endpoints.filter((ep) => ep.environment === env);
  }, [endpoints]);

  // Obtener endpoints por producto
  const getEndpointsByProduct = useCallback((product: string) => {
    return endpoints.filter((ep) => ep.product === product);
  }, [endpoints]);

  // Contar saludables
  const healthyCount = endpoints.filter((ep) => ep.isHealthy === true).length;
  const unhealthyCount = endpoints.filter((ep) => ep.isHealthy === false).length;
  const pendingCount = endpoints.filter((ep) => ep.isHealthy === null).length;

  return {
    endpoints,
    extractEndpointsFromEvents,
    checkEndpoint,
    checkAllEndpoints,
    checkProductEndpoints,
    removeProductEndpoints,
    removeEndpoint,
    getEndpointsByEnvironment,
    getEndpointsByProduct,
    isChecking,
    stats: {
      total: endpoints.length,
      healthy: healthyCount,
      unhealthy: unhealthyCount,
      pending: pendingCount,
    },
  };
}

export type UseHealthMonitorReturn = ReturnType<typeof useHealthMonitor>;
