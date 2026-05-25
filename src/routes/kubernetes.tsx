import { createFileRoute } from "@tanstack/react-router";
import { Search, Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { DeploymentList } from "@/components/DeploymentList";
import { DeploymentSearch } from "@/components/DeploymentSearch";
import { checkKubectlInstalled } from "@/api/kubectl";
import { applyCachePolicy } from "@/lib/queryKeys";
import { StatusCard } from "@/components/ui/StatusCard";
import { PageLayout } from "../layouts/PageLayout";
import { useUserCollections } from "@/hooks/useUserCollections";

export const Route = createFileRoute("/kubernetes")({
	component: KubernetesPage,
});

function KubernetesPage() {
	const { deploymentFavorites = [] } = useUserCollections();
	const safeDeploymentFavorites = deploymentFavorites || [];

	const { data: isInstalled, isLoading: checkingInstall } = useQuery({
		queryKey: ["kubectl", "installed"],
		queryFn: checkKubectlInstalled,
		...applyCachePolicy("kubectl"),
	});

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
				{(!checkingInstall && isInstalled) ? (
					<DeploymentList favorites={safeDeploymentFavorites} />
				) : null}
			</div>
		</PageLayout>
	);
}
