import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { Search, Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { DeploymentList } from "@/kubernetes/components/DeploymentList";
import { DeploymentSearch } from "@/kubernetes/components/DeploymentSearch";
import { IndustrialTabs } from "@/components/shared/IndustrialTabs";
import { applyCachePolicy } from "@/lib/queryKeys";
import { PageLayout } from "@/layouts/PageLayout";
import { useUserCollections } from "@/hooks/useUserCollections";
import { useMemo, useCallback } from "react";

interface KubernetesSearch {
	namespace?: string;
	tab: 'favorites' | 'projects';
}

export const Route = createFileRoute("/kubernetes/")({
	component: KubernetesPage,
	validateSearch: (search: Record<string, unknown>) => {
		return {
			namespace: typeof search.namespace === 'string' ? search.namespace : undefined,
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

	// Extract unique namespaces from all deployments for global filtering
	const availableNamespaces = useMemo(() => {
		const nsSet = new Set<string>();
		safeDeploymentFavorites.forEach(id => {
			const [, ns] = id.split('/');
			if (ns) nsSet.add(ns);
		});
		projects.forEach(p => {
			p.deployments?.forEach((id: string) => {
				const [, ns] = id.split('/');
				if (ns) nsSet.add(ns);
			});
		});
		return Array.from(nsSet).sort();
	}, [safeDeploymentFavorites, projects]);

	const hasContent = activeTab === 'favorites' ? safeDeploymentFavorites.length > 0 : projects.some(p => p.deployments.length > 0);

	return (
		<PageLayout
			header={{
				title: "Kubernetes",
				searchComponent: isInstalled ? (
					<div className="flex items-center gap-6">
						<div className="flex items-center gap-2">
							<span className="text-xs font-medium text-muted-foreground">Vistas:</span>
							<IndustrialTabs
								options={[
									{ id: 'favorites', label: 'Favoritos' },
									{ id: 'projects', label: 'Proyectos' },
								]}
								activeId={activeTab}
								onChange={handleTabChange}
								className="w-48"
							/>
						</div>

						{availableNamespaces.length > 0 && (
							<div className="flex items-center gap-2">
								<span className="text-xs font-medium text-muted-foreground">Namespace:</span>
								<IndustrialTabs
									options={[
										{ id: 'all', label: 'Todos' },
										...availableNamespaces.map(ns => ({ id: ns, label: ns }))
									]}
									activeId={search.namespace || 'all'}
									onChange={(id) => handleFilterChange(id === 'all' ? null : { id: 'namespace', value: id })}
									className="min-w-[120px]"
								/>
							</div>
						)}
						<div className="w-px h-6 bg-border mx-1" />
						<DeploymentSearch />
					</div>
				) : undefined
			}}
			isLoading={isCheckingInstall && !hasContent}
			showEmptyState={!hasContent}
			emptyState={{
				icon: <Star className="w-12 h-12 mx-auto mb-4 text-muted-foreground/20" />,
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
				isKubectlInstalled={isInstalled}
			/>
		</PageLayout>
	);
}
