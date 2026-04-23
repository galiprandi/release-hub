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
}

export function TagLink({ tagName, org, repo, pipelineStatus, isLoading, showStatus = true }: TagLinkProps) {
	const githubUrl = `https://github.com/${org}/${repo}/releases/tag/${tagName}`;

	return (
		<div className="flex items-center gap-1.5">
			<a
				href={githubUrl}
				target="_blank"
				rel="noopener noreferrer"
				className="flex items-center gap-1.5 text-sm font-mono text-purple-500 hover:text-purple-600"
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
				/>
			)}
		</div>
	);
}
