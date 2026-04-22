import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { RepoSearch } from "@/components/RepoSearch";
import { useGitUser } from "@/hooks/useGitUser";

function UserAvatar() {
	const { data: user, isLoading } = useGitUser();

	if (isLoading) {
		return (
			<div className="flex items-center gap-2 text-sm text-muted-foreground">
				<div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
				<span>Cargando...</span>
			</div>
		);
	}

	const displayName = user?.name
		? user.name.length > 17
			? user.name.slice(0, 17) + "..."
			: user.name
		: "Sin nombre";

	if (user?.avatar_url) {
		return (
			<div className="flex items-center gap-2">
				<img
					src={user.avatar_url}
					alt={displayName}
					className="w-8 h-8 rounded-full"
				/>
				<span className="text-sm font-medium hidden sm:inline">
					{displayName}
				</span>
			</div>
		);
	}

	const initials = displayName
		? displayName
				.split(" ")
				.map((n) => n[0])
				.join("")
				.toUpperCase()
				.slice(0, 2)
		: "?";

	return (
		<div className="flex items-center gap-2">
			<div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-medium">
				{initials}
			</div>
			<span className="text-sm font-medium hidden sm:inline">
				{displayName}
			</span>
		</div>
	);
}

export const Route = createRootRoute({
	component: () => (
		<>
			<div className="min-h-screen bg-background">
				<header className="border-b px-4 py-3">
					<div className="flex items-center justify-between">
						<Link to="/" className="text-xl font-bold hover:text-primary">
							Repo Dash
						</Link>
						<div className="flex items-center gap-4">
							<RepoSearch />
							<UserAvatar />
						</div>
					</div>
				</header>
				<main className="p-4">
					<Outlet />
				</main>
			</div>
			<TanStackRouterDevtools />
		</>
	),
});
