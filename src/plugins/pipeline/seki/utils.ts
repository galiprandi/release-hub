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
 * IDs de subevents de Jira/CGT que se ignoran al calcular el estado.
 * Debe coincidir con JIRA_IGNORED_IDS del SekiPipelineMonitor.
 */
const JIRA_IGNORED_IDS = ['JIRA_validation_jira', 'CR_CGT_compliance']
const JIRA_REGEX = /jira|cgt.*compliance/i

/**
 * Extrae información de status unificado desde un array de eventos.
 * Centraliza la lógica de determinación de estado del pipeline.
 * Filtra subevents de Jira/CGT igual que filterStage en SekiPipelineMonitor.
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

	// Filtrar subevents de Jira/CGT igual que filterStage.
	// Para events top-level, recalcular su estado si sus subevents filtrados
	// no tienen WARN/FAIL (el event-level puede heredar WARN de Jira filtrado).
	const filteredTopEvents = events.map((e) => {
		const filteredSubs = (e.subevents || []).filter((s) => {
			const sid = s.id || ''
			const slabel = s.label || s.name || ''
			return !JIRA_IGNORED_IDS.includes(sid) && !JIRA_REGEX.test(slabel)
		})
		const subsHaveFail = filteredSubs.some((s) => s.state === 'FAILED')
		const subsHaveWarn = filteredSubs.some((s) => s.state === 'WARN')
		const subsHaveRunning = filteredSubs.some((s) => s.state === 'RUNNING' || s.state === 'STARTED')
		const subsAllIdle = filteredSubs.length > 0 && filteredSubs.every((s) => s.state === 'IDLE')
		const subsAllCompleted = filteredSubs.length > 0 && filteredSubs.every((s) => ['SUCCESS', 'COMPLETED'].includes(s.state))

		// Solo recalcular si el event tiene estado WARN pero los subevents filtrados no
		let recalculatedState = e.state
		if (e.state === 'WARN' && !subsHaveFail && !subsHaveWarn) {
			if (subsHaveRunning) recalculatedState = 'RUNNING'
			else if (subsAllIdle) recalculatedState = 'IDLE'
			else if (subsAllCompleted) recalculatedState = 'COMPLETED'
		}

		return { ...e, state: recalculatedState, subevents: filteredSubs }
	})

	const allEvents = filteredTopEvents.flatMap((e) => [e, ...e.subevents])
	const hasFail = allEvents.some((se) => se.state === 'FAILED')
	const hasWarn = allEvents.some((se) => se.state === 'WARN')
	const hasRunning = allEvents.some((se) => se.state === 'RUNNING' || se.state === 'STARTED')
	const hasIdle = allEvents.some((se) => se.state === 'IDLE')
	const allCompleted = allEvents.length > 0 && allEvents.every((se) => ['SUCCESS', 'COMPLETED'].includes(se.state))

	if (hasFail) return { ...info, status: 'FAILED' }
	if (hasRunning) return { ...info, status: 'RUNNING' }
	if (hasWarn) return { ...info, status: 'WARN' }
	if (hasIdle) return { ...info, status: lastEvent.state === 'STARTED' || lastEvent.state === 'RUNNING' ? 'RUNNING' : 'IDLE' }
	if (allCompleted) return { ...info, status: 'SUCCESS' }

	info.status = lastEvent.state
	return info
}
