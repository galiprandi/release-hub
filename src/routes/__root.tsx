import { createRootRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useEffect, useState } from "react";
import { useGhCliSetup } from "@/hooks/useGhCliSetup";
import { LoadingSpinner } from "@/components/LoadingSpinner";

function RootLayout() {
	const { isInstalled, isAuthenticated, isLoading } = useGhCliSetup();
	const navigate = useNavigate();
	const routerState = useRouterState();
	const [showSpinner, setShowSpinner] = useState(true);

	useEffect(() => {
		const timer = setTimeout(() => setShowSpinner(false), 2000);
		return () => clearTimeout(timer);
	}, []);

	const pathname = routerState.location.pathname;

	useEffect(() => {
		if (!showSpinner && !isLoading && (!isInstalled || !isAuthenticated) && pathname !== '/fetcher') {
			navigate({ to: "/setup" });
		}
		else if (pathname === '/') {
			navigate({ to: "/github", replace: true });
		}
	}, [isInstalled, isAuthenticated, isLoading, showSpinner, navigate, pathname]);

	if (showSpinner) {
		return <LoadingSpinner />;
	}

	return (
		<>
			<Outlet />
			<TanStackRouterDevtools />
		</>
	);
}

export const Route = createRootRoute({
	component: RootLayout,
});
