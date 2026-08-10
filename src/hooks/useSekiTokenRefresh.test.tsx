import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSekiTokenRefresh } from './useSekiTokenRefresh'
import { runCommand } from '@/api/exec'

vi.mock('@/api/exec')

const wrapper = ({ children }: { children: React.ReactNode }) => {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	})
	return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useSekiTokenRefresh', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('obtiene y devuelve el token correctamente', async () => {
		const mockToken = 'eyJhbGciOiJSUzUxMiIsInR5cCI6IkJlYXJlciJ9.eyJzdWIiOiJ0ZXN0In0.signature'
		vi.mocked(runCommand).mockResolvedValue({
			stdout: mockToken,
			stderr: '',
			success: true,
		})

		const onSuccess = vi.fn()
		const { result } = renderHook(() => useSekiTokenRefresh({ onSuccess }), { wrapper })

		act(() => {
			result.current.refreshToken()
		})

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true)
		})

		expect(runCommand).toHaveBeenCalledWith(['seki', 'auth', 'get', '--token-only'])
		expect(onSuccess).toHaveBeenCalledWith(mockToken)
		expect(result.current.isRefreshing).toBe(false)
	})

	it('falla si el comando no devuelve token', async () => {
		vi.mocked(runCommand).mockResolvedValue({
			stdout: '',
			stderr: '',
			success: true,
		})

		const onError = vi.fn()
		const { result } = renderHook(() => useSekiTokenRefresh({ onError }), { wrapper })

		act(() => {
			result.current.refreshToken()
		})

		await waitFor(() => {
			expect(result.current.isError).toBe(true)
		})

		expect(onError).toHaveBeenCalled()
		expect(result.current.error).toContain('no devolvió un token')
	})

	it('falla si el token no tiene formato JWT', async () => {
		vi.mocked(runCommand).mockResolvedValue({
			stdout: 'not-a-jwt',
			stderr: '',
			success: true,
		})

		const onError = vi.fn()
		const { result } = renderHook(() => useSekiTokenRefresh({ onError }), { wrapper })

		act(() => {
			result.current.refreshToken()
		})

		await waitFor(() => {
			expect(result.current.isError).toBe(true)
		})

		expect(result.current.error).toContain('formato JWT válido')
	})

	it('propaga errores del comando', async () => {
		vi.mocked(runCommand).mockRejectedValue(new Error('Command failed'))

		const onError = vi.fn()
		const { result } = renderHook(() => useSekiTokenRefresh({ onError }), { wrapper })

		act(() => {
			result.current.refreshToken()
		})

		await waitFor(() => {
			expect(result.current.isError).toBe(true)
		})

		expect(onError).toHaveBeenCalledWith('Command failed')
	})
})
