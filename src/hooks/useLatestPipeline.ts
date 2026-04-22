import { useQuery } from '@tanstack/react-query'
import { listPipelines } from '@/api/seki'
import type { PipelineStatusResponse } from '@/api/seki.type'
import { SEKI_CONFIG } from '@/config/seki'

interface UseLatestPipelineOptions {
  product: string
  stage: 'staging' | 'production'
  event?: 'commit' | 'tag'
  enabled?: boolean
}

export function useLatestPipeline({
  product,
  stage,
  event,
  enabled = true,
}: UseLatestPipelineOptions) {
  const eventType = event || (stage === 'staging' ? 'commit' : 'tag')

  return useQuery<PipelineStatusResponse | null>({
    queryKey: ['pipeline', product, stage, 'latest', eventType],
    queryFn: async () => {
      const response = await listPipelines(product, { limit: 50 })
      // Filter client-side by stage and event
      const matching = response.data.items.find(
        (item) => item.git.stage === stage && item.git.event === eventType
      )
      return matching || null
    },
    enabled: enabled && !!product,
    placeholderData: (previousData) => previousData,
    refetchInterval: SEKI_CONFIG.refetchInterval,
  })
}
