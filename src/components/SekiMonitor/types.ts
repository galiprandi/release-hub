import type { ReactNode } from "react";

import type { PipelineStatusResponse } from "@/api/seki.type";

export type StageType = "staging" | "production";

export interface SekiMonitorProps {
	pipeline?: PipelineStatusResponse;
	stage: StageType;
	gitDate?: string; // Fecha del commit/tag para consistencia con la tabla
}

export type MetaPart = {
	id: string;
	node: ReactNode;
};
