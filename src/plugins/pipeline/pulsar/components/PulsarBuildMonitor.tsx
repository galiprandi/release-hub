/**
 * Pulsar Build Monitor — Componente productivo
 *
 * Muestra el estado de creación de imágenes Docker del workflow pulsar-nx-build.yml.
 * Silencioso total: renderiza null si no es Pulsar repo, si está loading,
 * si hay error, o si no hay datos.
 *
 * Design:
 * - Single compact card layout (mismo layout para OK y FAIL)
 * - Header: ref + status + env
 * - Meta: author · time · duration · commit
 * - Image chips: una por app (verde=OK, rojo=FAILED, azul=building, gris=skipped)
 * - Click en chip fallida → expande panel con step fallido + link a GitHub Actions
 * - Fallback: si todas las imágenes están skipped, muestra el job no-imagen fallido
 */
import { useState } from 'react'
import {
	CheckCircle2,
	XCircle,
	Loader2,
	Circle,
	GitCommit,
	Tag,
	FlaskConical,
	Rocket,
	ExternalLink,
	Clock,
	AlertCircle,
	ChevronRight,
	Package,
} from 'lucide-react'
import DayJS from '@/lib/dayjs'
import { usePulsarBuilds } from '../hooks/usePulsarBuilds'
import type { PulsarBuildData, PulsarBuildState, PulsarImageJob } from '../types'
import { formatDuration } from '../utils'
import { BaseDialog } from '@/components/ui/BaseDialog'

// === Status helpers ===

function statusConfig(state: PulsarBuildState) {
	switch (state) {
		case 'COMPLETED':
			return {
				icon: CheckCircle2,
				color: 'text-success',
				bg: 'bg-success',
				badge: 'bg-success/15 text-success border border-success/30',
				label: 'OK',
			}
		case 'FAILED':
			return {
				icon: XCircle,
				color: 'text-destructive',
				bg: 'bg-destructive',
				badge: 'bg-destructive/15 text-destructive border border-destructive/30',
				label: 'FALLÓ',
			}
		case 'RUNNING':
			return {
				icon: Loader2,
				color: 'text-primary',
				bg: 'bg-primary animate-pulse',
				badge: 'bg-primary/15 text-primary border border-primary/30',
				label: 'BUILDING',
			}
		case 'SKIPPED':
			return {
				icon: Circle,
				color: 'text-muted-foreground',
				bg: 'bg-muted/30',
				badge: 'bg-muted/30 text-muted-foreground border border-border',
				label: 'SKIPPED',
			}
		case 'CANCELLED':
			return {
				icon: XCircle,
				color: 'text-warning',
				bg: 'bg-warning',
				badge: 'bg-warning/15 text-warning border border-warning/30',
				label: 'CANCELADO',
			}
		default:
			return {
				icon: Circle,
				color: 'text-muted-foreground',
				bg: 'bg-muted',
				badge: 'bg-muted text-muted-foreground border border-border',
				label: 'IDLE',
			}
	}
}

// === Image Chip ===

function ImageChip({
	image,
	isExpanded,
	onClick,
}: {
	image: PulsarImageJob
	isExpanded: boolean
	onClick: () => void
}) {
	const config = statusConfig(image.state)
	const Icon = config.icon
	const isFailed = image.state === 'FAILED'
	const isClickable = isFailed || image.state === 'RUNNING'

	const ariaLabel = `${image.app}: ${config.label}${isClickable ? ' - Ver detalles' : ''}`

	return (
		<button
			type="button"
			onClick={isClickable ? onClick : undefined}
			disabled={!isClickable}
			aria-label={ariaLabel}
			className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all shrink-0 ${
				isExpanded
					? 'bg-foreground/10 text-foreground ring-1 ring-border'
					: isFailed
						? `${config.badge} hover:scale-105 cursor-pointer`
						: image.state === 'RUNNING'
							? `${config.badge} hover:scale-105 cursor-pointer`
							: `${config.badge} cursor-default`
			}`}
		>
			<Icon
				className={`w-3 h-3 ${config.color} ${image.state === 'RUNNING' ? 'animate-spin' : ''}`}
			/>
			<span>{image.app}</span>
			<span className="text-xs text-muted-foreground normal-case font-medium">{image.appType}</span>
			{isClickable && (
				<ChevronRight
					className={`w-2.5 h-2.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
				/>
			)}
		</button>
	)
}

// === Image Panel (expanded) ===

function ImagePanel({ image }: { image: PulsarImageJob }) {
	const config = statusConfig(image.state)
	const duration = formatDuration(image.startedAt, image.completedAt)
	const failedSteps = image.steps.filter((s) => s.state === 'FAILED')

	return (
		<div className="border border-border rounded-lg overflow-hidden bg-card">
			<div className="flex items-center justify-between px-3 py-2 bg-background border-b border-border">
				<div className="flex items-center gap-2">
					<config.icon className={`w-4 h-4 ${config.color}`} />
					<span className="text-xs font-bold text-foreground">{image.app}</span>
					<span className="text-xs text-muted-foreground">{image.appType}</span>
					<span className={`px-1.5 py-0 text-xs rounded-md font-medium ${config.badge}`}>
						{config.label}
					</span>
				</div>
				<div className="flex items-center gap-2 shrink-0">
					{image.url && (
						<a
							href={image.url}
							target="_blank"
							rel="noopener noreferrer"
							className="text-xs font-bold underline hover:opacity-70 transition-opacity inline-flex items-center gap-1"
						>
							Ver en GitHub
							<ExternalLink className="w-2.5 h-2.5" />
						</a>
					)}
					{duration && (
						<span className="text-xs text-muted-foreground tabular-nums flex items-center gap-1">
							<Clock className="w-2.5 h-2.5" />
							{duration}
						</span>
					)}
				</div>
			</div>

			{/* Steps */}
			<div className="p-2 space-y-0.5 max-h-48 overflow-y-auto">
				{image.steps.map((step) => {
					const stepConfig = statusConfig(step.state)
					const StepIcon = stepConfig.icon
					return (
						<div
							key={step.number}
							className="flex items-center justify-between gap-2 py-1 px-2 rounded hover:bg-muted/30 transition-colors"
						>
							<div className="flex items-center gap-2 min-w-0">
								<StepIcon
									className={`w-3 h-3 shrink-0 ${stepConfig.color} ${step.state === 'RUNNING' ? 'animate-spin' : ''}`}
								/>
								<span className="text-xs text-foreground truncate">{step.name}</span>
							</div>
							<span className={`text-xs font-medium shrink-0 ${stepConfig.color}`}>
								{stepConfig.label}
							</span>
						</div>
					)
				})}
			</div>

			{/* Error detail */}
			{failedSteps.length > 0 && (
				<div className="px-3 py-3 border-t border-border bg-destructive/15 space-y-2">
					<div className="flex items-center gap-2">
						<AlertCircle className="w-3.5 h-3.5 shrink-0 text-destructive" />
						<span className="text-xs font-medium text-destructive dark:text-destructive">
							Step{failedSteps.length > 1 ? 's' : ''} fallido{failedSteps.length > 1 ? 's' : ''}
						</span>
					</div>
					{failedSteps.map((step) => (
						<div key={step.number} className="space-y-0.5">
							<p className="text-xs text-foreground font-medium">{step.name}</p>
							{image.url && (
								<a
									href={`${image.url}#step-${step.number}:1`}
									target="_blank"
									rel="noopener noreferrer"
									className="text-xs text-primary hover:text-primary/80 inline-flex items-center gap-1 transition-colors"
								>
									Ver log del step
									<ExternalLink className="w-2.5 h-2.5" />
								</a>
							)}
						</div>
					))}
				</div>
			)}
		</div>
	)
}

// === Fallback Job Panel (cuando todas las imágenes están skipped) ===

function FallbackPanel({ data }: { data: PulsarBuildData }) {
	const fb = data.fallbackJob
	if (!fb) return null
	const config = statusConfig(fb.state)
	const Icon = config.icon

	return (
		<div className="border border-border rounded-lg overflow-hidden bg-destructive/15">
			<div className="flex items-center justify-between px-3 py-2 bg-destructive/15 border-b border-border">
				<div className="flex items-center gap-2">
					<Icon className={`w-4 h-4 ${config.color}`} />
					<span className="text-xs font-bold text-foreground">{fb.name}</span>
					<span className={`px-1.5 py-0 text-xs rounded-md font-medium ${config.badge}`}>
						{config.label}
					</span>
				</div>
				{fb.url && (
					<a
						href={fb.url}
						target="_blank"
						rel="noopener noreferrer"
						className="text-xs font-bold underline hover:opacity-70 transition-opacity inline-flex items-center gap-1"
					>
						Ver en GitHub
						<ExternalLink className="w-2.5 h-2.5" />
					</a>
				)}
			</div>
			{fb.errorStep && (
				<div className="px-3 py-2.5 space-y-1">
					<span className="text-xs font-medium text-destructive dark:text-destructive">
						Step fallido
					</span>
					<p className="text-xs text-foreground font-medium">{fb.errorStep.name}</p>
				</div>
			)}
		</div>
	)
}

// === Environment Card ===

interface EnvCardProps {
	envLabel: string
	envIcon: typeof Rocket
	data: PulsarBuildData
}

function EnvCard({ envLabel, envIcon: EnvIcon, data }: EnvCardProps) {
	const [expandedImageId, setExpandedImageId] = useState<number | null>(null)
	const [isErrorModalOpen, setIsErrorModalOpen] = useState(false)

	const config = statusConfig(data.state)
	const StatusIcon = config.icon

	const totalDuration = formatDuration(data.startedAt, data.completedAt)
	const lastUpdated = DayJS(data.updatedAt).fromNow()

	const images = data.images
	const failedImages = images.filter((img) => img.state === 'FAILED')
	const allSkipped = images.length > 0 && images.every((img) => img.state === 'SKIPPED')

	const RefTypeIcon = data.refType === 'TAG' ? Tag : GitCommit

	const expandedImage = expandedImageId
		? images.find((img) => img.id === expandedImageId)
		: null

	const handleImageClick = (imageId: number) => {
		setExpandedImageId(expandedImageId === imageId ? null : imageId)
	}

	return (
		<div
			className={`bg-card border rounded-md p-4 transition-all duration-500 ${
				data.state === 'FAILED' ? 'ring-1 ring-destructive/20' : ''
			}`}
		>
			<div className="flex items-start gap-3">
				<div className={`w-1 rounded-full self-stretch ${config.bg}`} />
				<div className="flex-1 min-w-0 space-y-2">
					{/* Header: ref + status + env */}
					<div className="flex items-center gap-2 flex-wrap">
						<RefTypeIcon className="w-3.5 h-3.5 text-muted-foreground" />
						<span className="font-mono text-sm font-semibold text-foreground">{data.ref}</span>
						<span
							className={`px-1.5 py-0 text-xs rounded-md font-medium ${
								data.refType === 'TAG'
									? 'bg-purple-50 text-purple-700 border border-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
									: 'bg-primary/15 text-primary border border-primary/30'
							}`}
						>
							{data.refType}
						</span>
						<span
							className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-md ${config.badge}`}
						>
							<StatusIcon
								className={`w-3 h-3 ${config.color} ${data.state === 'RUNNING' ? 'animate-spin' : ''}`}
							/>
							{config.label}
						</span>
						<div className="flex items-center gap-1 ml-auto">
							<EnvIcon className="w-3.5 h-3.5 text-muted-foreground" />
							<span className="text-xs font-medium text-muted-foreground">
								{envLabel}
							</span>
						</div>
					</div>

					{/* Meta: author · time · duration */}
					<div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
						{data.commit?.author && (
							<span className="font-medium text-foreground truncate max-w-[200px]">
								{data.commit.author}
							</span>
						)}
						<span className="text-muted-foreground">·</span>
						<span>{lastUpdated}</span>
						{totalDuration && (
							<>
								<span className="text-muted-foreground">·</span>
								<span className="inline-flex items-center gap-1 tabular-nums">
									<Clock className="w-2.5 h-2.5" />
									{totalDuration}
								</span>
							</>
						)}
						{data.externalUrl && (
							<>
								<span className="text-muted-foreground">·</span>
								<a
									href={data.externalUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
								>
									<ExternalLink className="w-2.5 h-2.5" />
									Run
								</a>
							</>
						)}
					</div>

					{/* Commit message */}
					{data.commit?.message && (
						<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
							<GitCommit className="w-3 h-3 shrink-0" />
							<span className="truncate">{data.commit.message.split('\n')[0]}</span>
						</div>
					)}

					{/* Image chips */}
					{images.length > 0 && (
						<div className="space-y-2 pt-1">
							<div className="flex items-center gap-1.5">
								<span className="text-xs font-medium text-muted-foreground shrink-0 inline-flex items-center gap-1">
									<Package className="w-3 h-3" />
									Imágenes ({images.length}):
								</span>
							</div>
							<div className="flex items-center gap-1.5 flex-wrap">
								{images.map((image) => (
									<ImageChip
										key={image.id}
										image={image}
										isExpanded={expandedImageId === image.id}
										onClick={() => handleImageClick(image.id)}
									/>
								))}
							</div>

							{expandedImage && <ImagePanel image={expandedImage} />}
						</div>
					)}

					{/* Fallback: job no-imagen fallido cuando todas las imágenes están skipped */}
					{allSkipped && data.fallbackJob && (
						<div className="space-y-2 pt-1">
							<FallbackPanel data={data} />
						</div>
					)}

					{/* Error summary bar */}
					{failedImages.length > 0 && (
						<button
							type="button"
							onClick={() => setIsErrorModalOpen(true)}
							className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-destructive bg-destructive/15 border border-destructive/40 rounded-md hover:bg-destructive/15 transition-colors"
						>
							<AlertCircle className="w-3 h-3" />
							{failedImages.length} imagen{failedImages.length > 1 ? 'es' : ''} fallida{failedImages.length > 1 ? 's' : ''}
							<span className="normal-case font-medium opacity-70">— ver detalle</span>
						</button>
					)}
				</div>
			</div>

			{/* Error modal */}
			{isErrorModalOpen && (
				<BaseDialog
					open={isErrorModalOpen}
					onOpenChange={setIsErrorModalOpen}
					title={
						<div className="flex items-center gap-2">
							<AlertCircle className="w-5 h-5 text-destructive" />
							<span>Imágenes fallidas — {envLabel}</span>
						</div>
					}
					maxWidth="max-w-3xl"
					maxHeight="max-h-[80vh]"
					className="!p-0"
				>
					<div className="p-6 overflow-y-auto space-y-4">
						{failedImages.map((image) => (
							<ImagePanel key={image.id} image={image} />
						))}
					</div>
				</BaseDialog>
			)}
		</div>
	)
}

// === Main Component ===

interface PulsarBuildMonitorProps {
	org: string
	repo: string
}

export function PulsarBuildMonitor({ org, repo }: PulsarBuildMonitorProps) {
	const { isPulsarRepo, data, isLoading, error } = usePulsarBuilds({ org, repo })

	// Silencioso total
	if (!isPulsarRepo) return null
	if (isLoading) return null
	if (error) return null
	if (!data) return null
	if (!data.staging && !data.production) return null

	return (
		<div className="space-y-3">
			{data.staging && (
				<EnvCard envLabel="Staging" envIcon={FlaskConical} data={data.staging} />
			)}
			{data.production && (
				<EnvCard envLabel="Production" envIcon={Rocket} data={data.production} />
			)}
		</div>
	)
}

// === Data-driven variant for sandbox / dev routes ===

interface PulsarBuildMonitorDataProps {
	data: { staging: PulsarBuildData | null; production: PulsarBuildData | null }
}

export function PulsarBuildMonitorData({ data }: PulsarBuildMonitorDataProps) {
	if (!data.staging && !data.production) return null

	return (
		<div className="space-y-3">
			{data.staging && (
				<EnvCard envLabel="Staging" envIcon={FlaskConical} data={data.staging} />
			)}
			{data.production && (
				<EnvCard envLabel="Production" envIcon={Rocket} data={data.production} />
			)}
		</div>
	)
}
