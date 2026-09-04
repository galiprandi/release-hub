/**
 * Health Endpoint Bridge
 *
 * Permite que plugins registren health endpoints sin acoplamiento directo
 * con useHealthMonitor. Escribe en el mismo localStorage key que usa
 * useHealthMonitor y dispatcha un custom event para que la health page
 * se re-renderice y pick up los nuevos endpoints.
 *
 * No modifica useHealthMonitor (prohibido por AGENTS.md regla #5).
 */

import { useState, useEffect } from 'react'
import type { HealthEndpointRegistration } from './types'

const HEALTH_STORAGE_KEY = 'seki:health:endpoints:v1'
const HEALTH_EVENT = 'seki:health:endpoints:updated'

interface StoredEndpoints {
	endpoints: HealthEndpoint[]
	version: number
}

interface HealthEndpoint {
	id: string
	product: string
	service: string
	url: string
	environment: 'staging' | 'production'
	lastChecked: string
	isHealthy: boolean | null
	responseTime?: number
	error?: string
	details?: string
}

function readStoredEndpoints(): HealthEndpoint[] {
	try {
		const raw = localStorage.getItem(HEALTH_STORAGE_KEY)
		if (!raw) return []
		const parsed = JSON.parse(raw) as StoredEndpoints
		return parsed.endpoints || []
	} catch {
		return []
	}
}

function writeStoredEndpoints(endpoints: HealthEndpoint[]): void {
	try {
		localStorage.setItem(
			HEALTH_STORAGE_KEY,
			JSON.stringify({ endpoints, version: 1 }),
		)
	} catch {
		// storage lleno o no disponible
	}
}

/**
 * Registra un health endpoint en localStorage (mismo formato que useHealthMonitor).
 * Dispatcha un custom event para que la health page se re-renderice.
 * Evita duplicados por id.
 */
export function registerHealthEndpoint(
	registration: HealthEndpointRegistration,
): void {
	const id = `${registration.product}:${registration.service}:${registration.environment}`

	const existing = readStoredEndpoints()
	const exists = existing.some((ep) => ep.id === id)
	if (exists) return

	const newEndpoint: HealthEndpoint = {
		id,
		product: registration.product,
		service: registration.service,
		url: registration.url,
		environment: registration.environment,
		lastChecked: new Date().toISOString(),
		isHealthy: null,
	}

	writeStoredEndpoints([...existing, newEndpoint])

	// Dispatch event para que la health page re-lea localStorage
	window.dispatchEvent(new CustomEvent(HEALTH_EVENT))
}

/**
 * Hook para escuchar registros de health endpoints desde plugins.
 * Retorna un counter que incrementa cuando se registra un nuevo endpoint.
 * Usarlo como key para forzar re-render del contenido que usa useHealthMonitor.
 */
export function useHealthEndpointSync(): number {
	const [syncCounter, setSyncCounter] = useState(0)

	useEffect(() => {
		const handler = () => setSyncCounter((c) => c + 1)
		window.addEventListener(HEALTH_EVENT, handler)
		return () => window.removeEventListener(HEALTH_EVENT, handler)
	}, [])

	return syncCounter
}
