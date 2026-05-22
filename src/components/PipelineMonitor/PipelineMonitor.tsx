import { UnifiedPipelineMonitor } from '@/pipeline-core/components/UnifiedPipelineMonitor'
import type { PipelineStatusResponse } from '@/api/seki.type'
import type { ViewMode } from '@/components/pipeline/types'

export interface PipelineMonitorProps {
	org: string
	repo: string
	// Seki data for backward compatibility or direct injection
	sekiData?: {
		pipeline?: PipelineStatusResponse
		viewMode?: ViewMode
		gitDate?: string
		isLoading?: boolean
		error?: Error | null
		refetch?: () => void
		tagName?: string
		hash?: string
	}
}

/**
 * PipelineMonitor (Legacy)
 * Now delegates to UnifiedPipelineMonitor which handles multi-provider logic.
 */
export function PipelineMonitor({ org, repo, sekiData }: PipelineMonitorProps) {
	const viewMode = sekiData?.viewMode || 'commits'
	const ref = viewMode === 'tags' ? (sekiData?.tagName || '') : (sekiData?.hash || sekiData?.pipeline?.git.commit || '')

	return (
		<UnifiedPipelineMonitor
			org={org}
			repo={repo}
			viewMode={viewMode}
			ref={ref}
		/>
	)
}
