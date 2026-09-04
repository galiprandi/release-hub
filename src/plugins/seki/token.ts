/**
 * Seki Token — Adquisición, cache y validación autocontenida.
 *
 * Flujo:
 * 1. Lee token de localStorage (plugin:seki:token)
 * 2. Valida formato JWT (3 partes) y expiración (exp)
 * 3. Si válido: lo usa sin ejecutar CLI
 * 4. Si expirado o ausente: ejecuta `seki auth get --token-only`
 * 5. Persiste en localStorage para próximo inicio
 * 6. Cachea en React Query por el tiempo de vida del token
 *
 * Sin errores visibles: si todo falla, retorna null.
 */

import { useQuery } from '@tanstack/react-query'
import { runCommand } from '@/api/exec'

const STORAGE_KEY = 'plugin:seki:token'

interface StoredToken {
	token: string
	exp: number // unix seconds
}

/** Decodifica el payload de un JWT y extrae exp */
function decodeJwtExp(token: string): number | null {
	try {
		const parts = token.split('.')
		if (parts.length !== 3) return null
		const payload = JSON.parse(
			atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')),
		) as { exp?: number }
		return typeof payload.exp === 'number' ? payload.exp : null
	} catch {
		return null
	}
}

/** Valida que un token tenga formato JWT y no esté expirado */
function isValidToken(token: string): boolean {
	const exp = decodeJwtExp(token)
	if (!exp) return false
	return exp * 1000 > Date.now()
}

/** Lee token de localStorage */
function readStoredToken(): StoredToken | null {
	try {
		const raw = localStorage.getItem(STORAGE_KEY)
		if (!raw) return null
		const parsed = JSON.parse(raw) as StoredToken
		if (!parsed.token || !parsed.exp) return null
		return parsed
	} catch {
		return null
	}
}

/** Persiste token en localStorage */
function writeStoredToken(token: string, exp: number): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, exp }))
	} catch {
		// storage lleno o no disponible, no es crítico
	}
}

/** Ejecuta seki auth get --token-only y valida el resultado */
async function fetchSekiToken(): Promise<StoredToken | null> {
	try {
		const result = await runCommand([
			'seki',
			'auth',
			'get',
			'--token-only',
		])
		const token = result.stdout.trim()
		if (!token) return null

		const exp = decodeJwtExp(token)
		if (!exp) return null

		writeStoredToken(token, exp)
		return { token, exp }
	} catch {
		return null
	}
}

/**
 * Hook autocontenido: obtiene y cachea el token de Seki.
 * - Lee de localStorage primero (sin CLI)
 * - Si expirado o ausente: ejecuta CLI
 * - Cachea en React Query por tiempo de vida del token
 * - Retorna null si todo falla (silencioso)
 */
export function useSekiToken() {
	return useQuery<StoredToken | null>({
		queryKey: ['plugin:seki:token'],
		queryFn: async () => {
			// 1. Intentar leer de localStorage
			const stored = readStoredToken()
			if (stored && isValidToken(stored.token)) {
				return stored
			}

			// 2. Si no válido, ejecutar CLI
			return fetchSekiToken()
		},
		staleTime: 30_000, // revalidar cada 30s; el token se valida internamente
		gcTime: Infinity, // mantener cache en memoria
		retry: 1,
		refetchOnWindowFocus: false,
	})
}

/** Verifica si el token de Seki está disponible (sin montar componente) */
export async function checkSekiTokenAvailable(): Promise<boolean> {
	const stored = readStoredToken()
	if (stored && isValidToken(stored.token)) return true

	const fetched = await fetchSekiToken()
	return fetched !== null
}

/** Retorna el token actual (para uso en adapters) */
export function getSekiPluginToken(): string | null {
	const stored = readStoredToken()
	if (stored && isValidToken(stored.token)) return stored.token
	return null
}
