/**
 * Pulsar Build Types
 * Tipos específicos del módulo Pulsar (GitHub Actions workflow pulsar-nx-build.yml).
 * Monitorea la creación de imágenes Docker por app.
 */

export type PulsarBuildState =
	| 'IDLE'
	| 'RUNNING'
	| 'COMPLETED'
	| 'FAILED'
	| 'CANCELLED'
	| 'SKIPPED'

/** Tipo de referencia git del run */
export type PulsarRefType = 'COMMIT' | 'TAG'

/** Ambiente inferido del run: tag → production, commit → staging */
export type PulsarEnvironment = 'staging' | 'production'

/** Step individual de un job de GitHub Actions */
export interface PulsarStep {
	number: number
	name: string
	state: PulsarBuildState
	startedAt?: string
	completedAt?: string
}

/** Imagen Docker construida por un job "Build and Push Application (app.type)" */
export interface PulsarImageJob {
	/** ID del job en GitHub Actions */
	id: number
	/** Nombre completo del job (ej: "nx-build / 📦 Build and Push Application (ai-workflow.nodejs)") */
	name: string
	/** App name extraído del paréntesis (ej: "ai-workflow") */
	app: string
	/** Tipo de app (ej: "nodejs", "nextjs") */
	appType: string
	/** Estado del job */
	state: PulsarBuildState
	/** URL al job en GitHub Actions */
	url?: string
	/** Steps del job */
	steps: PulsarStep[]
	/** Primer step fallido (para mostrar inline) */
	errorStep?: PulsarStep
	/** Timestamps */
	startedAt?: string
	completedAt?: string
}

/** Job no-imagen que falló (Validations, Golden Image, etc.) — causa raíz fallback */
export interface PulsarFallbackJob {
	id: number
	name: string
	state: PulsarBuildState
	url?: string
	errorStep?: PulsarStep
}

/** Data de un run del workflow pulsar-nx-build.yml */
export interface PulsarBuildData {
	/** ID del run en GitHub Actions */
	id: number
	/** Referencia al código (commit hash corto o tag name) */
	ref: string
	/** Tipo de referencia */
	refType: PulsarRefType
	/** Ambiente inferido */
	environment: PulsarEnvironment
	/** Estado agregado del run */
	state: PulsarBuildState
	/** Imágenes construidas (solo jobs "Build and Push Application (*)") */
	images: PulsarImageJob[]
	/** Job no-imagen fallido (fallback cuando todas las imágenes están skipped) */
	fallbackJob?: PulsarFallbackJob
	/** URL al run en GitHub Actions */
	externalUrl: string
	/** Metadata del commit */
	commit?: {
		message?: string
		author?: string
		sha?: string
	}
	/** Timestamps del run */
	startedAt?: string
	completedAt?: string
	/** Timestamp de última actualización */
	updatedAt: string
}

/** Builds separados por ambiente */
export interface PulsarBuildsByEnv {
	staging: PulsarBuildData | null
	production: PulsarBuildData | null
}
