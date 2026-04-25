/**
 * Core types for unified pipeline abstraction
 * Provides a common interface for all pipeline providers (Seki, Pulsar, etc.)
 */

export type ViewMode = 'commits' | 'tags'
export type PipelineProvider = 'seki' | 'pulsar' | null
export type PipelineState = 'IDLE' | 'STARTED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'

export interface PipelineEvent {
	id: string
	name: string
	state: PipelineState
	startedAt?: string
	completedAt?: string
	duration?: number
}

export interface PipelineData {
	/** Unique identifier for the pipeline run */
	id: string
	/** Provider that sourced this data */
	provider: Exclude<PipelineProvider, null>
	/** Reference to the code (commit hash or tag) */
	ref: string
	/** Type of reference */
	refType: 'COMMIT' | 'TAG'
	/** Current state of the pipeline */
	state: PipelineState
	/** When the pipeline started */
	startedAt?: string
	/** When the pipeline completed */
	completedAt?: string
	/** Pipeline events/steps */
	events: PipelineEvent[]
	/** URL to view the pipeline in the provider's UI */
	externalUrl?: string
	/** Metadata about the commit */
	commit?: {
		message?: string
		author?: string
		avatar?: string
	}
	/** Last updated timestamp */
	updatedAt: string
}

export interface PipelineAdapter {
	/** Unique name of the adapter */
	name: PipelineProvider
	/** Check if this adapter supports the given repository */
	supports: (org: string, repo: string) => Promise<boolean>
	/** Fetch pipeline data */
	fetch: (org: string, repo: string, viewMode: ViewMode, ref: string) => Promise<PipelineData | null>
}

// UI Component Types

export type MetaPart = {
	id: string
	node: React.ReactNode
}

export interface StatusCardProps {
	type: 'loading' | 'error' | 'warn' | 'offline'
	message: string
	onRetry?: () => void
	onClose?: () => void
}
