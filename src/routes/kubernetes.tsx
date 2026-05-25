import { createFileRoute, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { checkKubectlInstalled } from "@/api/kubectl";
import { applyCachePolicy } from "@/lib/queryKeys";

export const Route = createFileRoute("/kubernetes")({
	component: KubernetesLayout,
});

function KubernetesLayout() {
	const navigate = useNavigate();
	const { location } = useRouterState();
	const isIndexRoute = location.pathname === "/kubernetes";

	const { data: isInstalled } = useQuery({
		queryKey: ["kubectl", "installed"],
		queryFn: checkKubectlInstalled,
		...applyCachePolicy("kubectl"),
	});

	useEffect(() => {
		if (isIndexRoute && isInstalled === false) {
			navigate({ to: "/kubernetes/setup" });
		}
	}, [isInstalled, navigate, isIndexRoute]);

	return <Outlet />;
}
