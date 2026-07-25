import { GitCommit } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { DeployStatusIndicator } from "@/components/ui/DeployStatusIndicator";

interface CommitLinkProps {
	hash: string;
	org: string;
	repo: string;
	short?: boolean;
	pipelineStatus?: {
		status?: string;
		updatedAt?: string;
		failedStage?: string;
		errorDetail?: string;
	};
	isLoading?: boolean;
	showStatus?: boolean;
	commitInfo?: {
		hash?: string;
		shortHash?: string;
		author?: string;
		date?: string;
		message?: string;
	};
	navigateToRepo?: boolean;
}

export function CommitLink({ hash, org, repo, short = true, pipelineStatus, isLoading, showStatus = true, commitInfo, navigateToRepo = false }: CommitLinkProps) {
	const displayHash = short ? hash.slice(0, 7) : hash;
	const githubUrl = `https://github.com/${org}/${repo}/commit/${hash}`;

	return (
		<div className="flex items-center gap-1.5">
			{navigateToRepo ? (
				<Link
					to="/github/$org/$repo"
					params={{ org, repo }}
					search={{ view: "commits" }}
					className="flex items-center gap-1.5 text-sm font-mono text-commit hover:text-commit/80 transition-colors focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none focus-visible:ring-offset-1 rounded-sm"
				>
					<GitCommit className="w-4 h-4" />
					{displayHash}
				</Link>
			) : (
				<a
					href={githubUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="flex items-center gap-1.5 text-sm font-mono text-commit hover:text-commit/80 transition-colors focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none focus-visible:ring-offset-1 rounded-sm"
				>
					<GitCommit className="w-4 h-4" />
					{displayHash}
				</a>
			)}
			{showStatus && (
				<DeployStatusIndicator
					status={pipelineStatus?.status}
					updatedAt={pipelineStatus?.updatedAt}
					failedStage={pipelineStatus?.failedStage}
					errorDetail={pipelineStatus?.errorDetail}
					stage="staging"
					isLoading={isLoading}
					commitInfo={commitInfo}
				/>
			)}
		</div>
	);
}
