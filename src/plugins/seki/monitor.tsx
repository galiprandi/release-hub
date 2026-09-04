/**
 * Seki Monitor Wrapper — Puente entre el plugin system y el componente existente.
 *
 * Este wrapper:
 * 1. Obtiene el token via el plugin (useSekiToken)
 * 2. Lo sincroniza con el storage legacy (releasehub_settings.sekiToken)
 *    para que el componente existente SekiPipelineMonitor funcione sin cambios
 * 3. Renderiza SekiPipelineMonitor
 * 4. Extrae deploy URLs del pipeline data y registra health endpoints via pluginAPI
 *
 * Fase de cleanup: eliminar la sincronización legacy y actualizar el componente
 * para leer directamente del storage del plugin.
 */

import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { SekiPipelineMonitor } from '@/plugins/pipeline/seki/components'
import { sekiAdapter } from '@/plugins/pipeline/seki/adapter'
import { extractRoutes } from '@/plugins/pipeline/seki/utils'
import type { SekiPipelineEvent } from '@/plugins/pipeline/seki/types'
import { useSekiToken } from './token'
import { pluginAPI } from '../registry'
import type { RepoPluginProps } from '../types'

const LEGACY_SETTINGS_KEY = 'releasehub_settings'

/** Sincroniza el token del plugin con el storage legacy */
function syncLegacyToken(token: string): void {
	try {
		const raw = localStorage.getItem(LEGACY_SETTINGS_KEY)
		const settings = raw ? JSON.parse(raw) : {}
		settings.sekiToken = token
		localStorage.setItem(LEGACY_SETTINGS_KEY, JSON.stringify(settings))
	} catch {
		// no crítico
	}
}

/** Detecta ambiente basado en URL o refType */
function detectEnvironment(url: string, isTag: boolean): 'staging' | 'production' {
	if (isTag) return 'production'
	if (url.includes('-stag.') || url.includes('staging') || url.includes('.stag.')) return 'staging'
	if (url.includes('seki-prod') || url.includes('prod.')) return 'production'
	return 'staging'
}

/** Extrae nombre del servicio de la URL */
function extractServiceName(url: string): string {
	try {
		const urlObj = new URL(url)
		const pathParts = urlObj.pathname.split('/').filter(Boolean)
		if (pathParts.includes('api')) {
			const apiIndex = pathParts.indexOf('api')
			if (pathParts[apiIndex + 1]) return pathParts[apiIndex + 1]
			if (apiIndex > 0) return pathParts[apiIndex - 1]
		}
		if (pathParts.length > 0) return pathParts[pathParts.length - 1]
		return '/'
	} catch {
		return 'unknown'
	}
}

export function SekiPluginMonitor({ org, repo }: RepoPluginProps) {
	const { data: tokenData } = useSekiToken()
	const registeredRef = useRef<Set<string>>(new Set())

	// Sincronizar token con storage legacy para que SekiPipelineMonitor funcione
	useEffect(() => {
		if (tokenData?.token) {
			syncLegacyToken(tokenData.token)
		}
	}, [tokenData?.token])

	// Fetch pipeline data para extraer health endpoints (paralelo al componente existente)
	const { data: pipelineData } = useQuery({
		queryKey: ['plugin:seki:pipeline-health', org, repo],
		queryFn: async () => {
			if (!tokenData?.token) return null
			syncLegacyToken(tokenData.token)
			return sekiAdapter.fetchByEnvironment(org, repo)
		},
		enabled: !!tokenData?.token,
		staleTime: 30_000,
		refetchInterval: 30_000,
	})

	// Registrar health endpoints via pluginAPI (desacoplado de /health)
	useEffect(() => {
		if (!pipelineData) return

		const product = `${org}/${repo}`
		const allEvents: SekiPipelineEvent[] = []

		if (pipelineData.staging) {
			allEvents.push(
				...pipelineData.staging.events,
				...(pipelineData.staging.stages?.flatMap((s) => s.subevents) ?? []),
			)
		}
		if (pipelineData.production) {
			allEvents.push(
				...pipelineData.production.events,
				...(pipelineData.production.stages?.flatMap((s) => s.subevents) ?? []),
			)
		}

		const urls = extractRoutes(allEvents)
		for (const url of urls) {
			const id = `${product}:${url}`
			if (registeredRef.current.has(id)) continue
			registeredRef.current.add(id)

			pluginAPI.registerHealthEndpoint({
				product,
				service: extractServiceName(url),
				url,
				environment: detectEnvironment(url, true),
			})
		}
	}, [pipelineData, org, repo])

	// No hay token → null silencioso
	if (!tokenData?.token) return null

	return <SekiPipelineMonitor org={org} repo={repo} />
}
