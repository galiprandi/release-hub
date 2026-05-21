import { createRootRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Github, Star, Activity, Loader2, Blocks } from "lucide-react";
import { useEffect, useState } from "react";
import { RepoSearch } from "@/components/RepoSearch";
import { NovedadesDialog } from "@/components/NovedadesDialog";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { SettingsDialog } from "@/components/SettingsDialog";
import { useDockerAccess } from "@/hooks/useDockerAccess";
import { useGitUser } from "@/hooks/useGitUser";
import { useGhCliSetup } from "@/hooks/useGhCliSetup";
import { useUserCollections } from "@/hooks/useUserCollections";
import { useUserReposSummary } from "@/hooks/useUserReposSummary";

function UserAvatar() {
	const { data: user, isLoading } = useGitUser();

	if (isLoading) {
		return (
			<div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
		);
	}

	if (user?.avatar_url) {
		return (
			<img
				src={user.avatar_url}
				alt={user.name || "Usuario"}
				className="w-8 h-8 rounded-full"
			/>
		);
	}

	const initials = user?.name
		? user.name
				.split(" ")
				.map((n: string) => n[0])
				.join("")
				.toUpperCase()
				.slice(0, 2)
		: "?";

	return (
		<div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-medium">
			{initials}
		</div>
	);
}

function DockerLink() {
	const { data: access, isLoading: checkingAccess } = useDockerAccess();

	// Don't show the Docker icon if Docker is not installed or accessible
	if (!checkingAccess && !access?.hasAccess) {
		return null;
	}

	return (
		<Link
			to="/docker"
			className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
			title="Docker Manager"
		>
			<Blocks className="w-5 h-5" />
		</Link>
	);
}

function RootLayout() {
	const { isInstalled, isAuthenticated, isLoading } = useGhCliSetup();
	const navigate = useNavigate();
	const routerState = useRouterState();
	const { isFavorite, toggleFavorite } = useUserCollections();
	const { data: summaryData } = useUserReposSummary();
	const [showSpinner, setShowSpinner] = useState(true);

	useEffect(() => {
		// Hide spinner after 2000ms minimum for visual feedback
		const timer = setTimeout(() => setShowSpinner(false), 2000);
		return () => clearTimeout(timer);
	}, []);

	// Extract product name from route if on product page
	const pathname = routerState.location.pathname;
	const productMatch = pathname.match(/\/product\/([^/]+)\/([^/]+)/);
	const org = productMatch ? productMatch[1] : null;
	const product = productMatch ? productMatch[2] : null;
	const fullProduct = org && product ? `${org}/${product}` : null;
	const favorite = fullProduct ? isFavorite(fullProduct) : false;

	// Detect if on health page
	const isHealthPage = pathname === '/health';
	// Detect if on docker page
	const isDockerPage = pathname === '/docker';

	useEffect(() => {
		// Si gh cli no está instalado o no está autenticado, redirigir a setup
		if (!showSpinner && !isLoading && (!isInstalled || !isAuthenticated)) {
			navigate({ to: "/setup" });
		}
	}, [isInstalled, isAuthenticated, isLoading, showSpinner, navigate]);

	// Show loading spinner during initial load
	if (showSpinner) {
		return (
			<div className="min-h-screen bg-background flex items-center justify-center">
				<div className="flex flex-col items-center gap-4">
					<Loader2 className="w-8 h-8 animate-spin text-primary" />
					<p className="text-muted-foreground text-sm">Verificando configuración de GitHub CLI...</p>
				</div>
			</div>
		);
	}

	return (
		<>
			<div className="min-h-screen bg-background flex flex-col">
				<header className="border-b px-4 py-3">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<Link to="/" className="text-2xl font-bold hover:text-primary flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1 rounded-md transition-colors">
								<div className="p-1.5 rounded-lg bg-primary/10">
									<Github className="w-6 h-6 text-primary" />
								</div>
								ReleaseHub
							</Link>
							{(product || isHealthPage || isDockerPage) && (
								<>
									<span className="text-muted-foreground text-lg">/</span>
									<span className="text-lg font-normal text-muted-foreground flex items-center gap-2">
										{isHealthPage && (
											<div className="p-1.5 rounded-lg bg-primary/10">
												<Activity className="w-4 h-4 text-primary" />
											</div>
										)}
										{isDockerPage && (
											<div className="p-1.5 rounded-lg bg-primary/10">
												<Blocks className="w-4 h-4 text-primary" />
											</div>
										)}
										{product && (
											<button
												type="button"
												onClick={() => fullProduct && toggleFavorite(fullProduct)}
												className={`${favorite ? "text-yellow-500" : "text-muted-foreground"} hover:text-yellow-600 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1 rounded-md transition-all`}
												title={favorite ? "Eliminar de favoritos" : "Agregar a favoritos"}
											>
												<Star className={`w-5 h-5 ${favorite ? "fill-current" : ""}`} />
											</button>
										)}
										{isHealthPage ? 'Health Monitor' : isDockerPage ? 'Docker Manager' : product}
									</span>
								</>
							)}
						</div>
						<div className="flex items-center gap-4">
							<FeedbackDialog />
							<NovedadesDialog />							
							<RepoSearch />
							<DockerLink />
							<Link
								to="/health"
								className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
								title="Health Monitor"
							>
								<Activity className="w-5 h-5" />
							</Link>
							<SettingsDialog />
							<UserAvatar />
						</div>
					</div>
				</header>
				<main className="p-4 pt-8 flex-1">
					<Outlet />
				</main>
				<footer className="p-4 pt-0 text-right">
					<div className="flex items-center justify-end gap-4">
						{summaryData && (
							<span className="text-[10px] text-muted-foreground">
								{summaryData.total} repos accesibles
								{summaryData.orgs.length > 0 && (
									<span className="ml-2">
										({summaryData.orgs.length} orgs
										{summaryData.personal > 0 && ` + ${summaryData.personal} personales`})
									</span>
								)}
							</span>
						)}
						<a
							href="https://github.com/galiprandi/release-hub"
							target="_blank"
							rel="noopener noreferrer"
							className="text-[10px] text-muted-foreground hover:text-primary transition-colors"
						>
							ReleaseHub Open Source
						</a>
					</div>
				</footer>
			</div>
			<TanStackRouterDevtools />
		</>
	);
}

export const Route = createRootRoute({
	component: RootLayout,
});
