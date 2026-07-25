import { useEffect, useRef } from "react";
import { type GitCommit, useGitCommits } from "@/hooks/useGitCommits";
import { type GitTag, useGitTags } from "@/hooks/useGitTags";
import { DisplayInfo } from "@/components/shared/DisplayInfo";
import { CommitLink } from "./CommitLink";
import { TagLink } from "./TagLink";
import { Table } from "@/components/ui/Table";
import type { ColumnDef } from "@tanstack/react-table";
import { Loader2 } from "lucide-react";
import { StatusCard } from "@/components/ui/StatusCard";


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
		<div className="space-y-4">
			{isLoading && (!commits?.length && !tags?.length) ? (
				<StatusCard type="loading" message="Cargando historial..." />
			) : (
				<>
					{isCommits ? (
						<CommitsTable commits={commits || []} org={org} repo={product} showStatus={showStatus} />
					) : (
						<TagsTable tags={tags || []} org={org} repo={product} showStatus={showStatus} />
					)}

					{/* Infinite scroll sensor */}
					<div ref={loadMoreRef} className="flex items-center justify-center py-4 text-xs font-medium text-muted-foreground border-t border-border">
						{isFetchingNextPage ? (
							<div className="flex items-center gap-2">
								<Loader2 className="w-3 h-3 animate-spin text-primary" />
								<span>Cargando más resultados</span>
							</div>
						) : hasNextPage ? (
							<span className="animate-pulse">Desliza para cargar más</span>
						) : (
							(commits?.length || tags?.length) ? "Fin del historial de desarrollo" : ""
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
			cell: ({ row }) => <DisplayInfo value={row.original.date} type="dates" className="font-mono text-[13px]" />,
		},
		{
			accessorKey: "author",
			header: "Autor",
			cell: ({ row }) => <DisplayInfo value={row.original.author} type="author" maxChar={30} className="font-medium" />,
		},
		{
			accessorKey: "message",
			header: "Mensaje",
			cell: ({ row }) => (
				<span className="text-muted-foreground">
					<DisplayInfo value={row.original.message} type="message" maxChar={60} hideIcon />
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
			cell: ({ row }) => <DisplayInfo value={row.original.date} type="dates" className="font-mono text-[13px]" />,
		},
		{
			accessorKey: "author",
			header: "Autor",
			cell: ({ row }) => <DisplayInfo value={row.original.author.name} type="author" maxChar={50} className="font-medium" />,
		},
	]

	return <Table columns={columns} data={tags} />
}
