import { useQuery } from '@tanstack/react-query'
import { runCommand } from '@/api/exec'

export type PipelinePlugin = 'pulsar' | 'seki' | null

export interface DetectionResult {
  plugin: PipelinePlugin
  hasSeki: boolean
  hasNxBuild: boolean
  loading: boolean
  error: string | null
}

interface UsePipelineDetectorOptions {
  org: string
  repo: string
  enabled?: boolean
}

/**
 * Check if repository has Nx Build workflow (Pulsar)
 * Uses gh CLI to check workflows
 */
const hasNxBuildWorkflow = async (org: string, repo: string): Promise<boolean> => {
  try {
    const { stdout } = await runCommand(
      `gh api repos/${org}/${repo}/actions/workflows --jq '.workflows[].name'`
    )
    const workflows = stdout.trim().split('\n')
    return workflows.some((w) => w === 'Nx Build' || w === 'nx-build')
  } catch (error) {
    console.error('[Nx Check] Error:', error)
    return false
  }
}

/**
 * Detect pipeline type for a repository
 * Priority: Nx (Pulsar) > Seki > None
 * If no Nx Build workflow, check if Seki token exists
 */
const detectPipeline = async (org: string, repo: string): Promise<{
  plugin: PipelinePlugin
  hasSeki: boolean
  hasNxBuild: boolean
}> => {
  console.log('[Detect Pipeline] Checking', org, repo)

  // Check for Nx Build workflow (Pulsar)
  const hasNxBuild = await hasNxBuildWorkflow(org, repo).catch(() => false)
  console.log('[Detect Pipeline] hasNxBuild:', hasNxBuild)

  // If Nx Build exists, return Pulsar
  if (hasNxBuild) {
    console.log('[Detect Pipeline] Returning pulsar')
    return {
      plugin: 'pulsar',
      hasSeki: false,
      hasNxBuild: true,
    }
  }

  // If no Nx Build, check if Seki token exists
  const hasSekiToken = !!localStorage.getItem('seki_api_token')
  console.log('[Detect Pipeline] hasSekiToken:', hasSekiToken)

  // Only return Seki if there's a token, otherwise return null
  if (!hasSekiToken) {
    console.log('[Detect Pipeline] No Seki token, returning null')
    return {
      plugin: null,
      hasSeki: false,
      hasNxBuild: false,
    }
  }

  // If Seki token exists, assume Seki
  console.log('[Detect Pipeline] Assuming Seki')
  return {
    plugin: 'seki',
    hasSeki: true,
    hasNxBuild: false,
  }
}

/**
 * Hook that detects which pipeline monitoring plugin to use based on repository capabilities
 * Priority: Pulsar > Seki > None
 * Results are cached for 1 hour to enable fast switching between repositories
 */
export function usePipelineDetector({
  org,
  repo,
  enabled = true,
}: UsePipelineDetectorOptions): DetectionResult {
  const queryKey = ['pipeline-detection', org, repo]

  const query = useQuery({
    queryKey,
    queryFn: () => detectPipeline(org, repo),
    enabled: enabled && !!org && !!repo,
    staleTime: 60 * 60 * 1000, // 1 hour - cached for fast switching
    gcTime: 24 * 60 * 60 * 1000, // 24 hours - keep in cache longer
    retry: 1,
  })

  const { data, isLoading, error } = query

  return {
    plugin: data?.plugin ?? null,
    hasSeki: data?.hasSeki ?? false,
    hasNxBuild: data?.hasNxBuild ?? false,
    loading: isLoading,
    error: (error as Error)?.message ?? null,
  }
}
