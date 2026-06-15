import { useQuery } from "@tanstack/react-query";
import { runCommand } from "@/api/exec";
import { checkKubectlInstalled, getContexts, getCurrentContext } from "@/api/kubectl";
import { queryKeys, applyCachePolicy } from "@/lib/queryKeys";

export interface KubectlNamespaceAccess {
	canGetPods: boolean;
	canGetDeployments: boolean;
	canGetPodLogs: boolean;
	hasAccess: boolean;
	validContext: string | null;
}

async function checkContextAccess(namespace: string, context: string): Promise<KubectlNamespaceAccess> {
	try {
		const [podsResult, deploymentsResult, logsResult] = await Promise.allSettled([
			runCommand(['kubectl', 'auth', 'can-i', 'get', 'pods', '-n', namespace, `--context=${context}`]),
			runCommand(['kubectl', 'auth', 'can-i', 'get', 'deployments', '-n', namespace, `--context=${context}`]),
			runCommand(['kubectl', 'auth', 'can-i', 'get', 'pods/logs', '-n', namespace, `--context=${context}`]),
		]);

		const canGetPods = podsResult.status === "fulfilled" && podsResult.value.stdout.trim() === "yes";
		const canGetDeployments = deploymentsResult.status === "fulfilled" && deploymentsResult.value.stdout.trim() === "yes";
		const canGetPodLogs = logsResult.status === "fulfilled" && logsResult.value.stdout.trim() === "yes";
		const hasAccess = canGetPods || canGetDeployments || canGetPodLogs;

		return {
			canGetPods,
			canGetDeployments,
			canGetPodLogs,
			hasAccess,
			validContext: hasAccess ? context : null,
		};
	} catch {
		return {
			canGetPods: false,
			canGetDeployments: false,
			canGetPodLogs: false,
			hasAccess: false,
			validContext: null,
		};
	}
}

export function useKubectlNamespaceAccess(namespace: string | null, context?: string) {
	return useQuery({
		queryKey: queryKeys.kubectl.namespaceAccess(namespace, context),
		queryFn: async (): Promise<KubectlNamespaceAccess> => {
			if (!namespace) {
				return {
					canGetPods: false,
					canGetDeployments: false,
					canGetPodLogs: false,
					hasAccess: false,
					validContext: null,
				};
			}

			// Verificar que kubectl esté instalado
			const isInstalled = await checkKubectlInstalled();
			if (!isInstalled) {
				return {
					canGetPods: false,
					canGetDeployments: false,
					canGetPodLogs: false,
					hasAccess: false,
					validContext: null,
				};
			}

			// Si se proporciona un contexto específico, usarlo
			if (context) {
				return await checkContextAccess(namespace, context);
			}

			// Si no se proporciona contexto, detectar automáticamente el primero con permisos
			const contexts = await getContexts();
			const currentContext = await getCurrentContext();

			// Probar primero el contexto actual
			if (currentContext) {
				const currentAccess = await checkContextAccess(namespace, currentContext);
				if (currentAccess.hasAccess) {
					return currentAccess;
				}
			}

			// Si el contexto actual no tiene permisos, probar todos los contextos
			for (const ctx of contexts) {
				if (ctx === currentContext) continue; // Ya probado
				const access = await checkContextAccess(namespace, ctx);
				if (access.hasAccess) {
					return access;
				}
			}

			// Ningún contexto tiene permisos
			return {
				canGetPods: false,
				canGetDeployments: false,
				canGetPodLogs: false,
				hasAccess: false,
				validContext: null,
			};
		},
		enabled: !!namespace,
		...applyCachePolicy("kubectl"),
	});
}
