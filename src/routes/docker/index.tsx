import { createFileRoute, useNavigate, useSearch, useRouterState } from '@tanstack/react-router';
import { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { useDockerAccess } from '@/hooks/useDockerAccess';
import { useQuery } from '@tanstack/react-query';
import { ContainerList, type ContainerListRef } from '@/docker/components/ContainerList';
import { StatusCard } from '@/components/ui/StatusCard';
import { getContainers } from '@/api/docker';
import { queryKeys, applyCachePolicy } from '@/lib/queryKeys';
import { PageLayout } from '../../layouts/PageLayout';
import { ActionButton, ACTION_DEFINITIONS } from '@/components/ui/ActionButton';
import { IndustrialTabs } from '@/components/shared/IndustrialTabs';

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
      action={ACTION_DEFINITIONS.refresh}
      onClick={handleRefresh}
      showLabel={true}
      className="bg-background border border-border/60 shadow-sm px-4 py-2 rounded-lg"
    />
  );

  return (
    <PageLayout
      header={{ title: "Docker" }}
      actions={[headerActions]}
    >
      <div className="space-y-6">
      {/* Filtros */}
      <div className="flex items-center gap-4">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Estado:</span>
        <IndustrialTabs
          options={[
            { id: 'all', label: <div className="flex items-center gap-2"><span>Todos</span><span className="bg-muted-foreground/20 px-1.5 py-0.5 rounded-full text-[9px]">{filterCounts.all}</span></div> },
            { id: 'running', label: <div className="flex items-center gap-2"><span>Ejecutando</span><span className="bg-muted-foreground/20 px-1.5 py-0.5 rounded-full text-[9px]">{filterCounts.running}</span></div> },
            { id: 'stopped', label: <div className="flex items-center gap-2"><span>Detenido</span><span className="bg-muted-foreground/20 px-1.5 py-0.5 rounded-full text-[9px]">{filterCounts.stopped}</span></div> },
            { id: 'exited', label: <div className="flex items-center gap-2"><span>Finalizado</span><span className="bg-muted-foreground/20 px-1.5 py-0.5 rounded-full text-[9px]">{filterCounts.exited}</span></div> },
          ]}
          activeId={search.status || 'running'}
          onChange={(id) => handleFilterChange({ id: 'status', value: id })}
          className="w-[450px]"
        />
      </div>

      {/* Contenido */}
      {checkingAccess ? (
        <StatusCard type="loading" message="Verificando acceso a Docker..." />
      ) : access?.hasAccess ? (
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
