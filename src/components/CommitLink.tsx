import { GitCommit } from "lucide-react";

interface CommitLinkProps {
	hash: string;
	org: string;
	repo: string;
	short?: boolean;
}

export function CommitLink({ hash, org, repo, short = true }: CommitLinkProps) {
	const displayHash = short ? hash.slice(0, 7) : hash;
	const githubUrl = `https://github.com/${org}/${repo}/commit/${hash}`;

	return (
		<a
			href={githubUrl}
			target="_blank"
			rel="noopener noreferrer"
			className="flex items-center gap-1 text-sm font-mono text-blue-500 hover:text-blue-600"
		>
			<GitCommit className="w-4 h-4" />
			{displayHash}
		</a>
	);
}
