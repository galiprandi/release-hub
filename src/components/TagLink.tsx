import { Tag } from "lucide-react";

interface TagLinkProps {
	tagName: string;
	org: string;
	repo: string;
}

export function TagLink({ tagName, org, repo }: TagLinkProps) {
	const githubUrl = `https://github.com/${org}/${repo}/releases/tag/${tagName}`;

	return (
		<a
			href={githubUrl}
			target="_blank"
			rel="noopener noreferrer"
			className="flex items-center gap-1 text-sm font-mono text-purple-500 hover:text-purple-600"
		>
			<Tag className="w-4 h-4" />
			{tagName}
		</a>
	);
}
