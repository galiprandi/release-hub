import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2, Star, Github } from "lucide-react";
import { DisplayInfo } from "@/components/DislpayInfo";
import { CommitLink } from "@/components/CommitLink";
import { TagLink } from "@/components/TagLink";
import { useFavorites } from "@/hooks/useFavorites";
import { useGitCommits } from "@/hooks/useGitCommits";
import { useGitTagsSimple } from "@/hooks/useGitTagsSimple";

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
				<p>No hay favoritos</p>
				<p className="text-sm">
					Agrega repositorios a favoritos desde el buscador
				</p>
			</div>
		);
	}

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
							Actualizado
						</th>
						<th className="px-4 py-2 text-left text-sm font-medium">Autor</th>
						<th className="px-4 py-2 text-center text-sm font-medium">
							Acciones
						</th>
					</tr>
				</thead>
				<tbody>
					{repos.map((repo) => (
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

function RepoRow({ repo, isFavorite, onToggleFavorite }: RepoRowProps) {
	const [org, name] = repo.fullName.split("/");

	const { latestCommit, isLoading: isLoadingCommits } = useGitCommits({
		repo: repo.fullName,
	});
	const { latestTag, isLoading: isLoadingTags } = useGitTagsSimple({
		repo: repo.fullName,
	});

	const commitShortHash = latestCommit?.shortHash;
	const commitAuthor = latestCommit?.author;
	const commitDate = latestCommit?.date;

	// En el home solo usamos fecha del commit (tags simples no tienen fecha)
	const latestDate = commitDate;

	const isLoading = isLoadingCommits || isLoadingTags;

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
						Cargando...
					</div>
				</td>
				<td className="px-4 py-3 text-center">
					<div className="flex items-center justify-center gap-2">
						<a
							href={`https://github.com/${org}/${name}`}
							target="_blank"
							rel="noopener noreferrer"
							className="text-muted-foreground hover:text-primary"
							title="Ver en GitHub"
						>
							<Github className="w-5 h-5" />
						</a>
						<button
							type="button"
							onClick={() => onToggleFavorite(repo.fullName)}
							className={`${isFavorite ? "text-yellow-500" : "text-muted-foreground"} hover:text-yellow-600`}
							title={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
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
				{latestTag?.name && <TagLink tagName={latestTag.name} org={org} repo={name} />}
			</td>
			<td className="px-4 py-3">
				{commitShortHash && <CommitLink hash={commitShortHash} org={org} repo={name} />}
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
						title="Ver en GitHub"
					>
						<Github className="w-5 h-5" />
					</a>
					<button
						type="button"
						onClick={() => onToggleFavorite(repo.fullName)}
						className={`${isFavorite ? "text-yellow-500" : "text-muted-foreground"} hover:text-yellow-600`}
						title={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
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
