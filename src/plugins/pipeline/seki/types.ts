/**
 * Seki Pipeline Types
 * Tipos específicos del módulo Seki. Sin abstracción multi-provider.
 */

export type SekiPipelineState =
	| 'IDLE'
	| 'STARTED'
	| 'RUNNING'
	| 'COMPLETED'
	| 'FAILED'
	| 'CANCELLED'
	| 'SUCCESS'
	| 'WARN'

export interface SekiPipelineEvent {
	id: string
	/** Nombre completo del evento (ej: "validation: jira") */
	name?: string
	/** Label corto para display (ej: "bff", "jira") */
	label?: string
	state: SekiPipelineState
	startedAt?: string
	completedAt?: string
	duration?: number
	markdown?: string
	subevents?: SekiPipelineEvent[]
	/** URL del deploy extraída del markdown (si existe) */
	deployUrl?: string
}

/** Stage del pipeline con jerarquía preservada (events → subevents) */
export interface SekiStage {
	id: string
	label: string
	state: SekiPipelineState
	startedAt?: string
	completedAt?: string
	subevents: SekiPipelineEvent[]
}

export interface SekiPipelineData {
	/** Identificador único del pipeline run */
	id: string
	/** Referencia al código (commit hash o tag) */
	ref: string
	/** Tipo de referencia */
	refType: 'COMMIT' | 'TAG'
	/** Estado actual del pipeline */
	state: SekiPipelineState
	/** Cuando inició el pipeline */
	startedAt?: string
	/** Cuando completó el pipeline */
	completedAt?: string
	/** Eventos/steps del pipeline (legacy, aplanado) */
	events: SekiPipelineEvent[]
	/** Stages del pipeline con jerarquía preservada */
	stages?: SekiStage[]
	/** URL externa para ver el pipeline en la UI del provider */
	externalUrl?: string
	/** Metadata del commit */
	commit?: {
		message?: string
		author?: string
		avatar?: string
	}
	/** Timestamp de última actualización */
	updatedAt: string
	/** Markdown de error del pipeline fallido (si state es FAILED) */
	errorMarkdown?: string
	/** Causa raíz del fallo extraída (1-2 líneas, para mostrar inline) */
	failureSummary?: string
	/** Acción correctiva sugerida (1 línea) */
	failureAction?: string
}

// UI Component Types

export type MetaPart = {
	id: string
	node: React.ReactNode
}
