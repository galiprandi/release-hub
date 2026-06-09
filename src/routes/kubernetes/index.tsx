import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { Search, Boxes } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { DeploymentList } from "@/components/kubernetes/DeploymentList";
import { DeploymentSearch } from "@/components/kubernetes/DeploymentSearch";
import { IndustrialTabs } from "@/components/shared/IndustrialTabs";
import { applyCachePolicy } from "@/lib/queryKeys";
import { PageLayout } from "@/layouts/PageLayout";
import { useUserCollections } from "@/hooks/useUserCollections";
import { useMemo, useCallback } from "react";

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
	const { deploymentFavorites = [], projects = [] } = useUserCollections();
	const safeDeploymentFavorites = deploymentFavorites || [];
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
			search: (prev: Record<string, unknown>) => ({ ...prev, namespace: filter?.value }),
		});
	}, [navigate]);

	const handleTabChange = useCallback((tab: 'favorites' | 'projects') => {
		navigate({
			to: '.',
			search: (prev: Record<string, unknown>) => ({ ...prev, tab, namespace: undefined }),
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

	const hasContent = activeTab === 'favorites' ? safeDeploymentFavorites.length > 0 : projects.some(p => p.deployments.length > 0);

	return (
		<PageLayout
			header={{
				title: "Kubernetes",
				searchComponent: isInstalled ? (
					<div className="flex items-center gap-4">
						<IndustrialTabs
							options={[
								{ id: 'favorites', label: 'Favoritos' },
								{ id: 'projects', label: 'Proyectos' },
							]}
							activeId={activeTab}
							onChange={handleTabChange}
							className="w-48"
						/>
						<DeploymentSearch />
					</div>
				) : undefined
			}}
			isLoading={isCheckingInstall && !hasContent}
			showEmptyState={!hasContent}
			emptyState={{
				icon: <Boxes className="w-12 h-12 mx-auto mb-4 text-muted-foreground/20" />,
				label: activeTab === 'favorites' ? "Sin favoritos" : "Sin despliegues en proyectos",
				caption: activeTab === 'favorites'
					? "Agrega deployments a tus favoritos para verlos aquí y monitorear sus logs."
					: "Organiza tus despliegues en proyectos para una mejor gestión centralizada.",
				action: (
					<button
						type="button"
						onClick={() => {
							const input = document.querySelector('input[name="search-deployments"]') as HTMLInputElement;
							if (input) {
								input.focus();
								input.click(); // Trigger editable state for DeploymentSearch
							}
						}}
						className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all text-[10px] font-bold uppercase tracking-widest shadow-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
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
