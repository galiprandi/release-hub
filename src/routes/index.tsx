import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2, Star, Github, Building2 } from "lucide-react";
import { DisplayInfo } from "@/components/DisplayInfo";
import { CommitLink } from "@/components/CommitLink";
import { TagLink } from "@/components/TagLink";
import { PromoteDialog } from "@/components/PromoteDialog";
import { ForceRedeployDialog } from "@/components/ForceRedeployDialog";
import { FreezeDialog } from "@/components/FreezeDialog";
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
		.map((f) => {
			const [org, name] = f.split("/");
			return {
				fullName: f,
				name,
				org,
				description: "",
				updatedAt: "",
			};
		});

	// Group repos by organization
	const groupedRepos = favoriteRepos.reduce((acc, repo) => {
		if (!acc[repo.org]) {
			acc[repo.org] = [];
		}
		acc[repo.org].push(repo);
		return acc;
	}, {} as Record<string, typeof favoriteRepos>);

	// Sort organizations alphabetically
	const sortedOrgs = Object.keys(groupedRepos).sort();

	if (favorites.length === 0) {
		return (
			<div className="border rounded-xl p-12 text-center text-muted-foreground bg-muted/20 border-dashed">
				<Star className="w-10 h-10 mx-auto mb-4 opacity-20" />
				<h3 className="text-lg font-medium text-foreground mb-1">Sin favoritos</h3>
				<p className="text-sm max-w-xs mx-auto">
					Busca repositorios usando la barra superior para agregarlos a tu panel principal.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-10">
			{sortedOrgs.map(org => (
				<section key={org} className="space-y-3">
					<h2 className="text-lg font-semibold text-foreground px-4 flex items-center gap-2">
						<Building2 className="w-5 h-5" />
						{org}
					</h2>
					<ReposTable
						repos={groupedRepos[org]}
						favorites={favorites}
						onToggleFavorite={toggleFavorite}
					/>
				</section>
			))}
		</div>
	);
}

function ReposTable({ repos, favorites, onToggleFavorite }: ReposTableProps) {
	// Ordenar repositorios alfabéticamente por name (ya que ya están filtrados por org)
	const sortedRepos = [...repos].sort((a, b) => a.name.localeCompare(b.name));

	return (
		<div className="border rounded-lg overflow-hidden">
			<table className="w-full">
				<thead className="bg-muted">
					<tr>
						<th className="px-4 py-2 text-left text-sm font-medium w-auto">
							Repositorio
						</th>
						<th className="px-4 py-2 text-left text-sm font-medium w-20">Tag</th>
						<th className="px-4 py-2 text-left text-sm font-medium w-20">Commit</th>
						<th className="px-4 py-2 text-left text-sm font-medium w-36">
							Actualización
						</th>
						<th className="px-4 py-2 text-left text-sm font-medium" style={{ width: '250px' }}>Autor</th>
						<th className="px-4 py-2 text-center text-sm font-medium w-16">
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
function getDeployStatus(events: { state: string; id: string; subevents?: { id: string; state: string }[] }[]) {
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
				<td className="px-4 py-3 w-auto">
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
				<td className="px-4 py-3 text-center w-16">
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
			<td className="px-4 py-3 w-auto">
				<div className="flex items-center gap-2">
					<Link
						to="/product/$org/$product"
						params={{ org, product: name }}
						search={{ stage: "staging", event: "commit" }}
						className="font-medium hover:text-primary"
					>
						{name}
					</Link>
					{latestCommit?.hash && prodPipeline.data?.git?.commit && latestCommit.hash !== prodPipeline.data.git.commit && (
						<span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded border border-yellow-200 font-medium">
							Pendiente
						</span>
					)}
				</div>
			</td>
			<td className="px-4 py-3 w-20">
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
			<td className="px-4 py-3 w-20">
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
			<td className="px-4 py-3 text-sm text-muted-foreground w-36">
				<div className="flex items-center gap-1">
					<DisplayInfo type="dates" value={latestDate} />
				</div>
			</td>
			<td className="px-4 py-3 text-sm" style={{ width: '250px' }}>
				<div className="truncate" title={commitAuthor || undefined}>
					<DisplayInfo type="author" value={commitAuthor} hideTooltip={true} />
				</div>
			</td>
			<td className="px-4 py-3 text-center w-16">
				<div className="flex items-center justify-center gap-2">
					<FreezeDialog repo={repo.fullName} iconOnly={true} />
					<ForceRedeployDialog repo={repo.fullName} iconOnly={true} />
					<PromoteDialog repo={repo.fullName} latestTag={latestTag?.name} iconOnly={true} />
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
