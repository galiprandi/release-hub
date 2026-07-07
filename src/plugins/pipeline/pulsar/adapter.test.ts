import { describe, it, expect, vi, beforeEach } from 'vitest'
import { pulsarAdapter } from './adapter'
import * as execApi from '@/api/exec'

vi.mock('@/api/exec', () => ({
	runCommand: vi.fn(),
}))

const mockRunCommand = vi.mocked(execApi.runCommand)

function mockStdout(stdout: string) {
	mockRunCommand.mockResolvedValue({ stdout, stderr: '', success: true })
}

describe('pulsarAdapter', () => {
	beforeEach(() => {
		vi.resetAllMocks()
	})

	describe('isPulsarRepo', () => {
		it('returns true when pulsar-nx-build.yml exists', async () => {
			mockStdout(
				'{"id":215144197,"name":"Nx Build","path":".github/workflows/pulsar-nx-build.yml"}\n{"id":214358634,"name":"Security","path":".github/workflows/security.yml"}'
			)
			const result = await pulsarAdapter.isPulsarRepo('org', 'repo')
			expect(result).toBe(true)
		})

		it('returns false when pulsar-nx-build.yml does not exist', async () => {
			mockStdout('{"id":214358634,"name":"Security","path":".github/workflows/security.yml"}')
			const result = await pulsarAdapter.isPulsarRepo('org', 'repo')
			expect(result).toBe(false)
		})

		it('returns false on API error', async () => {
			mockRunCommand.mockRejectedValue(new Error('API error'))
			const result = await pulsarAdapter.isPulsarRepo('org', 'repo')
			expect(result).toBe(false)
		})
	})

	describe('fetchLatestBuilds', () => {
		it('returns null when workflow not found', async () => {
			mockStdout('{"id":214358634,"name":"Security","path":".github/workflows/security.yml"}')
			const result = await pulsarAdapter.fetchLatestBuilds('org', 'repo')
			expect(result).toBeNull()
		})

		it('fetches and separates staging and production', async () => {
			// Call 1: getWorkflowId
			// Call 2: fetchLatestBuilds → runs
			// Call 3: fetchJobs (staging)
			// Call 4: fetchJobs (production)
			mockRunCommand
				.mockResolvedValueOnce({
					stdout: '{"id":215144197,"name":"Nx Build","path":".github/workflows/pulsar-nx-build.yml"}',
					stderr: '',
					success: true,
				})
				.mockResolvedValueOnce({
					stdout: [
						'{"id":28882017944,"head_branch":"v1.1.4","event":"push","status":"completed","conclusion":"success","head_sha":"b0fab40e62d2c6cb25c8d8215ad6f3a37878f774","display_title":"Nx Build","html_url":"https://github.com/test/repo/actions/runs/28882017944","created_at":"2026-07-07T16:27:17Z","updated_at":"2026-07-07T16:59:35Z","head_commit":{"message":"test","author":{"name":"Test"}}}',
						'{"id":28880625904,"head_branch":"main","event":"push","status":"completed","conclusion":"success","head_sha":"b0fab40e62d2c6cb25c8d8215ad6f3a37878f774","display_title":"Nx Build","html_url":"https://github.com/test/repo/actions/runs/28880625904","created_at":"2026-07-07T16:05:02Z","updated_at":"2026-07-07T16:17:32Z","head_commit":{"message":"test","author":{"name":"Test"}}}',
					].join('\n'),
					stderr: '',
					success: true,
				})
				.mockResolvedValueOnce({
					stdout: '{"id":856765001,"name":"nx-build / 📦 Build and Push Application (ai-workflow.nodejs)","status":"completed","conclusion":"success","html_url":"https://github.com/test/repo/actions/runs/28880625904/job/856765001","started_at":"2026-07-07T16:07:56Z","completed_at":"2026-07-07T16:16:41Z","steps":[]}',
					stderr: '',
					success: true,
				})
				.mockResolvedValueOnce({
					stdout: '{"id":85676959811,"name":"nx-build / 📦 Build and Push Application (ai-workflow.nodejs)","status":"completed","conclusion":"success","html_url":"https://github.com/test/repo/actions/runs/28882017944/job/85676959811","started_at":"2026-07-07T16:49:05Z","completed_at":"2026-07-07T16:58:30Z","steps":[]}',
					stderr: '',
					success: true,
				})

			const result = await pulsarAdapter.fetchLatestBuilds('org', 'repo')

			expect(result).not.toBeNull()
			expect(result?.staging).not.toBeNull()
			expect(result?.staging?.refType).toBe('COMMIT')
			expect(result?.staging?.ref).toBe('b0fab40')
			expect(result?.staging?.environment).toBe('staging')
			expect(result?.staging?.images).toHaveLength(1)
			expect(result?.staging?.images[0].app).toBe('ai-workflow')

			expect(result?.production).not.toBeNull()
			expect(result?.production?.refType).toBe('TAG')
			expect(result?.production?.ref).toBe('v1.1.4')
			expect(result?.production?.environment).toBe('production')
		})

		it('handles empty runs', async () => {
			mockRunCommand
				.mockResolvedValueOnce({
					stdout: '{"id":215144197,"name":"Nx Build","path":".github/workflows/pulsar-nx-build.yml"}',
					stderr: '',
					success: true,
				})
				.mockResolvedValueOnce({
					stdout: '',
					stderr: '',
					success: true,
				})

			const result = await pulsarAdapter.fetchLatestBuilds('org', 'repo')
			expect(result).toEqual({ staging: null, production: null })
		})

		it('detects failed image and extracts error step', async () => {
			mockRunCommand
				.mockResolvedValueOnce({
					stdout: '{"id":215144197,"name":"Nx Build","path":".github/workflows/pulsar-nx-build.yml"}',
					stderr: '',
					success: true,
				})
				.mockResolvedValueOnce({
					stdout: '{"id":28882017944,"head_branch":"v1.1.4","event":"push","status":"completed","conclusion":"failure","head_sha":"b0fab40e62d2c6cb25c8d8215ad6f3a37878f774","display_title":"Nx Build","html_url":"https://github.com/test/repo/actions/runs/28882017944","created_at":"2026-07-07T16:27:17Z","updated_at":"2026-07-07T16:59:35Z","head_commit":{"message":"test","author":{"name":"Test"}}}',
					stderr: '',
					success: true,
				})
				.mockResolvedValueOnce({
					stdout: '{"id":85676959844,"name":"nx-build / 📦 Build and Push Application (ai-workflow-dashboard.nextjs)","status":"completed","conclusion":"failure","html_url":"https://github.com/test/repo/actions/runs/28882017944/job/85676959844","started_at":"2026-07-07T16:49:04Z","completed_at":"2026-07-07T16:55:43Z","steps":[{"number":21,"name":"🐳 Build app image","status":"completed","conclusion":"failure","started_at":"2026-07-07T16:49:30Z","completed_at":"2026-07-07T16:55:40Z"}]}',
					stderr: '',
					success: true,
				})

			const result = await pulsarAdapter.fetchLatestBuilds('org', 'repo')

			expect(result?.production?.state).toBe('FAILED')
			expect(result?.production?.images[0].state).toBe('FAILED')
			expect(result?.production?.images[0].errorStep?.name).toBe('🐳 Build app image')
		})

		it('uses fallback job when all images are skipped', async () => {
			mockRunCommand
				.mockResolvedValueOnce({
					stdout: '{"id":215144197,"name":"Nx Build","path":".github/workflows/pulsar-nx-build.yml"}',
					stderr: '',
					success: true,
				})
				.mockResolvedValueOnce({
					stdout: '{"id":28882017944,"head_branch":"v1.1.4","event":"push","status":"completed","conclusion":"failure","head_sha":"b0fab40e62d2c6cb25c8d8215ad6f3a37878f774","display_title":"Nx Build","html_url":"https://github.com/test/repo/actions/runs/28882017944","created_at":"2026-07-07T16:27:17Z","updated_at":"2026-07-07T16:59:35Z","head_commit":{"message":"test","author":{"name":"Test"}}}',
					stderr: '',
					success: true,
				})
				.mockResolvedValueOnce({
					stdout: [
						'{"id":85676474382,"name":"nx-build / 📋 Validations","status":"completed","conclusion":"failure","html_url":"https://github.com/test/repo/actions/runs/28882017944/job/85676474382","started_at":"2026-07-07T16:46:48Z","completed_at":"2026-07-07T16:47:33Z","steps":[{"number":3,"name":"Checkout","status":"completed","conclusion":"failure","started_at":null,"completed_at":null}]}',
						'{"id":85676775994,"name":"nx-build / 📦 Build and Push Application (ai-workflow.nodejs)","status":"completed","conclusion":"skipped","html_url":"https://github.com/test/repo/actions/runs/28882017944/job/85676775994","started_at":null,"completed_at":null,"steps":[]}',
					].join('\n'),
					stderr: '',
					success: true,
				})

			const result = await pulsarAdapter.fetchLatestBuilds('org', 'repo')

			expect(result?.production?.state).toBe('FAILED')
			expect(result?.production?.images[0].state).toBe('SKIPPED')
			expect(result?.production?.fallbackJob?.name).toBe('nx-build / 📋 Validations')
			expect(result?.production?.fallbackJob?.errorStep?.name).toBe('Checkout')
		})
	})
})
