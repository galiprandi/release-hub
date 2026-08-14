/**
 * Mock de pipeline fallido con log real de un deploy de Seki.
 * Usado por /dev/seki-preview para probar el modal de error con
 * markdown formateado, copy-to-clipboard y análisis IA.
 */
import type { SekiPipelinesByEnv } from "../adapter";
import type { SekiPipelineData } from "../types";

const FAILED_DEPLOY_LOG = `# Event: Deploy Api

This event deploy **api** on cluster and verify the deployment is living.

## Status: **FAIL**

## Details

The deploy of api **failed** , more details below:

\`\`\`terminal

-----------------------------------------------------------------------
--[ Pod details in STAGING cluster

> Command: kubectl get pods --namespace=argentina-arcus --selector=project=reports

NAME                          READY   STATUS    RESTARTS        AGE
reports-dp-68c46f967d-g9wkx   1/1     Running   0               3d17h
reports-dp-68c46f967d-jr7xf   1/1     Running   0               3d4h
reports-dp-f68b9885d-m54qv    0/1     Running   8 (5m30s ago)   16m


----------------------------------------------------------
--[ FAILED pod reports-dp-f68b9885d-m54qv

> Pod logs
> Command: kubectl logs reports-dp-f68b9885d-m54qv --namespace=argentina-arcus

----------------------------------
--[ Generating project secrets...

> Configuration Rc: PRODUCT_NAME ENVIRONMENT LOG_LEVEL REPORT_DB_NAME STORE_DB_NAME KAFKA_TOPIC_VERSION TASK_DB_NAME ENCRYPTION_MASTER_KEY
> Environment:	 STAGING
> Sourced File:	 /app/config/secrets.json
> Output file:	 /app/config/secrets.js
> Secrets files:  []
> Runtime:	 node

Project secrets generated

[Nest] 15  - 08/14/2026, 2:56:09 PM   DEBUG [TopicNamesService] ar.arcus.report.register.v1

> Pod events
> Command: kubectl get event --namespace argentina-arcus --field-selector involvedObject.name=reports-dp-f68b9885d-m54qv

LAST SEEN   TYPE      REASON                    OBJECT                           MESSAGE
16m         Normal    LoadBalancerNegNotReady   pod/reports-dp-f68b9885d-m54qv   Waiting for pod to become healthy in at least one of the NEG(s): [k8s1-138e3498-argentina-arcus-reports-svc-80-52906662]
16m         Normal    Scheduled                 pod/reports-dp-f68b9885d-m54qv   Successfully assigned argentina-arcus/reports-dp-f68b9885d-m54qv to gke-staging-jobs-pool-50fc3b7b-cbt7
16m         Normal    Pulled                    pod/reports-dp-f68b9885d-m54qv   Container image "us-east1-docker.pkg.dev/cencosudx/seki/base/curl:v1" already present on machine and can be accessed by the pod
16m         Normal    Created                   pod/reports-dp-f68b9885d-m54qv   Container created
16m         Normal    Started                   pod/reports-dp-f68b9885d-m54qv   Container started
26s         Normal    Pulling                   pod/reports-dp-f68b9885d-m54qv   Pulling image "us-east1-docker.pkg.dev/cencosudx/argentina-arcus/app/reports/api:c5935b99bebbd972502541fe985f7b80"
15m         Normal    Pulled                    pod/reports-dp-f68b9885d-m54qv   Successfully pulled image "us-east1-docker.pkg.dev/cencosudx/argentina-arcus/app/reports/api:c5935b99bebbd972502541fe985f7b80" in 39.443s (39.443s including waiting). Image size: 302994620 bytes.
12m         Normal    Created                   pod/reports-dp-f68b9885d-m54qv   Container created
12m         Normal    Started                   pod/reports-dp-f68b9885d-m54qv   Container started
10s         Warning   Unhealthy                 pod/reports-dp-f68b9885d-m54qv   Liveness probe failed: Get "http://10.15.32.81:8080/health": dial tcp 10.15.32.81:8080: connect: connection refused
12m         Warning   Unhealthy                 pod/reports-dp-f68b9885d-m54qv   Readiness probe failed: Get "http://10.15.32.81:8080/health": dial tcp 10.15.32.81:8080: connect: connection refused
13m         Normal    Killing                   pod/reports-dp-f68b9885d-m54qv   Container app failed liveness probe, will be restarted
14m         Normal    Pulled                    pod/reports-dp-f68b9885d-m54qv   Successfully pulled image "us-east1-docker.pkg.dev/cencosudx/argentina-arcus/app/reports/api:c5935b99bebbd972502541fe985f7b80" in 328ms (328ms including waiting). Image size: 302994620 bytes.
13m         Normal    Pulled                    pod/reports-dp-f68b9885d-m54qv   Successfully pulled image "us-east1-docker.pkg.dev/cencosudx/argentina-arcus/app/reports/api:c5935b99bebbd972502541fe985f7b80" in 345ms (345ms including waiting). Image size: 302994620 bytes.
13m         Normal    Pulled                    pod/reports-dp-f68b9885d-m54qv   Successfully pulled image "us-east1-docker.pkg.dev/cencosudx/argentina-arcus/app/reports/api:c5935b99bebbd972502541fe985f7b80" in 295ms (295ms including waiting). Image size: 302994620 bytes.
9m45s       Warning   BackOff                   pod/reports-dp-f68b9885d-m54qv   Back-off restarting failed container app in pod reports-dp-f68b9885d-m54qv_argentina-arcus(ae434609-7a7a-4ff9-93eb-aa6dc9de55e3)
12m         Normal    Pulled                    pod/reports-dp-f68b9885d-m54qv   Successfully pulled image "us-east1-docker.pkg.dev/cencosudx/argentina-arcus/app/reports/api:c5935b99bebbd972502541fe985f7b80" in 316ms (316ms including waiting). Image size: 302994620 bytes.
6m28s       Normal    LoadBalancerNegTimeout    pod/reports-dp-f68b9885d-m54qv   Timeout waiting for pod to become healthy in at least one of the NEG(s): [k8s1-138e3498-argentina-arcus-reports-svc-80-52906662]. Marking condition "cloud.google.com/load-balancer-neg-ready" to True.

\`\`\`

## Information

**Product**: argentina-arcus

**Commit**: 33e6866ba16c6e92d43e013414172387919e89bf

**Environment**: staging`;

export const failedDeployMock: SekiPipelinesByEnv = {
	staging: {
		id: 'failed-staging-001',
		ref: '33e6866ba16c6e92d43e013414172387919e89bf',
		refType: 'COMMIT' as const,
		state: 'FAILED' as const,
		startedAt: '2026-08-14T14:50:00.000Z',
		completedAt: '2026-08-14T15:31:54.000Z',
		updatedAt: '2026-08-14T15:31:54.000Z',
		events: [],
		stages: [
			{
				id: 'CD',
				label: 'Despliegue',
				state: 'FAILED' as const,
				startedAt: '2026-08-14T14:50:00.000Z',
				completedAt: '2026-08-14T15:31:54.000Z',
				subevents: [
					{
						id: 'DEPLOY_api',
						label: 'api: reports',
						state: 'FAILED' as const,
						startedAt: '2026-08-14T14:50:00.000Z',
						completedAt: '2026-08-14T15:31:54.000Z',
						markdown: FAILED_DEPLOY_LOG,
					},
				],
			},
		],
	} as SekiPipelineData,
	production: null,
};
