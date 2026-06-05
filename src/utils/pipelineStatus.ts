import type { PipelineState } from "@/pipeline-core/types";

export interface PipelineStatusInfo {
	status: PipelineState | undefined;
	updatedAt?: string;
	failedStage?: string;
	errorDetail?: string;
}

/**
 * Extracts unified pipeline status information from a raw event array.
 * Centralizes logic previously duplicated across the application.
 */
export function getPipelineStatusInfo(
	events: { state: string; id: string; label?: { es: string }; markdown?: string; subevents?: { id: string; state: string }[] }[] | undefined,
	updatedAt?: string
): PipelineStatusInfo {
	if (!events || events.length === 0) {
		return { status: undefined, updatedAt };
	}

	const lastEvent = events[events.length - 1];
	const failedEvent = events.find((e) => e.state === "FAILED");

	const info: PipelineStatusInfo = {
		status: undefined,
		updatedAt,
		failedStage: failedEvent?.label?.es,
		errorDetail: failedEvent?.markdown,
	};

	// If the last event is not CD (Deployment), use its state directly
	if (lastEvent.id !== "CD") {
		info.status = lastEvent.state as PipelineState;
		return info;
	}

	// Filter only deployment subevents (DEPLOY_*)
	const deploySubevents = lastEvent.subevents?.filter((se) => se.id.startsWith("DEPLOY_")) || [];

	if (deploySubevents.length === 0) {
		info.status = lastEvent.state as PipelineState;
		return info;
	}

	// Determine state based on deployment subevents
	const hasFailed = deploySubevents.some((se) => se.state === "FAILED");
	const hasWarn = deploySubevents.some((se) => se.state === "WARN");
	const allSuccess = deploySubevents.every((se) => se.state === "SUCCESS");

	if (hasFailed) {
		info.status = "FAILED";
	} else if (hasWarn) {
		info.status = "WARN";
	} else if (allSuccess) {
		info.status = "SUCCESS";
	} else {
		info.status = lastEvent.state as PipelineState;
	}

	return info;
}
