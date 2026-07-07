import { describe, it, expect } from 'vitest'
import type {
	PulsarBuildData,
	PulsarBuildState,
	PulsarImageJob,
	PulsarRefType,
	PulsarEnvironment,
} from './types'

describe('Pulsar Types', () => {
	describe('PulsarBuildState', () => {
		it('should accept valid state values', () => {
			const states: PulsarBuildState[] = [
				'IDLE',
				'RUNNING',
				'COMPLETED',
				'FAILED',
				'CANCELLED',
				'SKIPPED',
			]
			expect(states).toHaveLength(6)
		})
	})

	describe('PulsarRefType', () => {
		it('should accept COMMIT and TAG', () => {
			const refTypes: PulsarRefType[] = ['COMMIT', 'TAG']
			expect(refTypes).toHaveLength(2)
		})
	})

	describe('PulsarEnvironment', () => {
		it('should accept staging and production', () => {
			const envs: PulsarEnvironment[] = ['staging', 'production']
			expect(envs).toHaveLength(2)
		})
	})

	describe('PulsarImageJob', () => {
		it('should create a valid image job', () => {
			const job: PulsarImageJob = {
				id: 123,
				name: 'nx-build / 📦 Build and Push Application (ai-workflow.nodejs)',
				app: 'ai-workflow',
				appType: 'nodejs',
				state: 'COMPLETED',
				steps: [],
			}
			expect(job.app).toBe('ai-workflow')
			expect(job.appType).toBe('nodejs')
		})
	})

	describe('PulsarBuildData', () => {
		it('should create valid build data structure', () => {
			const data: PulsarBuildData = {
				id: 28882017944,
				ref: 'v1.1.4',
				refType: 'TAG',
				environment: 'production',
				state: 'COMPLETED',
				images: [],
				externalUrl: 'https://github.com/test/repo/actions/runs/1',
				updatedAt: '2026-07-07T16:59:35Z',
			}
			expect(data.id).toBe(28882017944)
			expect(data.refType).toBe('TAG')
			expect(data.environment).toBe('production')
		})

		it('should support COMMIT refType with staging environment', () => {
			const data: PulsarBuildData = {
				id: 28880625904,
				ref: 'b0fab40',
				refType: 'COMMIT',
				environment: 'staging',
				state: 'COMPLETED',
				images: [],
				externalUrl: 'https://github.com/test/repo/actions/runs/2',
				updatedAt: '2026-07-07T16:17:32Z',
			}
			expect(data.refType).toBe('COMMIT')
			expect(data.environment).toBe('staging')
		})
	})
})
