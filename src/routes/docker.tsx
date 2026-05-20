import { createFileRoute } from '@tanstack/react-router';
import { useRef, useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { useDockerAccess } from '@/hooks/useDockerAccess';
import { useQuery } from '@tanstack/react-query';
import { ContainerList, type ContainerListRef } from '@/components/ContainerList';
import { FilterBar } from '@/components/shared/FilterBar';
import { StatusCard } from '@/components/ui/StatusCard';
import { getContainers } from '@/api/docker';
import { queryKeys, applyCachePolicy } from '@/lib/queryKeys';

export const Route = createFileRoute('/docker')({
  component: DockerManagerPage,
});

function DockerManagerPage() {
  const containerListRef = useRef<ContainerListRef>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { data: access, isLoading: checkingAccess } = useDockerAccess();
  const [statusFilter, setStatusFilter] = useState<'all' | 'running' | 'stopped' | 'exited'>('running');
  const [searchQuery, setSearchQuery] = useState('');

  // Obtener contenedores para calcular contadores
  const { data: containers } = useQuery({
    queryKey: queryKeys.docker.containers(),
    queryFn: getContainers,
    ...applyCachePolicy('docker'),
  });

  // Calcular contadores para los filtros
  const filterCounts = {
    all: containers?.length || 0,
    running: containers?.filter(c => c.status.toLowerCase().startsWith('up')).length || 0,
    stopped: containers?.filter(c => !c.status.toLowerCase().startsWith('up')).length || 0,
    exited: containers?.filter(c => c.status.toLowerCase().includes('exited')).length || 0,
  };

  const handleRefresh = () => {
    containerListRef.current?.refetch();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filters = [
    { value: 'all' as const, label: `Todos (${filterCounts.all})` },
    { value: 'running' as const, label: `Running (${filterCounts.running})` },
    { value: 'stopped' as const, label: `Stopped (${filterCounts.stopped})` },
    { value: 'exited' as const, label: `Exited (${filterCounts.exited})` },
  ];

  const handleFilterChange = (value: string) => {
    setStatusFilter(value as 'all' | 'running' | 'stopped' | 'exited');
  };

  return (
    <div className="space-y-6">
      {/* Filtros y búsqueda */}
      <FilterBar
        filters={filters}
        activeFilter={statusFilter}
        onFilterChange={handleFilterChange}
        searchPlaceholder="Buscar contenedor... (Cmd+F)"
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        rightContent={
          <button
            type="button"
            onClick={handleRefresh}
            className="flex items-center justify-center gap-2 px-3 py-1.5 text-sm border border-input text-muted-foreground rounded-md hover:bg-accent hover:text-accent-foreground transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Recargar
          </button>
        }
      />

      {/* Contenido */}
      {checkingAccess ? (
        <StatusCard type="loading" message="Verificando acceso a Docker..." />
      ) : access?.hasAccess ? (
        <ContainerList ref={containerListRef} statusFilter={statusFilter} searchQuery={searchQuery} />
      ) : (
        <StatusCard
          type="error"
          message="No se tiene acceso a Docker. Asegúrate de que Docker esté instalado y en ejecución."
          onRetry={handleRefresh}
        />
      )}
    </div>
  );
}
