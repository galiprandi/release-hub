import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { Search, Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { DeploymentList } from "@/components/DeploymentList";
import { DeploymentSearch } from "@/components/DeploymentSearch";
import { checkKubectlInstalled } from "@/api/kubectl";
import { applyCachePolicy } from "@/lib/queryKeys";
import { StatusCard } from "@/components/ui/StatusCard";
import { PageLayout } from "../../layouts/PageLayout";
import { useUserCollections } from "@/hooks/useUserCollections";
import { useMemo, useCallback, useEffect } from "react";

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

	const { data: isInstalled, isLoading: checkingInstall } = useQuery({
		queryKey: ["kubectl", "installed"],
		queryFn: checkKubectlInstalled,
		...applyCachePolicy("kubectl"),
	});

	useEffect(() => {
		if (isInstalled === false) {
			navigate({ to: '/kubernetes/setup' });
		}
	}, [isInstalled, navigate]);

	return (
		<PageLayout
			header={{
				title: "Kubernetes",
				searchComponent: <DeploymentSearch />
			}}
			emptyState={safeDeploymentFavorites.length === 0 ? {
				show: true,
				icon: <Star className="w-10 h-10 mx-auto mb-4 opacity-20" />,
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
						className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
					>
						<Search className="w-4 h-4" />
						Buscar Deployments
					</button>
				)
			} : undefined}
		>
			<div className="space-y-6">
				{checkingInstall ? (
					<StatusCard type="loading" message="Verificando kubectl..." />
				) : isInstalled ? (
					<DeploymentList
						favorites={safeDeploymentFavorites}
						activeFilter={activeFilter}
						onFilterChange={handleFilterChange}
					/>
				) : (
					<StatusCard
						type="error"
						message="kubectl no está instalado. Instálalo para gestionar deployments de Kubernetes."
					/>
				)}
			</div>
		</PageLayout>
	);
}
