/**
 * Seki Pipeline Utils
 * Funciones de extracción y status para el módulo Seki.
 */

import type { SekiPipelineEvent, SekiPipelineState } from './types'

const ROUTE_REGEX = /(https?:\/\/[^\s<>"')]+)/gi

/**
 * Limpia una URL extraída de markdown, removiendo tags HTML y caracteres no deseados
 */
const cleanUrl = (url: string): string => {
	return url
		.replace(/<\/[^>]+>$/g, '')
		.replace(/<[^>]+>$/g, '')
		.replace(/"$/, '')
}

/**
 * Verifica si una URL es externa (accesible desde el navegador)
 * Las URLs internas tipo *.svc.cluster.local no son accesibles desde fuera del cluster
 */
const isExternalUrl = (url: string): boolean => {
	try {
		const urlObj = new URL(url)
		const hostname = urlObj.hostname

		if (hostname.includes('.svc.cluster.local')) {
			return false
		}

		if (hostname.includes('.svc.') || hostname.endsWith('.local')) {
			return false
		}

		return true
	} catch {
		return false
	}
}

export const extractRoutes = (events: SekiPipelineEvent[]) => {
	const urls = new Set<string>()
	events
		.filter((e) => e.id.toUpperCase().startsWith('DEPLOY'))
		.forEach((event) => {
			if (event.markdown) {
				const matches = event.markdown.match(ROUTE_REGEX)
				if (matches) {
					matches.forEach((match) => {
						const url = cleanUrl(match)
						if (isExternalUrl(url)) {
							urls.add(url)
						}
					})
				}
			}
		})
	return Array.from(urls)
}

export interface SekiPipelineStatusInfo {
	status: SekiPipelineState | undefined
	updatedAt?: string
	failedStage?: string
	errorDetail?: string
}

/**
 * Extrae información de status unificado desde un array de eventos.
 * Centraliza la lógica de determinación de estado del pipeline.
 */
export function getPipelineStatusInfo(
	events: SekiPipelineEvent[] | undefined,
	updatedAt?: string
): SekiPipelineStatusInfo {
	if (!events || events.length === 0) {
		return { status: undefined, updatedAt }
	}

	const lastEvent = events[events.length - 1]
	const failedEvent = events.find((e) => e.state === 'FAILED')

	const info: SekiPipelineStatusInfo = {
		status: undefined,
		updatedAt,
		failedStage: failedEvent?.name,
		errorDetail: failedEvent?.markdown,
	}

	const allEvents = events.flatMap((e) => [e, ...(e.subevents || [])])
	const deployEvents = allEvents.filter((e) => e.id.toUpperCase().startsWith('DEPLOY_'))

	if (deployEvents.length > 0) {
		const hasFailed = deployEvents.some((se) => se.state === 'FAILED')
		const hasWarn = deployEvents.some((se) => se.state === 'WARN')
		const allSuccess = deployEvents.every((se) => ['SUCCESS', 'COMPLETED'].includes(se.state))

		if (hasFailed) return { ...info, status: 'FAILED' }
		if (hasWarn) return { ...info, status: 'WARN' }
		if (allSuccess) return { ...info, status: 'SUCCESS' }
	}

	info.status = lastEvent.state
	return info
}
