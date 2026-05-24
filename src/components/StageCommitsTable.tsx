import { useEffect, useRef } from "react";
import { type GitCommit, useGitCommits } from "@/hooks/useGitCommits";
import { type GitTag, useGitTags } from "@/hooks/useGitTags";
import { DisplayInfo } from "./DisplayInfo";
import { CommitLink } from "./CommitLink";
import { TagLink } from "./TagLink";
import { Table } from "@/components/ui/Table";
import type { ColumnDef } from "@tanstack/react-table";
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
			{isLoading && (!commits?.length && !tags?.length) ? (
				<div className="overflow-hidden border rounded-lg">
					<div className="px-4 py-8 text-center text-muted-foreground">
						<div className="flex items-center justify-center gap-2">
							<Loader2 className="w-4 h-4 animate-spin" />
							Cargando información...
						</div>
					</div>
				</div>
			) : (
				<>
					{isCommits ? (
						<CommitsTable commits={commits || []} org={org} repo={product} showStatus={showStatus} />
					) : (
						<TagsTable tags={tags || []} org={org} repo={product} showStatus={showStatus} />
					)}

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
				</>
			)}
		</div>
	);
}

function CommitsTable({
	commits,
	org,
	repo,
	showStatus,
}: {
	commits: GitCommit[]
	org: string
	repo: string
	showStatus?: boolean
}) {
	const columns: ColumnDef<GitCommit>[] = [
		{
			accessorKey: "hash",
			header: "Hash",
			cell: ({ row }) => <CommitLink hash={row.original.hash} org={org} repo={repo} showStatus={showStatus} />,
		},
		{
			accessorKey: "date",
			header: "Fecha",
			cell: ({ row }) => <DisplayInfo value={row.original.date} type="dates" />,
		},
		{
			accessorKey: "author",
			header: "Autor",
			cell: ({ row }) => <DisplayInfo value={row.original.author} type="author" maxChar={30} />,
		},
		{
			accessorKey: "message",
			header: "Mensaje",
			cell: ({ row }) => (
				<span className="text-muted-foreground truncate max-w-[300px]">
					<DisplayInfo value={row.original.message} type="message" maxChar={50} />
				</span>
			),
		},
	]

	return <Table columns={columns} data={commits} />
}

function TagsTable({
	tags,
	org,
	repo,
	showStatus,
}: {
	tags: GitTag[]
	org: string
	repo: string
	showStatus?: boolean
}) {
	const columns: ColumnDef<GitTag>[] = [
		{
			accessorKey: "name",
			header: "Tag",
			cell: ({ row }) => <TagLink tagName={row.original.name} org={org} repo={repo} showStatus={showStatus} />,
		},
		{
			accessorKey: "date",
			header: "Fecha",
			cell: ({ row }) => <DisplayInfo value={row.original.date} type="dates" />,
		},
		{
			accessorKey: "author",
			header: "Autor",
			cell: ({ row }) => <DisplayInfo value={row.original.author.name} type="author" maxChar={50} />,
		},
	]

	return <Table columns={columns} data={tags} />
}
