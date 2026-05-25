import { createRootRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useEffect, useState } from "react";
import { LoadingSpinner } from "@/components/LoadingSpinner";

function RootLayout() {
	const navigate = useNavigate();
	const routerState = useRouterState();
	const [showSpinner, setShowSpinner] = useState(true);

	useEffect(() => {
		const timer = setTimeout(() => setShowSpinner(false), 2000);
		return () => clearTimeout(timer);
	}, []);

	const pathname = routerState.location.pathname;

	useEffect(() => {
		if (pathname === '/') {
			navigate({ to: "/github", replace: true });
		}
	}, [navigate, pathname]);

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
