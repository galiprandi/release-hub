import type { PipelineState, PipelineEvent } from "@/pipeline-core/types";

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
	events: PipelineEvent[] | undefined,
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
		failedStage: failedEvent?.name,
		errorDetail: failedEvent?.markdown,
	};

	// Identify all deployment-related events (handling both flat and nested structures)
	const allEvents = events.flatMap((e) => [e, ...(e.subevents || [])]);
	const deployEvents = allEvents.filter((e) => e.id.toUpperCase().startsWith("DEPLOY_"));

	if (deployEvents.length > 0) {
		const hasFailed = deployEvents.some((se) => se.state === "FAILED");
		const hasWarn = deployEvents.some((se) => se.state === "WARN");
		// Consider both SUCCESS and COMPLETED as successful terminal states
		const allSuccess = deployEvents.every((se) => ["SUCCESS", "COMPLETED"].includes(se.state));

		if (hasFailed) return { ...info, status: "FAILED" };
		if (hasWarn) return { ...info, status: "WARN" };
		if (allSuccess) return { ...info, status: "SUCCESS" };
	}

	// Fallback to the state of the very last event in the pipeline
	info.status = lastEvent.state;
	return info;
}
