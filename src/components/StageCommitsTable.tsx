import { useEffect, useRef } from "react";
import { type GitCommit, useGitCommits } from "@/hooks/useGitCommits";
import { type GitTag, useGitTags } from "@/hooks/useGitTags";
import { DisplayInfo } from "./DisplayInfo";
import { CommitLink } from "./CommitLink";
import { TagLink } from "./TagLink";
import { Loader2 } from "lucide-react";

// Compare semantic versions (e.g., v2.0.7 > v1.0.24)
function compareVersions(a: string, b: string): number {
	const parseVersion = (v: string) => {
		const match = v.match(/v?(\d+)\.(\d+)\.(\d+)/);
		if (!match) return [0, 0, 0];
		return [
			parseInt(match[1], 10),
			parseInt(match[2], 10),
			parseInt(match[3], 10),
		];
	};

	const [majorA, minorA, patchA] = parseVersion(a);
	const [majorB, minorB, patchB] = parseVersion(b);

	if (majorB !== majorA) return majorB - majorA;
	if (minorB !== minorA) return minorB - minorA;
	return patchB - patchA;
}

interface StageCommitsTableProps {
	stage: "staging" | "production";
	org: string;
	product: string;
}

export function StageCommitsTable({
	stage,
	org,
	product,
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
		enabled: stage === "staging",
	});

	const { 
		tags, 
		isLoading: isLoadingTags, 
		hasNextPage: hasNextPageTags, 
		fetchNextPage: fetchNextPageTags, 
		isFetchingNextPage: isFetchingNextPageTags 
	} = useGitTags({
		repo: fullRepo,
		enabled: stage === "production",
	});

	const isStaging = stage === "staging";
	const isLoading = isStaging ? isLoadingCommits : isLoadingTags;
	const hasNextPage = isStaging ? hasNextPageCommits : hasNextPageTags;
	const fetchNextPage = isStaging ? fetchNextPageCommits : fetchNextPageTags;
	const isFetchingNextPage = isStaging ? isFetchingNextPageCommits : isFetchingNextPageTags;

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
								{isStaging ? "Hash" : "Tag"}
							</th>
							<th className="px-4 py-2 text-left font-medium">Fecha</th>
							<th className="px-4 py-2 text-left font-medium">Autor</th>
							{isStaging && (
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
						) : isStaging ? (
							commits?.map((c: GitCommit) => (
								<tr key={c.hash} className="border-t hover:bg-muted/50 transition-colors">
									<td className="px-4 py-3">
										<CommitLink hash={c.hash} org={org} repo={product} />
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
											<TagLink tagName={t.name} org={org} repo={product} />
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

