import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, XCircle, Loader2, Circle, Activity } from "lucide-react"
import { useSekiPipelinesByEnv } from "@/plugins/pipeline/seki/hooks/useSekiPipelinesByEnv"
import { usePulsarBuilds } from "@/plugins/pipeline/pulsar/hooks/usePulsarBuilds"
import { pulsarAdapter } from "@/plugins/pipeline/pulsar/adapter"

interface PipelineSummaryBarProps {
	org: string
	repo: string
}

type Status = 'success' | 'failed' | 'running' | 'idle' | 'unknown'

function StatusChip({ label, status, env }: { label: string; status: Status; env?: string }) {
	const config = {
		success: { icon: CheckCircle2, color: 'text-success', bg: 'bg-success/15', border: 'border-success/30' },
		failed: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/15', border: 'border-destructive/30' },
		running: { icon: Loader2, color: 'text-primary', bg: 'bg-primary/15', border: 'border-primary/30', spin: true },
		idle: { icon: Circle, color: 'text-muted-foreground', bg: 'bg-muted', border: 'border-border' },
		unknown: { icon: Activity, color: 'text-muted-foreground', bg: 'bg-muted', border: 'border-border' },
	}[status]

	const Icon = config.icon

	return (
		<div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border ${config.bg} ${config.border}`}>
			<Icon className={`w-3.5 h-3.5 ${config.color} ${config.spin ? 'animate-spin' : ''}`} />
			<div className="flex flex-col">
				<span className="text-xs font-medium text-foreground leading-none">{label}</span>
				{env && <span className="text-xs text-muted-foreground leading-none mt-0.5">{env}</span>}
			</div>
		</div>
	)
}

function mapSekiState(state: string | undefined): Status {
	if (!state) return 'unknown'
	switch (state) {
		case 'SUCCESS': return 'success'
		case 'COMPLETED': return 'success'
		case 'FAILED': return 'failed'
		case 'CANCELLED': return 'failed'
		case 'STARTED':
		case 'RUNNING': return 'running'
		case 'IDLE': return 'idle'
		case 'WARN': return 'failed'
		default: return 'unknown'
	}
}

function mapPulsarState(images: { state: string }[]): Status {
	if (!images || images.length === 0) return 'unknown'
	const anyRunning = images.some(i => i.state === 'RUNNING')
	const anyFailed = images.some(i => i.state === 'FAILED')
	if (anyRunning) return 'running'
	if (anyFailed) return 'failed'
	if (images.every(i => i.state === 'COMPLETED' || i.state === 'SUCCESS')) return 'success'
	if (images.every(i => i.state === 'SKIPPED' || i.state === 'IDLE')) return 'idle'
	return 'unknown'
}

export function PipelineSummaryBar({ org, repo }: PipelineSummaryBarProps) {
	const { data: sekiData, isLoading: sekiLoading } = useSekiPipelinesByEnv({ org, repo })
	const { data: isPulsar } = useQuery({
		queryKey: ['pulsar-detection', org, repo],
		queryFn: () => pulsarAdapter.isPulsarRepo(org, repo),
		staleTime: 5 * 60 * 1000,
	})
	const { data: pulsarData, isLoading: pulsarLoading } = usePulsarBuilds({ org, repo, enabled: !!isPulsar })

	// Don't render if no data at all
	if (sekiLoading && pulsarLoading) return null
	if (!sekiData && !pulsarData) return null

	const sekiStaging = sekiData?.staging ? mapSekiState(sekiData.staging.state) : 'unknown'
	const sekiProduction = sekiData?.production ? mapSekiState(sekiData.production.state) : 'unknown'

	const pulsarStaging = pulsarData?.staging?.images ? mapPulsarState(pulsarData.staging.images) : 'unknown'
	const pulsarProduction = pulsarData?.production?.images ? mapPulsarState(pulsarData.production.images) : 'unknown'

	const chips: { label: string; status: Status; env?: string }[] = []

	if (sekiData) {
		chips.push({ label: 'Seki Staging', status: sekiStaging, env: 'staging' })
		chips.push({ label: 'Seki Prod', status: sekiProduction, env: 'production' })
	}
	if (pulsarData) {
		chips.push({ label: 'Pulsar Staging', status: pulsarStaging, env: 'staging' })
		chips.push({ label: 'Pulsar Prod', status: pulsarProduction, env: 'production' })
	}

	if (chips.length === 0) return null

	return (
		<div className="flex items-center gap-2 flex-wrap mb-4">
			{chips.map((chip, i) => (
				<StatusChip key={`${chip.label}-${i}`} label={chip.label} status={chip.status} env={chip.env} />
			))}
		</div>
	)
}
