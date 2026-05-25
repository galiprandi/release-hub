import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { Search, Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { DeploymentList } from "@/components/kubernetes/DeploymentList";
import { DeploymentSearch } from "@/components/kubernetes/DeploymentSearch";
import { applyCachePolicy } from "@/lib/queryKeys";
import { PageLayout } from "@/layouts/PageLayout";
import { useUserCollections } from "@/hooks/useUserCollections";
import { useMemo, useCallback } from "react";

export const Route = createFileRoute("/kubernetes/")({
	component: KubernetesPage,
	validateSearch: (search: Record<string, unknown>) => {
		return {
			namespace: typeof search.namespace === 'string' ? search.namespace : undefined,
		};
	},
});

function KubernetesPage() {
	const { deploymentFavorites = [] } = useUserCollections();
	const safeDeploymentFavorites = deploymentFavorites || [];
	const navigate = useNavigate({ from: '/kubernetes' });
	const search = useSearch({ from: '/kubernetes' });

	// Derive active filter from query params - memoized to prevent re-renders
	const activeFilter = useMemo(() => {
		return search.namespace ? { id: 'namespace', value: search.namespace } : null;
	}, [search.namespace]);

	const handleFilterChange = useCallback((filter: { id: string; value: string } | null) => {
		navigate({
			to: '.',
			search: filter ? { namespace: filter.value } : {},
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

	return (
		<PageLayout
			header={{
				title: "Kubernetes",
				searchComponent: isInstalled ? <DeploymentSearch /> : undefined
			}}
			isLoading={isCheckingInstall && safeDeploymentFavorites.length === 0}
		>
			{safeDeploymentFavorites.length === 0 ? (
				<div className="flex items-center justify-center w-full min-h-[400px]">
					<div className="w-full border rounded-xl p-12 text-center text-muted-foreground bg-muted/20 border-dashed">
						<Star className="w-10 h-10 mx-auto mb-4 opacity-20" />
						<h3 className="text-lg font-medium text-foreground mb-1">Sin favoritos</h3>
						<p className="text-sm max-w-xs mx-auto mb-6">Agrega deployments a tus favoritos para verlos aquí y monitorear sus logs.</p>
						<button
							type="button"
							onClick={() => {
								const input = document.querySelector('input[placeholder*="Búsqueda de deployments"]') as HTMLInputElement;
								if (input) {
									input.focus();
								}
							}}
							className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
						>
							<Search className="w-4 h-4" />
							Buscar Deployments
						</button>
					</div>
				</div>
			) : (
				<DeploymentList
					favorites={safeDeploymentFavorites}
					activeFilter={activeFilter}
					onFilterChange={handleFilterChange}
					isKubectlInstalled={isInstalled}
				/>
			)}
		</PageLayout>
	);
}
