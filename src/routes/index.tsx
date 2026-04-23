import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2, Star, Github } from "lucide-react";
import { DisplayInfo } from "@/components/DisplayInfo";
import { CommitLink } from "@/components/CommitLink";
import { TagLink } from "@/components/TagLink";
import { useFavorites } from "@/hooks/useFavorites";
import { useGitCommits } from "@/hooks/useGitCommits";
import { useGitTagsSimple } from "@/hooks/useGitTagsSimple";
import { usePipeline, usePipelineWithTag } from "@/hooks/usePipeline";

export const Route = createFileRoute("/")({
	component: Dashboard,
});

function Dashboard() {
	const { favorites, toggleFavorite } = useFavorites();

	const favoriteRepos = favorites
		.filter((f) => f.includes("/"))
		.map((f) => ({
			fullName: f,
			name: f.split("/")[1],
			description: "",
			updatedAt: "",
		}));

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-lg font-bold">Favoritos</h1>
			</div>

			{/* Favorites Table */}
			<section>
				<ReposTable
					repos={favoriteRepos}
					favorites={favorites}
					onToggleFavorite={toggleFavorite}
				/>
			</section>
		</div>
	);
}

function ReposTable({ repos, favorites, onToggleFavorite }: ReposTableProps) {
	if (repos.length === 0) {
		return (
			<div className="border rounded-lg p-8 text-center text-muted-foreground">
				<Star className="w-8 h-8 mx-auto mb-2 opacity-50" />
				<p>Sin favoritos</p>
				<p className="text-sm">
					Búsqueda de repositorios para agregar a favoritos
				</p>
			</div>
		);
	}

	// Ordenar repositorios alfabéticamente por fullName
	const sortedRepos = [...repos].sort((a, b) => a.fullName.localeCompare(b.fullName));

	return (
		<div className="border rounded-lg overflow-hidden">
			<table className="w-full">
				<thead className="bg-muted">
					<tr>
						<th className="px-4 py-2 text-left text-sm font-medium">
							Repositorio
						</th>
						<th className="px-4 py-2 text-left text-sm font-medium">Tag</th>
						<th className="px-4 py-2 text-left text-sm font-medium">Commit</th>
						<th className="px-4 py-2 text-left text-sm font-medium">
							Actualización
						</th>
						<th className="px-4 py-2 text-left text-sm font-medium">Autor</th>
						<th className="px-4 py-2 text-center text-sm font-medium">
							Acciones
						</th>
					</tr>
				</thead>
				<tbody>
					{sortedRepos.map((repo) => (
						<RepoRow
							key={repo.fullName}
							repo={repo}
							isFavorite={favorites.includes(repo.fullName)}
							onToggleFavorite={onToggleFavorite}
						/>
					))}
				</tbody>
			</table>
		</div>
	);
}

// Función helper para determinar el estado del deploy basado en subevents de deploy
function getDeployStatus(events: any[]) {
	if (!events || events.length === 0) return undefined;

	const lastEvent = events[events.length - 1];

	// Si el último evento no es CD (Despliegue), usar su estado
	if (lastEvent.id !== "CD") {
		return lastEvent.state;
	}

	// Filtrar solo subevents de deploy (DEPLOY_*)
	const deploySubevents = lastEvent.subevents?.filter((se: { id: string }) => se.id.startsWith("DEPLOY_")) || [];

	if (deploySubevents.length === 0) {
		return lastEvent.state;
	}

	// Determinar el estado basado en los subevents de deploy
	const hasFailed = deploySubevents.some((se: { state: string }) => se.state === "FAILED");
	const hasWarn = deploySubevents.some((se: { state: string }) => se.state === "WARN");
	const allSuccess = deploySubevents.every((se: { state: string }) => se.state === "SUCCESS");

	if (hasFailed) return "FAILED";
	if (hasWarn) return "WARN";
	if (allSuccess) return "SUCCESS";
	return lastEvent.state;
}

function RepoRow({ repo, isFavorite, onToggleFavorite }: RepoRowProps) {
	const [org, name] = repo.fullName.split("/");

	const { latestCommit, isLoading: isLoadingCommits } = useGitCommits({
		repo: repo.fullName,
	});
	const { latestTag, isLoading: isLoadingTags } = useGitTagsSimple({
		repo: repo.fullName,
	});

	// Obtener estado del pipeline usando los mismos hooks que SekiMonitor (reaprovechar cache)
	const stagingPipeline = usePipeline({
		product: repo.fullName,
		commit: latestCommit?.hash ?? "",
		enabled: !!latestCommit?.hash,
	});

	const prodPipeline = usePipelineWithTag({
		product: repo.fullName,
		commit: latestCommit?.hash ?? "",
		tag: latestTag?.name ?? "",
		enabled: !!latestCommit?.hash && !!latestTag?.name,
	});

	const commitShortHash = latestCommit?.shortHash;
	const commitAuthor = latestCommit?.author;
	const commitDate = latestCommit?.date;

	// En el home solo usamos fecha del commit (tags simples no tienen fecha)
	const latestDate = commitDate;

	// Extraer información del pipeline para staging - usar el último evento (despliegue)
	const stagingStatus = stagingPipeline.data ? {
		status: getDeployStatus(stagingPipeline.data.events),
		updatedAt: stagingPipeline.data.updated_at,
		failedStage: stagingPipeline.data.events.find((e: { state: string }) => e.state === "FAILED")?.label.es,
		errorDetail: stagingPipeline.data.events.find((e: { state: string }) => e.state === "FAILED")?.markdown,
	} : { status: undefined };

	// Extraer información del pipeline para production - usar el último evento (despliegue)
	const productionStatus = prodPipeline.data ? {
		status: getDeployStatus(prodPipeline.data.events),
		updatedAt: prodPipeline.data.updated_at,
		failedStage: prodPipeline.data.events.find((e: { state: string }) => e.state === "FAILED")?.label.es,
		errorDetail: prodPipeline.data.events.find((e: { state: string }) => e.state === "FAILED")?.markdown,
	} : { status: undefined };

	const isLoading = isLoadingCommits || isLoadingTags;
	const isStagingLoading = stagingPipeline.isLoading;
	const isProdLoading = prodPipeline.isLoading;

	if (isLoading) {
		return (
			<tr className="border-t">
				<td className="px-4 py-3">
					<Link
						to="/product/$org/$product"
						params={{ org, product: name }}
						search={{ stage: "staging", event: "commit" }}
						className="font-medium hover:text-primary"
					>
						{repo.fullName}
					</Link>
				</td>
				<td colSpan={4} className="px-4 py-3">
					<div className="flex items-center gap-2 text-muted-foreground text-sm">
						<Loader2 className="w-4 h-4 animate-spin" />
						Cargando información...
					</div>
				</td>
				<td className="px-4 py-3 text-center">
					<div className="flex items-center justify-center gap-2">
						<a
							href={`https://github.com/${org}/${name}`}
							target="_blank"
							rel="noopener noreferrer"
							className="text-muted-foreground hover:text-primary"
							title="Abrir en GitHub"
						>
							<Github className="w-5 h-5" />
						</a>
						<button
							type="button"
							onClick={() => onToggleFavorite(repo.fullName)}
							className={`${isFavorite ? "text-yellow-500" : "text-muted-foreground"} hover:text-yellow-600`}
							title={isFavorite ? "Eliminar de favoritos" : "Agregar a favoritos"}
						>
							<Star className={`w-5 h-5 ${isFavorite ? "fill-current" : ""}`} />
						</button>
					</div>
				</td>
			</tr>
		);
	}

	return (
		<tr className="border-t hover:bg-muted/50">
			<td className="px-4 py-3">
				<Link
					to="/product/$org/$product"
					params={{ org, product: name }}
					search={{ stage: "staging", event: "commit" }}
					className="font-medium hover:text-primary"
				>
					{repo.fullName}
				</Link>
			</td>
			<td className="px-4 py-3">
				{latestTag?.name && (
					<TagLink
						tagName={latestTag.name}
						org={org}
						repo={name}
						pipelineStatus={productionStatus}
						isLoading={isProdLoading}
					/>
				)}
			</td>
			<td className="px-4 py-3">
				{commitShortHash && (
					<CommitLink
						hash={commitShortHash}
						org={org}
						repo={name}
						pipelineStatus={stagingStatus}
						isLoading={isStagingLoading}
					/>
				)}
			</td>
			<td className="px-4 py-3 text-sm text-muted-foreground">
				<div className="flex items-center gap-1">
					<DisplayInfo type="dates" value={latestDate} />
				</div>
			</td>
			<td className="px-4 py-3 text-sm">
				<DisplayInfo type="author" value={commitAuthor} maxChar={20} />
			</td>
			<td className="px-4 py-3 text-center">
				<div className="flex items-center justify-center gap-2">
					<a
						href={`https://github.com/${org}/${name}`}
						target="_blank"
						rel="noopener noreferrer"
						className="text-muted-foreground hover:text-primary"
						title="Abrir en GitHub"
					>
						<Github className="w-5 h-5" />
					</a>
					<button
						type="button"
						onClick={() => onToggleFavorite(repo.fullName)}
						className={`${isFavorite ? "text-yellow-500" : "text-muted-foreground"} hover:text-yellow-600`}
						title={isFavorite ? "Eliminar de favoritos" : "Agregar a favoritos"}
					>
						<Star className={`w-5 h-5 ${isFavorite ? "fill-current" : ""}`} />
					</button>
				</div>
			</td>
		</tr>
	);
}

type RepoInfo = {
	fullName: string;
	name: string;
	description: string;
	updatedAt: string;
};
type ReposTableProps = {
	repos: RepoInfo[];
	favorites: string[];
	onToggleFavorite: (product: string) => void;
};
type RepoRowProps = {
	repo: RepoInfo;
	isFavorite: boolean;
	onToggleFavorite: (product: string) => void;
};
