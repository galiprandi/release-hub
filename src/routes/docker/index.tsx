import { createFileRoute, useNavigate, useSearch, useRouterState } from '@tanstack/react-router';
import { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { useDockerAccess } from '@/hooks/useDockerAccess';
import { useQuery } from '@tanstack/react-query';
import { Boxes } from 'lucide-react';
import { ContainerList, type ContainerListRef } from '@/docker/components/ContainerList';
import { ContainerSearch } from '@/docker/components/ContainerSearch';
import { StatusCard } from '@/components/ui/StatusCard';
import { IndustrialTabs } from '@/components/shared/IndustrialTabs';
import { getContainers } from '@/api/docker';
import { queryKeys, applyCachePolicy } from '@/lib/queryKeys';
import { PageLayout } from '../../layouts/PageLayout';
import { ActionButton, ACTION_DEFINITIONS } from '@/components/ui/ActionButton';

export const Route = createFileRoute('/docker/')({
  component: DockerManagerPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      status: (['all', 'running', 'stopped', 'exited'].includes(search.status as string)
        ? search.status
        : 'running') as 'all' | 'running' | 'stopped' | 'exited',
    };
  },
});

function DockerManagerPage() {
  const containerListRef = useRef<ContainerListRef>(null);
  const { data: access, isLoading: checkingAccess } = useDockerAccess();
  const navigate = useNavigate({ from: '/docker' });
  const search = useSearch({ from: '/docker' });
  const routerState = useRouterState();
  const [searchQuery, setSearchQuery] = useState('');

  // Only redirect if we're on the parent route and not on a child route
  const isParentRoute = routerState.location.pathname === '/docker';

  useEffect(() => {
    if (access && !access.isInstalled && isParentRoute) {
      navigate({ to: '/docker/setup' });
    }
  }, [access, navigate, isParentRoute]);

  // Derive active filter from query params - memoized to prevent re-renders
  const activeFilter = useMemo(() => {
    if (!search.status || search.status === 'all') return null;
    return { id: 'status', value: search.status };
  }, [search.status]);

  const handleFilterChange = useCallback((filter: { id: string; value: string } | null) => {
    navigate({
      to: '.',
      search: (prev: Record<string, unknown>) => ({
        ...prev,
        status: filter?.value || 'all'
      }),
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
      action={ACTION_DEFINITIONS.refresh}
      onClick={handleRefresh}
      showLabel={true}
      className="bg-background border border-border shadow-sm px-4 py-2 rounded-lg"
    />
  );

  return (
    <PageLayout
      header={{
        title: (
          <div className="flex items-center gap-2">
            <Boxes className="w-4 h-4 text-primary" />
            <span>Docker</span>
          </div>
        ),
        searchComponent: access?.hasAccess ? (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground/60">Estado:</span>
              <IndustrialTabs
                options={[
                  { id: 'all', label: `Todos (${filterCounts.all})` },
                  { id: 'running', label: `Ejecutando (${filterCounts.running})` },
                  { id: 'stopped', label: `Detenido (${filterCounts.stopped})` },
                  { id: 'exited', label: `Finalizado (${filterCounts.exited})` },
                ]}
                activeId={search.status || 'all'}
                onChange={(id) => handleFilterChange({ id: 'status', value: id })}
                className="w-full sm:w-[520px]"
              />
            </div>
            <div className="w-px h-6 bg-border/40 mx-1" />
            <ContainerSearch query={searchQuery} setQuery={setSearchQuery} />
          </div>
        ) : undefined
      }}
      actions={[headerActions]}
    >
      <div className="space-y-6">
      {/* Contenido */}
      {checkingAccess ? null : access?.hasAccess ? (
        <ContainerList
          ref={containerListRef}
          searchQuery={searchQuery}
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
