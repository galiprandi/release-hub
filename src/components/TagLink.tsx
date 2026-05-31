import { Tag } from "lucide-react";
import { DeployStatusIndicator } from "./ui/DeployStatusIndicator";

interface TagLinkProps {
	tagName: string;
	org: string;
	repo: string;
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
}

export function TagLink({ tagName, org, repo, pipelineStatus, isLoading, showStatus = true, commitInfo }: TagLinkProps) {
	const githubUrl = `https://github.com/${org}/${repo}/releases/tag/${tagName}`;

	return (
		<div className="flex items-center gap-1.5">
			<a
				href={githubUrl}
				target="_blank"
				rel="noopener noreferrer"
				className="flex items-center gap-1.5 text-sm font-mono text-tag hover:text-tag/80 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1 rounded-sm"
			>
				<Tag className="w-4 h-4" />
				{tagName}
			</a>
			{showStatus && (
				<DeployStatusIndicator
					status={pipelineStatus?.status}
					updatedAt={pipelineStatus?.updatedAt}
					failedStage={pipelineStatus?.failedStage}
					errorDetail={pipelineStatus?.errorDetail}
					stage="production"
					isLoading={isLoading}
					commitInfo={commitInfo}
					tagInfo={{ name: tagName }}
				/>
			)}
		</div>
	);
}
