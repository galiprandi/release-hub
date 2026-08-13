/**
 * useSekiDeployNotifications
 * Observa el cache de React Query para queries de Seki pipelines
 * y dispara notificaciones nativas del navegador + sonido cuando
 * un despliegue comienza o finaliza.
 *
 * No duplica network calls: se suscribe al query cache existente.
 */

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { SekiPipelinesByEnv } from '@/plugins/pipeline/seki/adapter'
import type { SekiPipelineState } from '@/plugins/pipeline/seki/types'

const ACTIVE_STATES: SekiPipelineState[] = ['STARTED', 'RUNNING']
const TERMINAL_STATES: SekiPipelineState[] = ['COMPLETED', 'SUCCESS', 'FAILED', 'CANCELLED']

interface RepoEnvState {
	staging: SekiPipelineState
	production: SekiPipelineState
}

interface UseSekiDeployNotificationsOptions {
	/** Lista de repos en formato "org/repo" a monitorear */
	repos: string[]
	/** Habilitar/deshabilitar notificaciones */
	enabled: boolean
}

export function useSekiDeployNotifications({
	repos,
	enabled,
}: UseSekiDeployNotificationsOptions) {
	const queryClient = useQueryClient()
	const reposRef = useRef(repos)
	reposRef.current = repos
	const prevStatesRef = useRef<Map<string, RepoEnvState>>(new Map())

	useEffect(() => {
		if (!enabled) return
		if (typeof window === 'undefined' || !('Notification' in window)) return

		// Solicitar permiso si no fue concedido ni denegado
		if (Notification.permission === 'default') {
			Notification.requestPermission().catch(() => {})
		}

		const unsubscribe = queryClient
			.getQueryCache()
			.subscribe((event) => {
				// Solo reaccionar a updates de data
				if (event.type !== 'updated') return

				const queryKey = event.query.queryKey as readonly unknown[]
				if (queryKey[0] !== 'seki-pipelines-env') return

				const org = queryKey[1] as string | undefined
				const repo = queryKey[2] as string | undefined
				if (!org || !repo) return

				const fullName = `${org}/${repo}`
				if (!reposRef.current.includes(fullName)) return

				const data = event.query.state.data as SekiPipelinesByEnv | undefined
				if (!data) return

				const currentStaging = data.staging?.state ?? 'IDLE'
				const currentProd = data.production?.state ?? 'IDLE'

				const prev = prevStatesRef.current.get(fullName)

				// Primera observación: inicializar sin disparar notificaciones
				if (!prev) {
					prevStatesRef.current.set(fullName, {
						staging: currentStaging,
						production: currentProd,
					})
					return
				}

				const transitions: Array<{
					env: 'staging' | 'production'
					type: 'started' | 'completed' | 'failed'
				}> = []

				// Staging: IDLE/terminal → STARTED/RUNNING
				if (
					!ACTIVE_STATES.includes(prev.staging) &&
					ACTIVE_STATES.includes(currentStaging)
				) {
					transitions.push({ env: 'staging', type: 'started' })
				}
				// Staging: STARTED/RUNNING → terminal
				if (
					ACTIVE_STATES.includes(prev.staging) &&
					TERMINAL_STATES.includes(currentStaging)
				) {
					transitions.push({
						env: 'staging',
						type:
							currentStaging === 'FAILED' || currentStaging === 'CANCELLED'
								? 'failed'
								: 'completed',
					})
				}

				// Production: IDLE/terminal → STARTED/RUNNING
				if (
					!ACTIVE_STATES.includes(prev.production) &&
					ACTIVE_STATES.includes(currentProd)
				) {
					transitions.push({ env: 'production', type: 'started' })
				}
				// Production: STARTED/RUNNING → terminal
				if (
					ACTIVE_STATES.includes(prev.production) &&
					TERMINAL_STATES.includes(currentProd)
				) {
					transitions.push({
						env: 'production',
						type:
							currentProd === 'FAILED' || currentProd === 'CANCELLED'
								? 'failed'
								: 'completed',
					})
				}

				for (const t of transitions) {
					const envLabel = t.env === 'staging' ? 'Staging' : 'Production'
					const icon = t.type === 'started' ? '🚀' : t.type === 'completed' ? '✅' : '❌'
					const action =
						t.type === 'started' ? 'inició' : t.type === 'completed' ? 'completó' : 'falló'
					fireNotification(`${fullName} — ${envLabel} ${action}`, icon)
					playSound(t.type === 'failed')
				}

				// Actualizar estado anterior
				prevStatesRef.current.set(fullName, {
					staging: currentStaging,
					production: currentProd,
				})
			})

		return () => {
			unsubscribe()
		}
	}, [queryClient, enabled])
}

function fireNotification(title: string, body: string) {
	if (Notification.permission === 'granted') {
		try {
			new Notification(title, {
				body,
				icon: '/favicon.ico',
				tag: title,
			})
		} catch {
			// Notification API puede fallar en algunos contextos
		}
	}
}

let audioCtx: AudioContext | null = null

/**
 * Dispara una notificación de prueba + sonido.
 * Útil para verificar permisos y audio desde Settings.
 */
export function testSekiNotification() {
	fireNotification('ReleaseHub — Notificación de prueba', '🔔 Las notificaciones funcionan correctamente')
	playSound(false)
}

function playSound(isError: boolean = false) {
	try {
		if (!audioCtx) {
			audioCtx = new AudioContext()
		}
		if (audioCtx.state === 'suspended') {
			audioCtx.resume()
		}

		const osc = audioCtx.createOscillator()
		const gain = audioCtx.createGain()
		osc.connect(gain)
		gain.connect(audioCtx.destination)

		if (isError) {
			// Doble beep descendente para error
			osc.frequency.setValueAtTime(660, audioCtx.currentTime)
			osc.frequency.setValueAtTime(440, audioCtx.currentTime + 0.15)
			gain.gain.setValueAtTime(0.3, audioCtx.currentTime)
			gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4)
			osc.start()
			osc.stop(audioCtx.currentTime + 0.4)
		} else {
			// Beep simple ascendente
			osc.frequency.setValueAtTime(660, audioCtx.currentTime)
			osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15)
			gain.gain.setValueAtTime(0.25, audioCtx.currentTime)
			gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3)
			osc.start()
			osc.stop(audioCtx.currentTime + 0.3)
		}
	} catch {
		// AudioContext puede no estar disponible
	}
}
