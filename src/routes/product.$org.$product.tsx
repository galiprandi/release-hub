import {
	createFileRoute,
	Link,
	Outlet,
	useRouterState,
} from "@tanstack/react-router";
import { Home, Star } from "lucide-react";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useFavorites } from "@/hooks/useFavorites";

export const Route = createFileRoute("/product/$org/$product")({
	component: ProductLayout,
});

function ProductLayout() {
	const { org, product } = Route.useParams();
	const fullProduct = `${org}/${product}`;
	const { isFavorite, toggleFavorite } = useFavorites();
	const favorite = isFavorite(fullProduct);
	const router = useRouterState();
	const currentPath = router.location.pathname;
	const isPipelinePage = currentPath.includes("/pipeline/");
	const stage = isPipelinePage
		? currentPath.split("/pipeline/")[1]?.split("/")[0]
		: null;

	return (
		<div className="max-w-6xl mx-auto px-6 py-8">
			{/* Breadcrumb Header */}
			<div className="flex items-center justify-between mb-10">
				<Breadcrumb>
					<BreadcrumbList>
						<BreadcrumbItem>
							<Link to="/">
								<Home className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
							</Link>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={() => toggleFavorite(fullProduct)}
									className="text-muted-foreground hover:text-yellow-400 transition-colors"
								>
									<Star
										className={`w-4 h-4 ${favorite ? "fill-yellow-400 text-yellow-400" : ""}`}
									/>
								</button>
								{isPipelinePage ? (
									<Link
										to="/product/$org/$product"
										params={{ org, product }}
										className="text-muted-foreground hover:text-foreground transition-colors"
									>
										{fullProduct}
									</Link>
								) : (
									<BreadcrumbPage>
										<a
											href={`https://github.com/${fullProduct}`}
											target="_blank"
											rel="noopener noreferrer"
											className="hover:text-foreground transition-colors"
										>
											{fullProduct}
										</a>
									</BreadcrumbPage>
								)}
							</div>
						</BreadcrumbItem>
						{isPipelinePage && stage && (
							<>
								<BreadcrumbSeparator />
								<BreadcrumbItem>
									<BreadcrumbPage className="capitalize">
										Pipeline ({stage})
									</BreadcrumbPage>
								</BreadcrumbItem>
							</>
						)}
					</BreadcrumbList>
				</Breadcrumb>
			</div>

			{/* Child Routes Render Here */}
			<Outlet />
		</div>
	);
}
