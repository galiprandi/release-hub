import type { PipelineStatusResponse } from "@/api/seki.type";
import type { ViewMode, MetaPart } from "@/components/pipeline/types";

export interface SekiMonitorProps {
	pipeline?: PipelineStatusResponse;
	viewMode: ViewMode;
	gitDate?: string; // Fecha del commit/tag para consistencia con la tabla
	isLoading?: boolean;
	error?: Error | null;
}

export type { MetaPart };
