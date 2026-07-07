import { describe, it, expect } from 'vitest'
import {
	isTagBranch,
	inferRefType,
	parseAppName,
	isImageJob,
	mapGhState,
	mapStepState,
	findErrorStep,
	aggregateRunState,
	formatDuration,
} from './utils'
import type { PulsarImageJob, PulsarStep } from './types'

describe('isTagBranch', () => {
	it('detects semver tags', () => {
		expect(isTagBranch('v1.0.0')).toBe(true)
		expect(isTagBranch('v1.2.3')).toBe(true)
		expect(isTagBranch('v1.0.0-rc.1')).toBe(true)
	})

	it('rejects non-tag branches', () => {
		expect(isTagBranch('main')).toBe(false)
		expect(isTagBranch('staging')).toBe(false)
		expect(isTagBranch('feature/branch')).toBe(false)
		expect(isTagBranch('1.0.0')).toBe(false)
	})
})

describe('inferRefType', () => {
	it('returns TAG for semver branches', () => {
		expect(inferRefType('v1.0.0')).toBe('TAG')
		expect(inferRefType('v2.3.1')).toBe('TAG')
	})

	it('returns COMMIT for non-tag branches', () => {
		expect(inferRefType('main')).toBe('COMMIT')
		expect(inferRefType('staging')).toBe('COMMIT')
	})
})

describe('parseAppName', () => {
	it('extracts app and appType from job name', () => {
		expect(parseAppName('nx-build / 📦 Build and Push Application (ai-workflow.nodejs)')).toEqual({
			app: 'ai-workflow',
			appType: 'nodejs',
		})
		expect(parseAppName('nx-build / 📦 Build and Push Application (flow-canvas.nextjs)')).toEqual({
			app: 'flow-canvas',
			appType: 'nextjs',
		})
	})

	it('returns null for non-image jobs', () => {
		expect(parseAppName('nx-build / 📋 Validations')).toBeNull()
		expect(parseAppName('nx-build / 🔔 Pulsar Notification')).toBeNull()
	})

	it('handles app names without dots', () => {
		expect(parseAppName('nx-build / 📦 Build and Push Application (myapp)')).toEqual({
			app: 'myapp',
			appType: 'unknown',
		})
	})
})

describe('isImageJob', () => {
	it('returns true for Build and Push Application jobs', () => {
		expect(isImageJob('nx-build / 📦 Build and Push Application (ai-workflow.nodejs)')).toBe(true)
	})

	it('returns false for other jobs', () => {
		expect(isImageJob('nx-build / 📋 Validations')).toBe(false)
		expect(isImageJob('nx-build / 🏗️ Build Golden Image')).toBe(false)
	})
})

describe('mapGhState', () => {
	it('maps in_progress to RUNNING', () => {
		expect(mapGhState('in_progress', null)).toBe('RUNNING')
		expect(mapGhState('queued', null)).toBe('RUNNING')
	})

	it('maps completed conclusions', () => {
		expect(mapGhState('completed', 'success')).toBe('COMPLETED')
		expect(mapGhState('completed', 'failure')).toBe('FAILED')
		expect(mapGhState('completed', 'cancelled')).toBe('CANCELLED')
		expect(mapGhState('completed', 'skipped')).toBe('SKIPPED')
	})

	it('defaults to IDLE for unknown', () => {
		expect(mapGhState('unknown', null)).toBe('IDLE')
	})
})

describe('mapStepState', () => {
	it('maps in_progress to RUNNING', () => {
		expect(mapStepState(null, 'in_progress')).toBe('RUNNING')
	})

	it('maps completed conclusions', () => {
		expect(mapStepState('success', 'completed')).toBe('COMPLETED')
		expect(mapStepState('failure', 'completed')).toBe('FAILED')
	})
})

describe('findErrorStep', () => {
	it('finds the first failed step', () => {
		const steps: PulsarStep[] = [
			{ number: 1, name: 'Set up job', state: 'COMPLETED' },
			{ number: 2, name: 'Build', state: 'FAILED' },
			{ number: 3, name: 'Push', state: 'COMPLETED' },
		]
		const errorStep = findErrorStep(steps)
		expect(errorStep?.number).toBe(2)
		expect(errorStep?.name).toBe('Build')
	})

	it('returns undefined when no failed steps', () => {
		const steps: PulsarStep[] = [
			{ number: 1, name: 'Set up job', state: 'COMPLETED' },
		]
		expect(findErrorStep(steps)).toBeUndefined()
	})
})

describe('aggregateRunState', () => {
	it('returns FAILED if any image failed', () => {
		const images: PulsarImageJob[] = [
			{ id: 1, name: 'job1', app: 'a', appType: 'nodejs', state: 'COMPLETED', steps: [] },
			{ id: 2, name: 'job2', app: 'b', appType: 'nextjs', state: 'FAILED', steps: [] },
		]
		expect(aggregateRunState(images)).toBe('FAILED')
	})

	it('returns RUNNING if any image is running', () => {
		const images: PulsarImageJob[] = [
			{ id: 1, name: 'job1', app: 'a', appType: 'nodejs', state: 'COMPLETED', steps: [] },
			{ id: 2, name: 'job2', app: 'b', appType: 'nextjs', state: 'RUNNING', steps: [] },
		]
		expect(aggregateRunState(images)).toBe('RUNNING')
	})

	it('returns COMPLETED if all images completed', () => {
		const images: PulsarImageJob[] = [
			{ id: 1, name: 'job1', app: 'a', appType: 'nodejs', state: 'COMPLETED', steps: [] },
			{ id: 2, name: 'job2', app: 'b', appType: 'nextjs', state: 'COMPLETED', steps: [] },
		]
		expect(aggregateRunState(images)).toBe('COMPLETED')
	})

	it('returns SKIPPED with fallback when all images skipped', () => {
		const images: PulsarImageJob[] = [
			{ id: 1, name: 'job1', app: 'a', appType: 'nodejs', state: 'SKIPPED', steps: [] },
		]
		expect(aggregateRunState(images, 'FAILED')).toBe('FAILED')
	})

	it('returns fallback state when no images', () => {
		expect(aggregateRunState([], 'FAILED')).toBe('FAILED')
		expect(aggregateRunState([], undefined)).toBe('IDLE')
	})
})

describe('formatDuration', () => {
	it('formats minutes and seconds', () => {
		const start = '2026-07-07T16:00:00Z'
		const end = '2026-07-07T16:05:30Z'
		expect(formatDuration(start, end)).toBe('5m 30s')
	})

	it('formats only seconds', () => {
		const start = '2026-07-07T16:00:00Z'
		const end = '2026-07-07T16:00:45Z'
		expect(formatDuration(start, end)).toBe('45s')
	})

	it('returns undefined for missing start', () => {
		expect(formatDuration(undefined, '2026-07-07T16:00:00Z')).toBeUndefined()
	})
})
