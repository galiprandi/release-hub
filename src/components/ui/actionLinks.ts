import { GitPullRequest, Play } from "lucide-react";
import { ACTION_DEFINITIONS } from "./actionDefinitions";

export const ACTION_LINKS = {
	prs: {
		...ACTION_DEFINITIONS.viewPRs,
		icon: GitPullRequest,
		label: "PRs",
	},
	actions: {
		...ACTION_DEFINITIONS.startContainer,
		icon: Play,
		label: "Actions",
	},
};
