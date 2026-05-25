import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/github")({
	component: GitHubLayout,
});

function GitHubLayout() {
	return <Outlet />;
}
