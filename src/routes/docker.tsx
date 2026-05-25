import { createFileRoute, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useDockerAccess } from "@/hooks/useDockerAccess";

export const Route = createFileRoute("/docker")({
	component: DockerLayout,
});

function DockerLayout() {
	const navigate = useNavigate();
	const { data: access } = useDockerAccess();
	const { location } = useRouterState();
	const isIndexRoute = location.pathname === "/docker";

	useEffect(() => {
		if (isIndexRoute && access && !access.isInstalled) {
			navigate({ to: "/docker/setup" });
		}
	}, [access, navigate, isIndexRoute]);

	return <Outlet />;
}
