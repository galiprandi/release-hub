/**
 * Mock data for SekiPipelinePreview — derived from real API response.
 * Used only for visual iteration on /dev/seki-preview.
 */
import type { SekiPipelineData } from '../types'

export const mockStagingData: SekiPipelineData = {
	id: 'seki-8b72c3d',
	ref: '8b72c3d',
	refType: 'COMMIT',
	state: 'STARTED',
	startedAt: '2026-08-13T17:42:05.818Z',
	completedAt: undefined,
	updatedAt: '2026-08-13T17:42:14.658Z',
	events: [],
	stages: [
		{
			id: 'VA',
			label: 'Validación',
			state: 'WARN',
			startedAt: '2026-08-13T17:42:05.818Z',
			completedAt: '2026-08-13T17:42:14.658Z',
			subevents: [
				{ id: 'CONFIG_validation_config', label: 'validation: config', state: 'COMPLETED', startedAt: '2026-08-13T17:42:09.989Z', completedAt: '2026-08-13T17:42:10.768Z' },
				{ id: 'JIRA_validation_jira', label: 'validation: jira', state: 'WARN', startedAt: '2026-08-13T17:42:09.990Z', completedAt: '2026-08-13T17:42:10.844Z', markdown: '# Event: Jira validation\n\n## Status: **FAIL**\n\n## Details\n\n```terminal\n❌ El ID del issue de Jira no se encontró en el mensaje del pull request.\n\nEl mensaje del pull request debe contener el ID del issue de Jira entre corchetes.\nPor ejemplo: [CCMR-1234] reporte de ventas\n```' },
				{ id: 'NAMESPACE_validation_kubernets', label: 'validation: kubernets', state: 'COMPLETED', startedAt: '2026-08-13T17:42:09.988Z', completedAt: '2026-08-13T17:42:14.658Z' },
				{ id: 'SECRETS_validation_secrets', label: 'validation: secrets', state: 'COMPLETED', startedAt: '2026-08-13T17:42:09.986Z', completedAt: '2026-08-13T17:42:10.791Z' },
				{ id: 'WORKSPACE_workspace_info', label: 'workspace: info', state: 'COMPLETED', startedAt: '2026-08-13T17:42:05.818Z', completedAt: '2026-08-13T17:42:05.818Z' },
			],
		},
		{
			id: 'BS',
			label: 'Imagen de dependencias',
			state: 'STARTED',
			startedAt: '2026-08-13T17:42:16.617Z',
			completedAt: undefined,
			subevents: [
				{ id: 'GOLDEN_DEPENDENCIES_golden_dockerize', label: 'golden: dockerize', state: 'STARTED', startedAt: '2026-08-13T17:42:16.617Z', completedAt: undefined },
			],
		},
		{
			id: 'GD',
			label: 'Imagen de proyectos',
			state: 'IDLE',
			startedAt: undefined,
			completedAt: undefined,
			subevents: [
				{ id: 'BUILD_api_bff', label: 'api: bff', state: 'IDLE', startedAt: undefined, completedAt: undefined },
				{ id: 'BUILD_web_portal', label: 'web: portal', state: 'IDLE', startedAt: undefined, completedAt: undefined },
			],
		},
		{
			id: 'TS',
			label: 'Pruebas',
			state: 'IDLE',
			startedAt: undefined,
			completedAt: undefined,
			subevents: [
				{ id: 'TEST_api_bff', label: 'api: bff', state: 'IDLE', startedAt: undefined, completedAt: undefined },
				{ id: 'TEST_web_portal', label: 'web: portal', state: 'IDLE', startedAt: undefined, completedAt: undefined },
			],
		},
		{
			id: 'CD',
			label: 'Despliegue',
			state: 'IDLE',
			startedAt: undefined,
			completedAt: undefined,
			subevents: [
				{ id: 'DEPLOY_api_bff', label: 'api: bff', state: 'IDLE', startedAt: undefined, completedAt: undefined },
				{ id: 'DEPLOY_web_portal', label: 'web: portal', state: 'IDLE', startedAt: undefined, completedAt: undefined },
			],
		},
	],
	commit: {
		message: 'Merge pull request #272 from acme-org/fix/restore-nvmrc-staging-build\n\nfix: restore .nvmrc to unbreak seki staging build',
		author: 'Aliprandi, German Antonio (Externos - RH-T)',
	},
	errorMarkdown: undefined,
}

export const mockProductionData: SekiPipelineData = {
	id: 'seki-d05f76f',
	ref: 'v1.2.19',
	refType: 'TAG',
	state: 'WARN',
	startedAt: '2026-07-29T19:32:05.714Z',
	completedAt: '2026-07-29T19:34:13.002Z',
	updatedAt: '2026-07-29T19:34:13.002Z',
	events: [],
	stages: [
		{
			id: 'VA',
			label: 'Validación',
			state: 'WARN',
			startedAt: '2026-07-29T19:32:05.714Z',
			completedAt: '2026-07-29T19:32:15.778Z',
			subevents: [
				{ id: 'CONFIG_validation_config', label: 'validation: config', state: 'COMPLETED', startedAt: '2026-07-29T19:32:11.674Z', completedAt: '2026-07-29T19:32:13.185Z' },
				{ id: 'JIRA_validation_jira', label: 'validation: jira', state: 'WARN', startedAt: '2026-07-29T19:32:11.675Z', completedAt: '2026-07-29T19:32:12.170Z', markdown: '# Event: Jira validation\n\n## Status: **FAIL**\n\n## Details\n\n```terminal\n❌ El ID del issue de Jira no se encontró en el mensaje del pull request.\n\nEl mensaje del pull request debe contener el ID del issue de Jira entre corchetes.\nPor ejemplo: [CCMR-1234] reporte de ventas\n```' },
				{ id: 'NAMESPACE_validation_kubernets', label: 'validation: kubernets', state: 'COMPLETED', startedAt: '2026-07-29T19:32:11.673Z', completedAt: '2026-07-29T19:32:15.254Z' },
				{ id: 'SECRETS_validation_secrets', label: 'validation: secrets', state: 'COMPLETED', startedAt: '2026-07-29T19:32:11.671Z', completedAt: '2026-07-29T19:32:15.778Z' },
				{ id: 'WORKSPACE_workspace_info', label: 'workspace: info', state: 'COMPLETED', startedAt: '2026-07-29T19:32:05.714Z', completedAt: '2026-07-29T19:32:05.714Z' },
			],
		},
		{
			id: 'BS',
			label: 'Imagen de dependencias',
			state: 'COMPLETED',
			startedAt: '2026-07-29T19:32:17.330Z',
			completedAt: '2026-07-29T19:32:22.061Z',
			subevents: [
				{ id: 'GOLDEN_DEPENDENCIES_golden_dockerize', label: 'golden: dockerize', state: 'COMPLETED', startedAt: '2026-07-29T19:32:17.330Z', completedAt: '2026-07-29T19:32:22.061Z' },
			],
		},
		{
			id: 'GD',
			label: 'Imagen de proyectos',
			state: 'COMPLETED',
			startedAt: '2026-07-29T19:32:24.272Z',
			completedAt: '2026-07-29T19:32:28.858Z',
			subevents: [
				{ id: 'BUILD_api_bff', label: 'api: bff', state: 'COMPLETED', startedAt: '2026-07-29T19:32:24.272Z', completedAt: '2026-07-29T19:32:27.592Z' },
				{ id: 'BUILD_web_portal', label: 'web: portal', state: 'COMPLETED', startedAt: '2026-07-29T19:32:24.273Z', completedAt: '2026-07-29T19:32:28.858Z' },
			],
		},
		{
			id: 'TS',
			label: 'Pruebas',
			state: 'COMPLETED',
			startedAt: '2026-07-29T19:32:31.145Z',
			completedAt: '2026-07-29T19:32:34.757Z',
			subevents: [
				{ id: 'TEST_api_bff', label: 'api: bff', state: 'COMPLETED', startedAt: '2026-07-29T19:32:31.145Z', completedAt: '2026-07-29T19:32:34.023Z' },
				{ id: 'TEST_web_portal', label: 'web: portal', state: 'COMPLETED', startedAt: '2026-07-29T19:32:31.146Z', completedAt: '2026-07-29T19:32:34.757Z' },
			],
		},
		{
			id: 'CD',
			label: 'Despliegue',
			state: 'WARN',
			startedAt: '2026-07-29T19:32:38.044Z',
			completedAt: '2026-07-29T19:34:13.002Z',
			subevents: [
				{ id: 'CR_CGT_compliance', label: 'CGT: compliance', state: 'WARN', startedAt: '2026-07-29T19:32:38.045Z', completedAt: '2026-07-29T19:32:41.156Z', markdown: '# Event: CGT compliance\n\n## Status: **FAIL**\n\n## Details\n\n```terminal\n❌ El ID del issue de Jira no se encontró en el mensaje del pull request.\n\nEl mensaje del pull request debe contener el ID del issue de Jira entre corchetes.\nPor ejemplo: [CCMR-1234] reporte de ventas\n```' },
				{ id: 'DEPLOY_api_bff', label: 'api: bff', state: 'COMPLETED', startedAt: '2026-07-29T19:32:38.047Z', completedAt: '2026-07-29T19:34:13.002Z', deployUrl: 'https://my-product-bff-api.example.com' },
				{ id: 'DEPLOY_web_portal', label: 'web: portal', state: 'COMPLETED', startedAt: '2026-07-29T19:32:38.044Z', completedAt: '2026-07-29T19:33:12.944Z', deployUrl: 'https://my-product-portal-web.example.com' },
			],
		},
	],
	commit: {
		message: 'Merge pull request #266 from acme-org/feature/PROJ-8395\n\nFeature/ararg 8395',
		author: 'Ortiz Tovar, Jose Gregorio (Externo - BC Tecnologia)',
	},
	errorMarkdown: undefined,
}
