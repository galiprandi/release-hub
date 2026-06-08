import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { Search, Star, Layers } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { DeploymentList } from "@/components/kubernetes/DeploymentList";
import { DeploymentSearch } from "@/components/kubernetes/DeploymentSearch";
import { applyCachePolicy } from "@/lib/queryKeys";
import { PageLayout } from "@/layouts/PageLayout";
import { useUserCollections } from "@/hooks/useUserCollections";
import { useMemo, useCallback } from "react";
import { IndustrialTabs } from "@/components/shared/IndustrialTabs";

type KubernetesTab = 'favorites' | 'projects';

export const Route = createFileRoute("/kubernetes/")({
	component: KubernetesPage,
	validateSearch: (search: Record<string, unknown>) => {
		return {
			namespace: typeof search.namespace === 'string' ? search.namespace : undefined,
			tab: (search.tab === 'favorites' || search.tab === 'projects') ? (search.tab as KubernetesTab) : 'favorites',
		};
	},
});

function KubernetesPage() {
	const { deploymentFavorites = [], projects = [] } = useUserCollections();
	const safeDeploymentFavorites = deploymentFavorites || [];
	const navigate = useNavigate({ from: '/kubernetes' });
	const search = useSearch({ from: '/kubernetes' });
	const activeTab = search.tab;

	// Derive active filter from query params - memoized to prevent re-renders
	const activeFilter = useMemo(() => {
		return search.namespace ? { id: 'namespace', value: search.namespace } : null;
	}, [search.namespace]);

	const handleFilterChange = useCallback((filter: { id: string; value: string } | null) => {
		navigate({
			to: '.',
			search: (prev: Record<string, unknown>) => ({
				...prev,
				namespace: filter ? filter.value : undefined,
			}),
		});
	}, [navigate]);

	const handleTabChange = useCallback((tab: KubernetesTab) => {
		navigate({
			to: '.',
			search: (prev: Record<string, unknown>) => ({
				...prev,
				tab,
				namespace: undefined, // Reset filter when switching tabs
			}),
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

	const currentFavorites = useMemo(() => {
		if (activeTab === 'favorites') return safeDeploymentFavorites;
		// For projects, we'll implement project switching or show all deployments from projects
		// To follow standard, let's show all deployments from all projects when in 'projects' tab
		// This might need more refinement (e.g. sub-tabs for projects) but for now let's keep it simple
		return Array.from(new Set(projects.flatMap(p => p.deployments || [])));
	}, [activeTab, safeDeploymentFavorites, projects]);

	const isEmpty = currentFavorites.length === 0;

	return (
		<PageLayout
			header={{
				title: "Kubernetes",
				searchComponent: isInstalled ? <DeploymentSearch /> : undefined,
				extra: (
					<IndustrialTabs
						options={[
							{ id: 'favorites', label: 'Favoritos' },
							{ id: 'projects', label: 'Proyectos' },
						]}
						activeId={activeTab}
						onChange={handleTabChange}
						className="w-48"
					/>
				)
			}}
			isLoading={isCheckingInstall && isEmpty}
			showEmptyState={isEmpty}
			emptyState={activeTab === 'favorites' ? {
				icon: <Star className="w-12 h-12 mx-auto mb-4 text-muted-foreground/20" />,
				label: "Sin favoritos",
				caption: "Agrega deployments a tus favoritos para verlos aquí y monitorear sus logs.",
				action: (
					<button
						type="button"
						onClick={() => {
							const input = document.querySelector('input[placeholder*="Búsqueda de deployments"]') as HTMLInputElement;
							if (input) {
								input.focus();
							}
						}}
						className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all text-xs font-bold uppercase tracking-wider shadow-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
					>
						<Search className="w-4 h-4" />
						Buscar Deployments
					</button>
				)
			} : {
				icon: <Layers className="w-12 h-12 mx-auto mb-4 text-muted-foreground/20" />,
				label: "Sin proyectos",
				caption: "Organiza tus deployments en proyectos para gestionarlos de forma agrupada.",
				action: (
					<button
						type="button"
						onClick={() => {
							const input = document.querySelector('input[placeholder*="Búsqueda de deployments"]') as HTMLInputElement;
							if (input) {
								input.focus();
							}
						}}
						className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all text-xs font-bold uppercase tracking-wider shadow-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
					>
						<Search className="w-4 h-4" />
						Asignar a Proyectos
					</button>
				)
			}}
		>
			<DeploymentList
				favorites={currentFavorites}
				activeFilter={activeFilter}
				onFilterChange={handleFilterChange}
				isKubectlInstalled={isInstalled}
			/>
		</PageLayout>
	);
}
