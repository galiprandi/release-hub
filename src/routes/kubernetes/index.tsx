import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { Boxes, FolderOpen, Layers, Search, Star, Server } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DeploymentList } from "@/kubernetes/components/DeploymentList";
import { DeploymentSearch } from "@/kubernetes/components/DeploymentSearch";
import { CollectionDropdown } from "@/components/shared/CollectionDropdown";
import { applyCachePolicy } from "@/lib/queryKeys";
import { PageLayout } from "@/layouts/PageLayout";
import { useUserCollections } from "@/hooks/useUserCollections";
import { useMemo, useCallback } from "react";

interface KubernetesSearch {
	namespace?: string;
	context?: string;
	tab: 'favorites' | 'projects';
}

export const Route = createFileRoute("/kubernetes/")({
	component: KubernetesPage,
	validateSearch: (search: Record<string, unknown>) => {
		return {
			namespace: typeof search.namespace === 'string' ? search.namespace : undefined,
			context: typeof search.context === 'string' ? search.context : undefined,
			tab: (search.tab === 'favorites' || search.tab === 'projects') ? search.tab : 'favorites',
		};
	},
});

function KubernetesPage() {
	const { deploymentFavorites, projects } = useUserCollections();
	const safeDeploymentFavorites = useMemo(() => deploymentFavorites || [], [deploymentFavorites]);
	const navigate = useNavigate({ from: '/kubernetes' });
	const search = useSearch({ from: '/kubernetes' });
	const activeTab = search.tab as 'favorites' | 'projects';

	// Derive active filter from query params - memoized to prevent re-renders
	const activeFilter = useMemo(() => {
		return search.namespace ? { id: 'namespace', value: search.namespace } : null;
	}, [search.namespace]);

	const handleFilterChange = useCallback((filter: { id: string; value: string } | null) => {
		navigate({
			to: '.',
			search: (prev: KubernetesSearch) => ({ ...prev, namespace: filter?.value }),
		});
	}, [navigate]);

	const handleContextChange = useCallback((context: string | null) => {
		navigate({
			to: '.',
			search: (prev: KubernetesSearch) => ({ ...prev, context: context || undefined }),
		});
	}, [navigate]);

	const handleTabChange = useCallback((tab: 'favorites' | 'projects') => {
		navigate({
			to: '.',
			search: (prev: KubernetesSearch) => ({ ...prev, tab, namespace: undefined }),
		});
	}, [navigate]);

	const { data: isInstalled, isLoading: isCheckingInstall } = useQuery({
		queryKey: ["kubectl", "installed"],
		queryFn: async () => {
			const { checkKubectlInstalled } = await import('@/api/kubectl')
			return checkKubectlInstalled()
		},
		...applyCachePolicy("kubectl"),
	});

	// Extract unique namespaces (with deployment counts) for global filtering
	const namespaceCounts = useMemo(() => {
		const counts = new Map<string, number>();
		const allIds = new Set<string>(safeDeploymentFavorites);
		projects.forEach(p => {
			p.deployments?.forEach((id: string) => allIds.add(id));
		});
		allIds.forEach(id => {
			const [, ns] = id.split('/');
			if (ns) counts.set(ns, (counts.get(ns) || 0) + 1);
		});
		return counts;
	}, [safeDeploymentFavorites, projects]);

	// Extract unique contexts (with deployment counts) for global filtering
	const contextCounts = useMemo(() => {
		const counts = new Map<string, number>();
		const allIds = new Set<string>(safeDeploymentFavorites);
		projects.forEach(p => {
			p.deployments?.forEach((id: string) => allIds.add(id));
		});
		allIds.forEach(id => {
			const [ctx] = id.split('/');
			if (ctx) counts.set(ctx, (counts.get(ctx) || 0) + 1);
		});
		return counts;
	}, [safeDeploymentFavorites, projects]);

	const viewTabs = useMemo(() => [
		{
			value: 'favorites',
			label: 'Favoritos',
			icon: Star,
			count: safeDeploymentFavorites.length,
		},
		{
			value: 'projects',
			label: 'Proyectos',
			icon: FolderOpen,
			count: projects.reduce((acc, p) => acc + (p.deployments?.length || 0), 0),
		},
	], [safeDeploymentFavorites.length, projects]);

	const namespaceTabs = useMemo(() => {
		const namespaces = Array.from(namespaceCounts.keys()).sort();
		return [
			{
				value: 'all',
				label: 'Todos',
				icon: Layers,
				count: namespaces.reduce((acc, ns) => acc + (namespaceCounts.get(ns) || 0), 0),
			},
			...namespaces.map(ns => ({
				value: ns,
				label: ns,
				icon: Boxes,
				count: namespaceCounts.get(ns) || 0,
			})),
		];
	}, [namespaceCounts]);

	const contextTabs = useMemo(() => {
		const contexts = Array.from(contextCounts.keys()).sort();
		return [
			{
				value: 'all',
				label: 'Todos',
				icon: Server,
				count: contexts.reduce((acc, ctx) => acc + (contextCounts.get(ctx) || 0), 0),
			},
			...contexts.map(ctx => ({
				value: ctx,
				label: ctx,
				icon: Server,
				count: contextCounts.get(ctx) || 0,
			})),
		];
	}, [contextCounts]);

	const hasContent = activeTab === 'favorites' ? safeDeploymentFavorites.length > 0 : projects.some(p => p.deployments.length > 0);

	const queryClient = useQueryClient();
	const handleRefresh = useCallback(() => {
		queryClient.invalidateQueries({ queryKey: ["kubectl"] });
	}, [queryClient]);

	return (
		<PageLayout
			refreshFn={isInstalled ? handleRefresh : undefined}
			header={{
				title: (
					<div className="flex items-center gap-2">
						<Server className="w-4 h-4 text-primary" />
						<span>Kubernetes</span>
					</div>
				),
				searchComponent: isInstalled ? (
					<div className="flex items-center gap-3">
						<CollectionDropdown
							menuLabel="Vistas"
							ariaLabel="Seleccionar vista"
							tabs={viewTabs}
							activeTab={activeTab}
							onChange={(id) => handleTabChange(id as 'favorites' | 'projects')}
						/>
						{namespaceTabs.length > 1 && (
							<CollectionDropdown
								menuLabel="Namespaces"
								ariaLabel="Seleccionar namespace"
								tabs={namespaceTabs}
								activeTab={search.namespace || 'all'}
								onChange={(id) => handleFilterChange(id === 'all' ? null : { id: 'namespace', value: id })}
							/>
						)}
						{contextTabs.length > 1 && (
							<CollectionDropdown
								menuLabel="Contextos"
								ariaLabel="Seleccionar contexto"
								tabs={contextTabs}
								activeTab={search.context || 'all'}
								onChange={(id) => handleContextChange(id === 'all' ? null : id)}
							/>
						)}
						<div className="w-px h-6 bg-border mx-1" />
						<DeploymentSearch />
					</div>
				) : undefined
			}}
			isLoading={isCheckingInstall && !hasContent}
			showEmptyState={!hasContent}
			emptyState={{
				icon: <Star className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />,
				label: activeTab === 'favorites' ? "Sin favoritos" : "Sin despliegues en proyectos",
				caption: activeTab === 'favorites'
					? "Agrega deployments a tus favoritos para verlos aquí y monitorear sus logs."
					: "Organiza tus despliegues en proyectos para una mejor gestión.",
				action: (
					<button
						type="button"
						onClick={() => {
							const input = document.querySelector('input[placeholder*="Búsqueda de deployments"]') as HTMLInputElement;
							if (input) {
								input.focus();
							}
						}}
						className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all text-xs font-medium shadow-sm focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none focus-visible:ring-offset-1"
					>
						<Search className="w-4 h-4" />
						Buscar Deployments
					</button>
				)
			}}
		>
			<DeploymentList
				favorites={safeDeploymentFavorites}
				projects={projects}
				activeTab={activeTab}
				activeFilter={activeFilter}
				onFilterChange={handleFilterChange}
				activeContext={search.context}
				isKubectlInstalled={isInstalled}
			/>
		</PageLayout>
	);
}
