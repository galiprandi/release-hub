import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sekiAdapter } from './adapter'
import * as sekiApi from '@/api/seki'

vi.mock('@/api/seki', () => ({ fetchPipelinesByEnvironment: vi.fn() }))

const mockPipelineResponse = (overrides: Partial<{
	state: string
	event: string
	commit: string
	ref: string
}> = {}) => ({
	state: overrides.state ?? 'SUCCESS',
	created_at: '2025-01-01T00:00:00Z',
	updated_at: '2025-01-01T00:05:00Z',
	events: [],
	git: {
		organization: 'Cencosud-xlabs',
		product: 'argentina-arcus',
		commit: overrides.commit ?? 'abcdef1234567890abcdef1234567890abcdef12',
		commit_message: 'test commit',
		commit_author: 'Test Author',
		stage: 'staging',
		event: overrides.event ?? 'commit',
		ref: overrides.ref ?? '',
	},
})

describe('sekiAdapter', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should fetch and transform both environments', async () => {
		const mockData = {
			staging: mockPipelineResponse({ state: 'SUCCESS', event: 'commit' }),
			production: mockPipelineResponse({ state: 'FAILED', event: 'tag', ref: 'v1.0.0' }),
		}
		vi.mocked(sekiApi.fetchPipelinesByEnvironment).mockResolvedValue({
			data: mockData,
		} as unknown as Awaited<ReturnType<typeof sekiApi.fetchPipelinesByEnvironment>>)

		const result = await sekiAdapter.fetchByEnvironment('Cencosud-xlabs', 'argentina-arcus')

		expect(result?.staging).not.toBeNull()
		expect(result?.staging?.state).toBe('COMPLETED')
		expect(result?.staging?.refType).toBe('COMMIT')

		expect(result?.production).not.toBeNull()
		expect(result?.production?.state).toBe('FAILED')
		expect(result?.production?.refType).toBe('TAG')
		expect(result?.production?.ref).toBe('v1.0.0')
	})

	it('should handle null environments in response', async () => {
		vi.mocked(sekiApi.fetchPipelinesByEnvironment).mockResolvedValue({
			data: { staging: null, production: null },
		} as unknown as Awaited<ReturnType<typeof sekiApi.fetchPipelinesByEnvironment>>)

		const result = await sekiAdapter.fetchByEnvironment('o', 'r')

		expect(result?.staging).toBeNull()
		expect(result?.production).toBeNull()
	})

	it('should transform events and subevents correctly', async () => {
		const mockData = {
			staging: {
				...mockPipelineResponse({ state: 'RUNNING' }),
				events: [
					{
						id: 'ev1',
						label: { es: 'Inicio', en: 'Start', br: '' },
						state: 'SUCCESS',
						created_at: '2025-01-01T00:00:00Z',
						updated_at: '2025-01-01T00:01:00Z',
						markdown: '',
						subevents: [
							{ id: 'sub1', label: 'Step 1', state: 'SUCCESS', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:30Z', markdown: '' },
						],
					},
				],
			},
			production: null,
		}
		vi.mocked(sekiApi.fetchPipelinesByEnvironment).mockResolvedValue({
			data: mockData,
		} as unknown as Awaited<ReturnType<typeof sekiApi.fetchPipelinesByEnvironment>>)

		const result = await sekiAdapter.fetchByEnvironment('o', 'r')

		expect(result?.staging?.events).toHaveLength(2)
		expect(result?.staging?.events[0].name).toBe('Inicio')
		expect(result?.staging?.events[1].name).toBe('Step 1')
	})

	it('should return null on API errors', async () => {
		vi.mocked(sekiApi.fetchPipelinesByEnvironment).mockRejectedValue(new Error('Network error'))

		const result = await sekiAdapter.fetchByEnvironment('o', 'r')

		expect(result).toBeNull()
	})

	it('should extract error markdown from failed subevents', async () => {
		const mockData = {
			staging: {
				...mockPipelineResponse({ state: 'FAILED' }),
				events: [
					{
						id: 'VA',
						label: { es: 'Validación', en: '', br: '' },
						state: 'WARN',
						created_at: '2025-01-01T00:00:00Z',
						updated_at: '2025-01-01T00:01:00Z',
						markdown: '',
						subevents: [
							{
							id: 'JIRA_validation_jira',
							label: 'validation: jira',
							state: 'FAIL',
							created_at: '2025-01-01T00:00:00Z',
							updated_at: '2025-01-01T00:00:30Z',
							markdown: '# Jira validation FAIL\n\nIssue ID not found',
							},
						],
					},
				],
			},
			production: null,
		}
		vi.mocked(sekiApi.fetchPipelinesByEnvironment).mockResolvedValue({
			data: mockData,
		} as unknown as Awaited<ReturnType<typeof sekiApi.fetchPipelinesByEnvironment>>)

		const result = await sekiAdapter.fetchByEnvironment('o', 'r')

		expect(result?.staging?.errorMarkdown).toContain('Jira validation FAIL')
	})
})
