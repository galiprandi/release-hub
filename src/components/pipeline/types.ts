import type { ReactNode } from "react";

// Re-export ViewMode from pipeline-core for backward compatibility
export type { ViewMode } from '@/pipeline-core/types';
// Legacy alias - deprecated, use ViewMode
export type StageType = "commits" | "tags";

export type MetaPart = {
	id: string;
	node: ReactNode;
};
