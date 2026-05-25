import { createFileRoute, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useCurlAccess } from "@/hooks/useCurlAccess";

export const Route = createFileRoute("/fetcher")({
	component: FetcherLayout,
});

function FetcherLayout() {
	const navigate = useNavigate();
	const { data: access } = useCurlAccess();
	const { location } = useRouterState();
	const isIndexRoute = location.pathname === "/fetcher";

	useEffect(() => {
		if (isIndexRoute && access && !access.isInstalled) {
			navigate({ to: "/fetcher/setup" });
		}
	}, [access, navigate, isIndexRoute]);

	return <Outlet />;
}
