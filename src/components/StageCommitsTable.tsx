import { useEffect, useRef } from "react";
import { type GitCommit, useGitCommits } from "@/hooks/useGitCommits";
import { type GitTag, useGitTags } from "@/hooks/useGitTags";
import { DisplayInfo } from "./DisplayInfo";
import { CommitLink } from "./CommitLink";
import { TagLink } from "./TagLink";
import { Loader2 } from "lucide-react";


interface StageCommitsTableProps {
	viewMode: "commits" | "tags";
	org: string;
	product: string;
	showStatus?: boolean;
}

export function StageCommitsTable({
	viewMode,
	org,
	product,
	showStatus = true,
}: StageCommitsTableProps) {
	const fullRepo = `${org}/${product}`;
	const loadMoreRef = useRef<HTMLDivElement>(null);

	const { 
		commits, 
		isLoading: isLoadingCommits, 
		hasNextPage: hasNextPageCommits, 
		fetchNextPage: fetchNextPageCommits, 
		isFetchingNextPage: isFetchingNextPageCommits 
	} = useGitCommits({
		repo: fullRepo,
		enabled: viewMode === "commits",
	});

	const { 
		tags, 
		isLoading: isLoadingTags, 
		hasNextPage: hasNextPageTags, 
		fetchNextPage: fetchNextPageTags, 
		isFetchingNextPage: isFetchingNextPageTags 
	} = useGitTags({
		repo: fullRepo,
		enabled: viewMode === "tags",
	});

	const isCommits = viewMode === "commits";
	const isLoading = isCommits ? isLoadingCommits : isLoadingTags;
	const hasNextPage = isCommits ? hasNextPageCommits : hasNextPageTags;
	const fetchNextPage = isCommits ? fetchNextPageCommits : fetchNextPageTags;
	const isFetchingNextPage = isCommits ? isFetchingNextPageCommits : isFetchingNextPageTags;

	// Infinite scroll implementation
	useEffect(() => {
		if (!hasNextPage || isFetchingNextPage) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) {
					fetchNextPage();
				}
			},
			{ threshold: 0.1 }
		);

		const currentRef = loadMoreRef.current;
		if (currentRef) {
			observer.observe(currentRef);
		}

		return () => {
			if (currentRef) {
				observer.unobserve(currentRef);
			}
			observer.disconnect();
		};
	}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

	return (
		<div>
			<div className="overflow-hidden border rounded-lg">
				<table className="w-full text-sm">
					<thead className="bg-muted">
						<tr>
							<th className="px-4 py-2 text-left font-medium">
								{isCommits ? "Hash" : "Tag"}
							</th>
							<th className="px-4 py-2 text-left font-medium">Fecha</th>
							<th className="px-4 py-2 text-left font-medium">Autor</th>
							{isCommits && (
								<th className="px-4 py-2 text-left font-medium">Mensaje</th>
							)}
						</tr>
					</thead>
					<tbody>
						{isLoading && (!commits?.length && !tags?.length) ? (
							<tr>
								<td
									colSpan={4}
									className="px-4 py-8 text-center text-muted-foreground"
								>
									<div className="flex items-center justify-center gap-2">
										<Loader2 className="w-4 h-4 animate-spin" />
										Cargando información...
									</div>
								</td>
							</tr>
						) : isCommits ? (
							commits?.map((c: GitCommit) => (
								<tr key={c.hash} className="border-t hover:bg-muted/50 transition-colors">
									<td className="px-4 py-3">
										<CommitLink hash={c.hash} org={org} repo={product} showStatus={showStatus} />
									</td>
									<td className="px-4 py-3 text-muted-foreground">
										<DisplayInfo value={c.date} type="dates" />
									</td>
									<td className="px-4 py-3">
										<DisplayInfo value={c.author} type="author" maxChar={30} />
									</td>
									<td className="px-4 py-3 text-muted-foreground truncate max-w-[300px]">
										<DisplayInfo
											value={c.message}
											type="message"
											maxChar={50}
										/>
									</td>
								</tr>
							))
						) : (
							tags
								?.map((t: GitTag) => (
									<tr key={t.name} className="border-t hover:bg-muted/50 transition-colors">
										<td className="px-4 py-3">
											<TagLink tagName={t.name} org={org} repo={product} showStatus={showStatus} />
										</td>
										<td className="px-4 py-3 text-muted-foreground">
											<DisplayInfo value={t.date} type="dates" />
										</td>
										<td className="px-4 py-3">
											<DisplayInfo
												value={t.author.name}
												type="author"
												maxChar={50}
											/>
										</td>
									</tr>
								))
						)}
					</tbody>
				</table>
				
				{/* Infinite scroll sensor */}
				<div ref={loadMoreRef} className="flex items-center justify-center py-4 border-t text-xs text-muted-foreground">
					{isFetchingNextPage ? (
						<div className="flex items-center gap-2">
							<Loader2 className="w-3 h-3 animate-spin" />
							Cargando más...
						</div>
					) : hasNextPage ? (
						"Desliza para cargar más"
					) : (
						commits?.length || tags?.length ? "Fin del historial" : ""
					)}
				</div>
			</div>
		</div>
	);
}

