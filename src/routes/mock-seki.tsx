import { createFileRoute } from "@tanstack/react-router";
import { SekiMonitor } from "@/components/SekiMonitor/SekiMonitor";

export const Route = createFileRoute("/mock-seki")({
	component: MockSekiPage,
});

function MockSekiPage() {
	const mockPipeline = {
		"state": "STARTED",
		"created_at": "2026-04-24T12:55:02.462Z",
		"updated_at": "2026-04-24T13:03:49.156Z",
		"events": [
			{
				"id": "VA",
				"label": { "es": "Validación", "en": "", "br": "" },
				"state": "WARN",
				"created_at": "2026-04-24T12:55:02.462Z",
				"updated_at": "2026-04-24T12:55:10.172Z",
				"markdown": "",
				"subevents": [
					{
						"id": "CONFIG_validation_config",
						"label": "validation: config",
						"state": "SUCCESS",
						"created_at": "2026-04-24T12:55:04.650Z",
						"updated_at": "2026-04-24T12:55:07.128Z",
						"markdown": "# Event: Config validation\n\n## Status: **SUCCESS**\n\n## Details\n\nThe configuration is OK\n\n\n## Information\n\n**Product**: argentina-arcus\n\n**Commit**: 25332d0147be382a25f44aba4b2ef835789210cf\n\n**Environment**: staging\n"
					},
					{
						"id": "JIRA_validation_jira",
						"label": "validation: jira",
						"state": "WARN",
						"created_at": "2026-04-24T12:55:04.653Z",
						"updated_at": "2026-04-24T12:55:05.991Z",
						"markdown": "# Event: Jira validation\n\n## Status: **FAIL**\n\n## Details\n\n\n\n```terminal\n❌ El ID del issue de Jira no se encontró en el mensaje del pull request.\n\nEl mensaje del pull request debe contener el ID del issue de Jira entre corchetes.\nPor ejemplo: [CCMR-1234] reporte de ventas\n```\n\n\n## Information\n\n**Product**: argentina-arcus\n\n**Commit**: 25332d0147be382a25f44aba4b2ef835789210cf\n\n**Environment**: staging\n"
					},
					{
						"id": "NAMESPACE_validation_kubernets",
						"label": "validation: kubernets",
						"state": "SUCCESS",
						"created_at": "2026-04-24T12:55:04.650Z",
						"updated_at": "2026-04-24T12:55:10.172Z",
						"markdown": "# Event: Namespace validation\n\n## Status: **SUCCESS**\n\n## Details\n\nThe namespace check was successful\n\n\n## Information\n\n**Product**: argentina-arcus\n\n**Commit**: 25332d0147be382a25f44aba4b2ef835789210cf\n\n**Environment**: staging\n"
					},
					{
						"id": "SECRETS_validation_secrets",
						"label": "validation: secrets",
						"state": "SUCCESS",
						"created_at": "2026-04-24T12:55:04.640Z",
						"updated_at": "2026-04-24T12:55:09.089Z",
						"markdown": "# Event: Secrets validation\n\n## Status: **SUCCESS**\n\n## Details\n\nSecrets found in Secret Manager\n\n\n## Information\n\n**Product**: argentina-arcus\n\n**Commit**: 25332d0147be382a25f44aba4b2ef835789210cf\n\n**Environment**: staging\n"
					},
					{
						"id": "WORKSPACE_workspace_info",
						"label": "workspace: info",
						"state": "SUCCESS",
						"created_at": "2026-04-24T12:55:02.462Z",
						"updated_at": "2026-04-24T12:55:02.462Z",
						"markdown": "# Task: Workspace Validation\n\nThis task validate the correct workspace structure in product. The workspace structure is the base of the Seki CI.\n\n## Status: **SUCCESS**\n\n## Details\n\nThe workspace structure is valid.\n\n**Product**: argentina-arcus\n\n**Commit**: 25332d0147be382a25f44aba4b2ef835789210cf\n"
					}
				]
			},
			{
				"id": "BS",
				"label": { "es": "Imagen de dependencias", "en": "", "br": "" },
				"state": "SUCCESS",
				"created_at": "2026-04-24T12:55:16.754Z",
				"updated_at": "2026-04-24T12:55:19.965Z",
				"markdown": "",
				"subevents": [
					{
						"id": "GOLDEN_DEPENDENCIES_golden_dockerize",
						"label": "golden: dockerize",
						"state": "SUCCESS",
						"created_at": "2026-04-24T12:55:16.754Z",
						"updated_at": "2026-04-24T12:55:19.965Z",
						"markdown": "# Event: Build Golden Image\n\nThis event build a **golden image** to be used as base image when the project source image is created.\n\n## Status: **SUCCESS**\n\n## Details\n\nThe **golden image** was built by cloud servers without any problem.\n\n## Information\n\n**Product**: argentina-arcus\n\n**Commit**: 25332d0147be382a25f44aba4b2ef835789210cf\n\n**Environment**: staging\n\n**Docker Image**: us-east1-docker.pkg.dev/cencosudx/argentina-arcus/build/nodejs:0c307aee2bca138b8cb4afdb81559680\n"
					}
				]
			},
			{
				"id": "GD",
				"label": { "es": "Imagen de proyectos", "en": "", "br": "" },
				"state": "SUCCESS",
				"created_at": "2026-04-24T12:55:23.740Z",
				"updated_at": "2026-04-24T13:02:57.613Z",
				"markdown": "",
				"subevents": [
					{
						"id": "BUILD_cronjob_auto-closer-checklists",
						"label": "cronjob: auto-closer-checklists",
						"state": "SUCCESS",
						"created_at": "2026-04-24T12:55:23.740Z",
						"updated_at": "2026-04-24T13:02:57.613Z",
						"markdown": "# Event: Build Cronjob Image\n\nThis event build a **cronjob image** with argentina-arcus source code to be used in the deployment.\n\n## Status: **SUCCESS**\n\n## Details\n\nThe **cronjob image** was built by cloud servers without any problem.\n\n## Information\n\n**Product**: argentina-arcus\n\n**Commit**: 25332d0147be382a25f44aba4b2ef835789210cf\n\n**Environment**: staging\n\n**Docker Image**: us-east1-docker.pkg.dev/cencosudx/argentina-arcus/app/auto-closer-checklists/cronjob:cc7fa3c95c33c8e240160ff1f497f455\n"
					},
					{
						"id": "BUILD_cronjob_auto-closer-found-rate",
						"label": "cronjob: auto-closer-found-rate",
						"state": "SUCCESS",
						"created_at": "2026-04-24T12:55:23.747Z",
						"updated_at": "2026-04-24T13:02:35.490Z",
						"markdown": "# Event: Build Cronjob Image\n\nThis event build a **cronjob image** with argentina-arcus source code to be used in the deployment.\n\n## Status: **SUCCESS**\n\n## Details\n\nThe **cronjob image** was built by cloud servers without any problem.\n\n## Information\n\n**Product**: argentina-arcus\n\n**Commit**: 25332d0147be382a25f44aba4b2ef835789210cf\n\n**Environment**: staging\n\n**Docker Image**: us-east1-docker.pkg.dev/cencosudx/argentina-arcus/app/auto-closer-found-rate/cronjob:1fee8c32e9e4743e028c10ce9a666caa\n"
					},
					{
						"id": "BUILD_cronjob_auto-closer-merchandise-reception",
						"label": "cronjob: auto-closer-merchandise-reception",
						"state": "SUCCESS",
						"created_at": "2026-04-24T12:55:23.749Z",
						"updated_at": "2026-04-24T13:02:33.668Z",
						"markdown": "# Event: Build Cronjob Image\n\nThis event build a **cronjob image** with argentina-arcus source code to be used in the deployment.\n\n## Status: **SUCCESS**\n\n## Details\n\nThe **cronjob image** was built by cloud servers without any problem.\n\n## Information\n\n**Product**: argentina-arcus\n\n**Commit**: 25332d0147be382a25f44aba4b2ef835789210cf\n\n**Environment**: staging\n\n**Docker Image**: us-east1-docker.pkg.dev/cencosudx/argentina-arcus/app/auto-closer-merchandise-reception/cronjob:65843b2cc4d45540643ef8f620612774\n"
					},
					{
						"id": "BUILD_cronjob_auto-closer-transport-alert",
						"label": "cronjob: auto-closer-transport-alert",
						"state": "SUCCESS",
						"created_at": "2026-04-24T12:55:23.751Z",
						"updated_at": "2026-04-24T13:02:24.809Z",
						"markdown": "# Event: Build Cronjob Image\n\nThis event build a **cronjob image** with argentina-arcus source code to be used in the deployment.\n\n## Status: **SUCCESS**\n\n## Details\n\nThe **cronjob image** was built by cloud servers without any problem.\n\n## Information\n\n**Product**: argentina-arcus\n\n**Commit**: 25332d0147be382a25f44aba4b2ef835789210cf\n\n**Environment**: staging\n\n**Docker Image**: us-east1-docker.pkg.dev/cencosudx/argentina-arcus/app/auto-closer-transport-alert/cronjob:dac9ed2db37ea25554ec3890a174e0a2\n"
					},
					{
						"id": "BUILD_cronjob_auto-closer-umv-foundrate",
						"label": "cronjob: auto-closer-umv-foundrate",
						"state": "SUCCESS",
						"created_at": "2026-04-24T12:55:23.753Z",
						"updated_at": "2026-04-24T13:02:29.726Z",
						"markdown": "# Event: Build Cronjob Image\n\nThis event build a **cronjob image** with argentina-arcus source code to be used in the deployment.\n\n## Status: **SUCCESS**\n\n## Details\n\nThe **cronjob image** was built by cloud servers without any problem.\n\n## Information\n\n**Product**: argentina-arcus\n\n**Commit**: 25332d0147be382a25f44aba4b2ef835789210cf\n\n**Environment**: staging\n\n**Docker Image**: us-east1-docker.pkg.dev/cencosudx/argentina-arcus/app/auto-closer-umv-foundrate/cronjob:92d348d7dd91b79d8558282d9cb71f28\n"
					},
					{
						"id": "BUILD_cronjob_auto-creator-operation-easy",
						"label": "cronjob: auto-creator-operation-easy",
						"state": "SUCCESS",
						"created_at": "2026-04-24T12:55:23.756Z",
						"updated_at": "2026-04-24T13:02:35.671Z",
						"markdown": "# Event: Build Cronjob Image\n\nThis event build a **cronjob image** with argentina-arcus source code to be used in the deployment.\n\n## Status: **SUCCESS**\n\n## Details\n\nThe **cronjob image** was built by cloud servers without any problem.\n\n## Information\n\n**Product**: argentina-arcus\n\n**Commit**: 25332d0147be382a25f44aba4b2ef835789210cf\n\n**Environment**: staging\n\n**Docker Image**: us-east1-docker.pkg.dev/cencosudx/argentina-arcus/app/auto-creator-operation-easy/cronjob:1a209b7b0a915743eda32ed3c7651c22\n"
					},
					{
						"id": "BUILD_cronjob_auto-metrics-notifier",
						"label": "cronjob: auto-metrics-notifier",
						"state": "SUCCESS",
						"created_at": "2026-04-24T12:55:23.758Z",
						"updated_at": "2026-04-24T13:02:05.173Z",
						"markdown": "# Event: Build Cronjob Image\n\nThis event build a **cronjob image** with argentina-arcus source code to be used in the deployment.\n\n## Status: **SUCCESS**\n\n## Details\n\nThe **cronjob image** was built by cloud servers without any problem.\n\n## Information\n\n**Product**: argentina-arcus\n\n**Commit**: 25332d0147be382a25f44aba4b2ef835789210cf\n\n**Environment**: staging\n\n**Docker Image**: us-east1-docker.pkg.dev/cencosudx/argentina-arcus/app/auto-metrics-notifier/cronjob:eeab8f6dc6dacaf9ad54bdfeb7588c27\n"
					}
				]
			},
			{
				"id": "CI",
				"label": { "es": "Infraestructura", "en": "", "br": "" },
				"state": "SUCCESS",
				"created_at": "2026-04-24T12:55:16.758Z",
				"updated_at": "2026-04-24T12:55:33.920Z",
				"markdown": "",
				"subevents": []
			},
			{
				"id": "TS",
				"label": { "es": "Pruebas", "en": "", "br": "" },
				"state": "SUCCESS",
				"created_at": "2026-04-24T12:55:35.644Z",
				"updated_at": "2026-04-24T13:03:07.612Z",
				"markdown": "",
				"subevents": []
			},
			{
				"id": "CD",
				"label": { "es": "Despliegue", "en": "", "br": "" },
				"state": "STARTED",
				"created_at": "2026-04-24T13:03:12.579Z",
				"updated_at": "2026-04-24T13:03:49.156Z",
				"markdown": "",
				"subevents": [
					{
						"id": "DEPLOY_cronjob_auto-closer-checklists",
						"label": "cronjob: auto-closer-checklists",
						"state": "STARTED",
						"created_at": "2026-04-24T13:03:12.584Z",
						"updated_at": "2026-04-24T13:03:07.612Z",
						"markdown": ""
					},
					{
						"id": "DEPLOY_cronjob_auto-closer-found-rate",
						"label": "cronjob: auto-closer-found-rate",
						"state": "STARTED",
						"created_at": "2026-04-24T13:03:12.585Z",
						"updated_at": "2026-04-24T13:03:07.612Z",
						"markdown": ""
					},
					{
						"id": "DEPLOY_cronjob_auto-closer-merchandise-reception",
						"label": "cronjob: auto-closer-merchandise-reception",
						"state": "SUCCESS",
						"created_at": "2026-04-24T13:03:12.586Z",
						"updated_at": "2026-04-24T13:03:46.927Z",
						"markdown": "# Event: Deploy Cronjob\n\nThis event deploy **cronjob** and verify the deployment is living.\n\n## Status: **SUCCESS**\n\n## Details\n\nThe **cronjob** deployment was successful, see details below:\n\n**Route**: [INTERNAL] namespace __argentina-arcus__ deployment __auto-closer-merchandise-reception-dp__\n\n## Information\n\n**Product**: argentina-arcus\n\n**Commit**: 25332d0147be382a25f44aba4b2ef835789210cf\n\n**Environment**: staging\n"
					},
					{
						"id": "DEPLOY_cronjob_auto-closer-transport-alert",
						"label": "cronjob: auto-closer-transport-alert",
						"state": "STARTED",
						"created_at": "2026-04-24T13:03:12.579Z",
						"updated_at": "2026-04-24T13:03:07.612Z",
						"markdown": ""
					},
					{
						"id": "DEPLOY_cronjob_auto-closer-umv-foundrate",
						"label": "cronjob: auto-closer-umv-foundrate",
						"state": "SUCCESS",
						"created_at": "2026-04-24T13:03:12.580Z",
						"updated_at": "2026-04-24T13:03:49.156Z",
						"markdown": "# Event: Deploy Cronjob\n\nThis event deploy **cronjob** and verify the deployment is living.\n\n## Status: **SUCCESS**\n\n## Details\n\nThe **cronjob** deployment was successful, see details below:\n\n**Route**: [INTERNAL] namespace __argentina-arcus__ deployment __auto-closer-umv-foundrate-dp__\n\n## Information\n\n**Product**: argentina-arcus\n\n**Commit**: 25332d0147be382a25f44aba4b2ef835789210cf\n\n**Environment**: staging\n"
					},
					{
						"id": "DEPLOY_cronjob_auto-creator-operation-easy",
						"label": "cronjob: auto-creator-operation-easy",
						"state": "SUCCESS",
						"created_at": "2026-04-24T13:03:12.582Z",
						"updated_at": "2026-04-24T13:03:47.060Z",
						"markdown": "# Event: Deploy Cronjob\n\nThis event deploy **cronjob** and verify the deployment is living.\n\n## Status: **SUCCESS**\n\n## Details\n\nThe **cronjob** deployment was successful, see details below:\n\n**Route**: [INTERNAL] namespace __argentina-arcus__ deployment __auto-creator-operation-easy-dp__\n\n## Information\n\n**Product**: argentina-arcus\n\n**Commit**: 25332d0147be382a25f44aba4b2ef835789210cf\n\n**Environment**: staging\n"
					},
					{
						"id": "DEPLOY_cronjob_auto-metrics-notifier",
						"label": "cronjob: auto-metrics-notifier",
						"state": "STARTED",
						"created_at": "2026-04-24T13:03:12.583Z",
						"updated_at": "2026-04-24T13:03:07.612Z",
						"markdown": ""
					}
				]
			}
		],
		"git": {
			"organization": "Cencosud-xlabs",
			"product": "argentina-arcus",
			"commit": "25332d0147be382a25f44aba4b2ef835789210cf",
			"commit_message": "Merge pull request #1671 from Cencosud-xlabs/fix/ARARG-8153-crons\n\nfix(ARARG-8153): redeploy the crons",
			"commit_author": "Perez, Yoan (Externo - WITI)",
			"stage": "staging",
			"event": "commit",
			"ref": "25332d0147be382a25f44aba4b2ef835789210cf"
		}
	};

	return (
		<div className="container mx-auto p-8">
			<h1 className="text-2xl font-bold mb-6">Mock Seki Monitor</h1>

			<h2 className="text-lg font-semibold mb-4">Estado: Loading</h2>
			<SekiMonitor
				pipeline={mockPipeline}
				stage="staging"
				isLoading={true}
			/>

			<h2 className="text-lg font-semibold mb-4 mt-8">Estado: Error</h2>
			<SekiMonitor
				pipeline={mockPipeline}
				stage="staging"
				error={new Error("Error de conexión con la API")}
			/>

			<h2 className="text-lg font-semibold mb-4 mt-8">Estado: Normal (STARTED)</h2>
			<SekiMonitor
				pipeline={mockPipeline}
				stage="staging"
			/>
		</div>
	);
}
