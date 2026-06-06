import { createFileRoute, useNavigate, useSearch, useRouterState } from '@tanstack/react-router';
import { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { useDockerAccess } from '@/hooks/useDockerAccess';
import { useQuery } from '@tanstack/react-query';
import { ContainerList, type ContainerListRef } from '@/docker/componentes/ContainerList';
import { StatusCard } from '@/components/ui/StatusCard';
import { getContainers } from '@/api/docker';
import { queryKeys, applyCachePolicy } from '@/lib/queryKeys';
import { PageLayout } from '../../layouts/PageLayout';
import { ActionButton, ACTION_DEFINITIONS } from '@/components/ui/ActionButton';

export const Route = createFileRoute('/docker/')({
  component: DockerManagerPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      status: typeof search.status === 'string' ? search.status : 'running',
    };
  },
});

function DockerManagerPage() {
  const containerListRef = useRef<ContainerListRef>(null);
  const { data: access, isLoading: checkingAccess } = useDockerAccess();
  const navigate = useNavigate({ from: '/docker' });
  const search = useSearch({ from: '/docker' });
  const routerState = useRouterState();
  const [searchQuery] = useState('');

  // Only redirect if we're on the parent route and not on a child route
  const isParentRoute = routerState.location.pathname === '/docker';

  useEffect(() => {
    if (access && !access.isInstalled && isParentRoute) {
      navigate({ to: '/docker/setup' });
    }
  }, [access, navigate, isParentRoute]);

  // Derive active filter from query params - memoized to prevent re-renders
  const activeFilter = useMemo(() => {
    return search.status ? { id: 'status', value: search.status } : null;
  }, [search.status]);

  const handleFilterChange = useCallback((filter: { id: string; value: string } | null) => {
    navigate({
      to: '.',
      search: filter ? { status: filter.value } : {},
    });
  }, [navigate]);

  // Obtener contenedores para calcular contadores
  const { data: containers } = useQuery({
    queryKey: queryKeys.docker.containers(),
    queryFn: getContainers,
    ...applyCachePolicy('docker'),
  });

  // Calcular contadores para los filtros - memoized
  const filterCounts = useMemo(() => {
    return {
      all: containers?.length || 0,
      running: containers?.filter(c => c.status.toLowerCase().startsWith('up')).length || 0,
      stopped: containers?.filter(c => !c.status.toLowerCase().startsWith('up')).length || 0,
      exited: containers?.filter(c => c.status.toLowerCase().includes('exited')).length || 0,
    };
  }, [containers]);

  const handleRefresh = () => {
    containerListRef.current?.refetch();
  };

  const headerActions = (
    <ActionButton
      key="refresh-action"
      action={ACTION_DEFINITIONS.refresh}
      onClick={handleRefresh}
      showLabel
      className="px-4 py-2 border border-border/60 rounded-lg bg-background shadow-sm"
    />
  );

  return (
    <PageLayout
      header={{
        title: "Docker",
        search: {
          searchQuery,
          searchFn: () => {}, // Placeholder as it's not implemented yet in the component state but required by layout
          searchShortcuts: ['CMD+K'],
          placeholder: "Buscar contenedores...",
          renderResult: () => null
        }
      }}
      actions={[headerActions]}
    >
      <div className="space-y-6">
      {/* Contenido */}
      {checkingAccess ? (
        <StatusCard type="loading" message="Verificando acceso a Docker..." />
      ) : access?.hasAccess ? (
        <ContainerList
          ref={containerListRef}
          searchQuery={searchQuery}
          filterCounts={filterCounts}
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
        />
      ) : (
        <StatusCard
          type="error"
          message="No se tiene acceso a Docker. Asegúrate de que Docker esté instalado y en ejecución."
          onRetry={handleRefresh}
        />
      )}
      </div>
    </PageLayout>
  );
}
