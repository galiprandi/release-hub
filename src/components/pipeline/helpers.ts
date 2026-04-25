import type { ViewMode } from "./types";

export const viewModeStyles: Record<ViewMode, { badge: string; accent: string }> = {
	tags: {
		badge: "bg-purple-50 text-purple-700 border border-purple-100",
		accent: "bg-purple-500",
	},
	commits: {
		badge: "bg-blue-50 text-blue-600 border border-blue-100",
		accent: "bg-blue-500",
	},
};

// Legacy export for backward compatibility
export const stageStyles = viewModeStyles;
