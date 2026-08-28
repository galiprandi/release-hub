/**
 * QueryKeys tipadas y políticas de caché para ReleaseHub
 *
 * Este archivo define:
 * 1. Tipos TypeScript para todas las queryKeys
 * 2. Helper functions para generar queryKeys
 * 3. Políticas de caché (staleTime, gcTime, persistencia)
 * 4. Políticas de invalidación por dominio
 */

// ============================================================================
// TIPOS DE QUERY KEYS
// ============================================================================

type QueryKeyDomain =
	| "kubectl"
	| "docker"
	| "git"
	| "pipeline"
	| "github-actions"
	| "pr"
	| "repo"
	| "user"
	| "settings"
	| "tools"
	| "fetcher";

interface BaseQueryKey {
	domain: QueryKeyDomain;
}

// Kubectl
interface KubectlContextsKey extends BaseQueryKey {
	domain: "kubectl";
	type: "contexts";
}

interface KubectlNamespaceAccessKey extends BaseQueryKey {
	domain: "kubectl";
	type: "namespace-access";
	namespace: string;
	context?: string;
}

interface KubectlDeploymentsKey extends BaseQueryKey {
	domain: "kubectl";
	type: "deployments";
	namespace: string;
	context?: string;
}

interface KubectlDeploymentKey extends BaseQueryKey {
	domain: "kubectl";
	type: "deployment";
	namespace: string;
	name: string;
	context?: string;
}

interface KubectlPodsKey extends BaseQueryKey {
	domain: "kubectl";
	type: "pods";
	namespace: string;
	deploymentName?: string;
	context?: string;
}

interface KubectlPodCommitsKey extends BaseQueryKey {
	domain: "kubectl";
	type: "pod-commits";
	namespace: string;
	deploymentName: string;
	context?: string;
}

interface KubectlLogsKey extends BaseQueryKey {
	domain: "kubectl";
	type: "logs";
	namespace: string;
	resourceType: "deployment" | "pod";
	resourceName: string;
	tailSize?: number;
	context?: string;
}

type KubectlQueryKey =
	| KubectlContextsKey
	| KubectlNamespaceAccessKey
	| KubectlDeploymentsKey
	| KubectlDeploymentKey
	| KubectlPodsKey
	| KubectlPodCommitsKey
	| KubectlLogsKey;

// Docker
interface DockerAccessKey extends BaseQueryKey {
	domain: "docker";
	type: "access";
}

interface DockerContainersKey extends BaseQueryKey {
	domain: "docker";
	type: "containers";
}

interface DockerLogsKey extends BaseQueryKey {
	domain: "docker";
	type: "logs";
	containerId: string;
	tailSize?: number;
}

interface DockerStatsKey extends BaseQueryKey {
	domain: "docker";
	type: "stats";
	containerId: string;
}

type DockerQueryKey =
	| DockerAccessKey
	| DockerContainersKey
	| DockerLogsKey
	| DockerStatsKey;

// Git
interface GitUserKey extends BaseQueryKey {
	domain: "git";
	type: "user";
}

interface GitCommitsKey extends BaseQueryKey {
	domain: "git";
	type: "commits";
	repo: string;
}

interface GitTagsKey extends BaseQueryKey {
	domain: "git";
	type: "tags";
	repo: string;
	limit?: number;
}

interface GitDiffKey extends BaseQueryKey {
	domain: "git";
	type: "diff";
	repo: string;
	base: string;
	head: string;
}

interface GitCompareKey extends BaseQueryKey {
	domain: "git";
	type: "compare";
	repo: string;
	sha: string;
}

type GitQueryKey =
	| GitUserKey
	| GitCommitsKey
	| GitTagsKey
	| GitDiffKey
	| GitCompareKey;

// Pipeline
interface PipelineStagingKey extends BaseQueryKey {
	domain: "pipeline";
	type: "staging";
	product: string;
	commit: string;
}

interface PipelineProductionKey extends BaseQueryKey {
	domain: "pipeline";
	type: "production";
	product: string;
	tag: string;
}

interface PipelineDetectionKey extends BaseQueryKey {
	domain: "pipeline";
	type: "detection";
	org: string;
	repo: string;
}

interface PipelineUnifiedKey extends BaseQueryKey {
	domain: "pipeline";
	type: "unified";
	provider: "seki" | "pulsar" | null;
	org: string;
	repo: string;
	viewMode: "staging" | "production";
	ref: string;
}

type PipelineQueryKey =
	| PipelineStagingKey
	| PipelineProductionKey
	| PipelineDetectionKey
	| PipelineUnifiedKey;

// GitHub Actions
interface GitHubActionsSummaryKey extends BaseQueryKey {
	domain: "github-actions";
	type: "summary";
	repo: string;
}

interface GitHubActionsWorkflowKey extends BaseQueryKey {
	domain: "github-actions";
	type: "workflow";
	org: string;
	repo: string;
	workflowName: string;
}

type GitHubActionsQueryKey =
	| GitHubActionsSummaryKey
	| GitHubActionsWorkflowKey;

// Pull Requests
interface PrStatusKey extends BaseQueryKey {
	domain: "pr";
	type: "status";
	repo: string;
	prNumber: number;
}

interface PrListKey extends BaseQueryKey {
	domain: "pr";
	type: "list";
	repo: string;
}

type PrQueryKey =
	| PrStatusKey
	| PrListKey;

// Repository
interface RepoPermissionKey extends BaseQueryKey {
	domain: "repo";
	type: "permission";
	repo: string;
}

interface RepoBranchProtectionKey extends BaseQueryKey {
	domain: "repo";
	type: "branch-protection";
	repo: string;
	branch?: string;
}

type RepoQueryKey =
	| RepoPermissionKey
	| RepoBranchProtectionKey;

// User
interface UserCollectionsKey extends BaseQueryKey {
	domain: "user";
	type: "collections";
}

interface UserReposKey extends BaseQueryKey {
	domain: "user";
	type: "repos";
	org?: string;
}

type UserQueryKey =
	| UserCollectionsKey
	| UserReposKey;

// Settings
interface SettingsKey extends BaseQueryKey {
	domain: "settings";
	type: "general";
}

// Tools
interface ToolJqVersionKey extends BaseQueryKey {
	domain: "tools";
	type: "jq-version";
}

interface ToolGhCliVersionKey extends BaseQueryKey {
	domain: "tools";
	type: "gh-cli-version";
}

interface ToolGhCliAuthKey extends BaseQueryKey {
	domain: "tools";
	type: "gh-cli-auth";
}

type ToolsQueryKey =
	| ToolJqVersionKey
	| ToolGhCliVersionKey
	| ToolGhCliAuthKey;

// Union type de todas las queryKeys
export type AppQueryKey =
	| KubectlQueryKey
	| DockerQueryKey
	| GitQueryKey
	| PipelineQueryKey
	| GitHubActionsQueryKey
	| PrQueryKey
	| RepoQueryKey
	| UserQueryKey
	| SettingsKey
	| ToolsQueryKey;

// ============================================================================
// HELPER FUNCTIONS PARA GENERAR QUERY KEYS
// ============================================================================

export const queryKeys = {
	// Kubectl
	kubectl: {
		contexts: (): readonly ["kubectl", "contexts"] => ["kubectl", "contexts"],
		namespaceAccess: (namespace: string | null, context?: string): readonly ["kubectl", "namespace-access", string | null, string | undefined] =>
			["kubectl", "namespace-access", namespace, context],
		deployments: (namespace: string, context?: string): readonly ["kubectl", "deployments", string, string | undefined] =>
			["kubectl", "deployments", namespace, context],
		deployment: (namespace: string, name: string, context?: string): readonly ["kubectl", "deployment", string, string, string | undefined] =>
			["kubectl", "deployment", namespace, name, context],
		pods: (namespace: string, deploymentName?: string, context?: string): readonly ["kubectl", "pods", string, string | undefined, string | undefined] =>
			["kubectl", "pods", namespace, deploymentName, context],
		podCommits: (namespace: string, deploymentName: string, context?: string): readonly ["kubectl", "pod-commits", string, string, string | undefined] =>
			["kubectl", "pod-commits", namespace, deploymentName, context],
		logs: (namespace: string, resourceType: "deployment" | "pod", resourceName: string, tailSize?: number, context?: string): readonly ["kubectl", "logs", string, "deployment" | "pod", string, number | undefined, string | undefined] =>
			["kubectl", "logs", namespace, resourceType, resourceName, tailSize, context],
	},

	// Docker
	docker: {
		access: (): readonly ["docker", "access"] => ["docker", "access"],
		containers: (): readonly ["docker", "containers"] => ["docker", "containers"],
		logs: (containerId: string, tailSize?: number): readonly ["docker", "logs", string, number | undefined] =>
			["docker", "logs", containerId, tailSize],
		stats: (containerId: string): readonly ["docker", "stats", string] =>
			["docker", "stats", containerId],
	},

	// Git
	git: {
		user: (): readonly ["git", "user"] => ["git", "user"],
		commits: (repo: string): readonly ["git", "commits", string] => ["git", "commits", repo],
		tags: (repo: string, limit?: number): readonly ["git", "tags", string, number | undefined] => ["git", "tags", repo, limit],
		dashboardDetails: (repo: string): readonly ["git", "dashboard-details", string] => ["git", "dashboard-details", repo],
		diff: (repo: string, base: string, head: string): readonly ["git", "diff", string, string, string] =>
			["git", "diff", repo, base, head],
		compare: (repo: string, sha: string): readonly ["git", "compare", string, string] =>
			["git", "compare", repo, sha],
	},

	// Pipeline
	pipeline: {
		staging: (product: string, commit: string): readonly ["pipeline", "staging", string, string] =>
			["pipeline", "staging", product, commit],
		production: (product: string, tag: string): readonly ["pipeline", "production", string, string] =>
			["pipeline", "production", product, tag],
		detection: (org: string, repo: string): readonly ["pipeline", "detection", string, string] =>
			["pipeline", "detection", org, repo],
		unified: (provider: "seki" | "pulsar" | null, org: string, repo: string, viewMode: "staging" | "production", ref: string): readonly ["pipeline", "unified", "seki" | "pulsar" | null, string, string, "staging" | "production", string] =>
			["pipeline", "unified", provider, org, repo, viewMode, ref],
	},

	// GitHub Actions
	githubActions: {
		summary: (repo: string): readonly ["github-actions", "summary", string] =>
			["github-actions", "summary", repo],
		workflow: (org: string, repo: string, workflowName: string): readonly ["github-actions", "workflow", string, string, string] =>
			["github-actions", "workflow", org, repo, workflowName],
	},

	// Pull Requests
	pr: {
		status: (repo: string, prNumber: number): readonly ["pr", "status", string, number] =>
			["pr", "status", repo, prNumber],
		list: (repo: string): readonly ["pr", "list", string] =>
			["pr", "list", repo],
	},

	// Repository
	repo: {
		permission: (repo: string): readonly ["repo", "permission", string] =>
			["repo", "permission", repo],
		branchProtection: (repo: string, branch?: string): readonly ["repo", "branch-protection", string, string | undefined] =>
			["repo", "branch-protection", repo, branch],
	},

	// User
	user: {
		collections: (): readonly ["user", "collections"] => ["user", "collections"],
		repos: (org?: string): readonly ["user", "repos", string | undefined] =>
			["user", "repos", org],
		reposSummary: (): readonly ["user", "reposSummary"] => ["user", "reposSummary"],
		repoSearch: (searchTerm: string): readonly ["user", "repoSearch", string] =>
			["user", "repoSearch", searchTerm],
		fileSearch: (searchTerm: string): readonly ["user", "fileSearch", string] =>
			["user", "fileSearch", searchTerm],
	},

	// Settings
	settings: {
		general: (): readonly ["settings"] => ["settings"],
	},

	// Tools
	tools: {
		jqVersion: (): readonly ["tools", "jq", "version"] => ["tools", "jq", "version"],
		ghCliVersion: (): readonly ["tools", "gh-cli", "version"] => ["tools", "gh-cli", "version"],
		ghCliAuth: (): readonly ["tools", "gh-cli", "auth"] => ["tools", "gh-cli", "auth"],
		curlAccess: (): readonly ["tools", "curl", "access"] => ["tools", "curl", "access"],
	},

	// Fetcher
	fetcher: {
		history: (): readonly ["fetcher", "history"] => ["fetcher", "history"],
	},
} as const;

// ============================================================================
// POLÍTICAS DE CACHÉ
// ============================================================================

export interface CachePolicy {
	staleTime: number;
	gcTime: number;
	persistInLocalStorage: boolean;
	refetchOnWindowFocus: boolean;
	refetchInterval?: number | false;
	retry: number;
}

/**
 * Políticas de caché por tipo de query
 *
 * - NO cachear: staleTime = 0, gcTime = 0
 * - Cachear corto: staleTime < 5 min (datos que cambian frecuentemente)
 * - Cachear medio: staleTime 5-15 min (datos que cambian ocasionalmente)
 * - Cachear largo: staleTime > 15 min (datos que cambian raramente)
 * - Persistir LS: Datos que deben sobrevivir refresh de página
 */
export const cachePolicies: Record<QueryKeyDomain, CachePolicy> = {
	// KUBERNETES: NO cachear ni persistir (depende de VPN)
	kubectl: {
		staleTime: 0, // Siempre fresco
		gcTime: 0, // No cachear
		persistInLocalStorage: false, // NO persistir (VPN dependency)
		refetchOnWindowFocus: false,
		refetchInterval: false,
		retry: 0, // No reintentar si falla (VPN desconectada)
	},

	// DOCKER: NO cachear ni persistir (estado cambia frecuentemente)
	docker: {
		staleTime: 0, // Siempre fresco
		gcTime: 0, // No cachear
		persistInLocalStorage: false, // NO persistir
		refetchOnWindowFocus: false,
		refetchInterval: false,
		retry: 0, // No reintentar si falla
	},

	// GIT: Cachear corto, persistir para carga instantánea, refrescar al volver a la tab
	git: {
		staleTime: 60 * 1000, // 1 minuto
		gcTime: 5 * 60 * 1000, // 5 minutos
		persistInLocalStorage: true, // Persistir para carga instantánea de /github
		refetchOnWindowFocus: true, // Refrescar al volver a la tab
		refetchInterval: false,
		retry: 2,
	},

	// PIPELINE: Cachear corto con polling, no persistir
	pipeline: {
		staleTime: 30 * 1000, // 30 segundos (polling frecuente)
		gcTime: 5 * 60 * 1000, // 5 minutos
		persistInLocalStorage: false, // No persistir pipelines en progreso
		refetchOnWindowFocus: false,
		refetchInterval: false, // Polling manual por componente
		retry: 2,
	},

	// GITHUB-ACTIONS: Cachear medio, no persistir
	"github-actions": {
		staleTime: 5 * 60 * 1000, // 5 minutos
		gcTime: 10 * 60 * 1000, // 10 minutos
		persistInLocalStorage: false,
		refetchOnWindowFocus: false,
		refetchInterval: false,
		retry: 2,
	},

	// PR: Cachear corto, no persistir
	pr: {
		staleTime: 2 * 60 * 1000, // 2 minutos (PRs cambian frecuentemente)
		gcTime: 5 * 60 * 1000, // 5 minutos
		persistInLocalStorage: false,
		refetchOnWindowFocus: false,
		refetchInterval: false,
		retry: 2,
	},

	// REPO: Cachear largo, no persistir
	repo: {
		staleTime: 30 * 60 * 1000, // 30 minutos (permisos cambian raramente)
		gcTime: 60 * 60 * 1000, // 1 hora
		persistInLocalStorage: false,
		refetchOnWindowFocus: false,
		refetchInterval: false,
		retry: 2,
	},

	// USER: Cachear infinito, persistir reposSummary para carga instantánea
	user: {
		staleTime: Infinity, // Nunca stale
		gcTime: Infinity, // Nunca garbage collect
		persistInLocalStorage: true, // Persistir reposSummary para /github instantáneo
		refetchOnWindowFocus: false,
		refetchInterval: false,
		retry: 0,
	},

	// SETTINGS: Cachear infinito, PERSISTIR en LS
	settings: {
		staleTime: Infinity,
		gcTime: Infinity,
		persistInLocalStorage: true, // PERSISTIR (app settings)
		refetchOnWindowFocus: false,
		refetchInterval: false,
		retry: 0,
	},

	// TOOLS: Cachear largo, no persistir
	tools: {
		staleTime: 60 * 60 * 1000, // 1 hora (versión de CLI no cambia)
		gcTime: 24 * 60 * 60 * 1000, // 24 horas
		persistInLocalStorage: false,
		refetchOnWindowFocus: false,
		refetchInterval: false,
		retry: 1,
	},

	// FETCHER: NO cachear, PERSISTIR en LS (historial de fetcher)
	fetcher: {
		staleTime: 0, // Siempre fresco (leer de localStorage real)
		gcTime: Infinity,
		persistInLocalStorage: true, // PERSISTIR (historial de fetcher)
		refetchOnWindowFocus: false,
		refetchInterval: false,
		retry: 0,
	},
};

// ============================================================================
// POLÍTICAS DE INVALIDACIÓN
// ============================================================================

/**
 * Cuándo invalidar queries
 *
 * 1. **Invalidación automática**: React Query invalida cuando:
 *    - staleTime expira y la query se vuelve activa
 *    - Se llama a invalidateQueries()
 *    - Se llama a refetchQueries()
 *
 * 2. **Invalidación manual**: Invalidar cuando:
 *    - El usuario realiza una acción que modifica datos
 *    - Se detecta un cambio externo (ej: webhook)
 *    - Se cambia un contexto global (ej: contexto k8s)
 *
 * 3. **Invalidación por dominio**: Usar prefijos para invalidar grupos
 *    - `["kubectl"]` → invalida todo k8s
 *    - `["pipeline"]` → invalida todos los pipelines
 */

export interface InvalidationRule {
	trigger: string;
	invalidates: readonly (readonly unknown[])[];
	reason: string;
}

export const invalidationRules: InvalidationRule[] = [
	// KUBERNETES
	{
		trigger: "k8s:context-change",
		invalidates: [
			["kubectl", "deployments"],
			["kubectl", "deployment"],
			["kubectl", "pods"],
			["kubectl", "logs"],
		],
		reason: "Al cambiar contexto k8s, invalidar todos los recursos dependientes",
	},
	{
		trigger: "k8s:vpn-disconnect",
		invalidates: [["kubectl"]],
		reason: "Al desconectar VPN, invalidar todo k8s (forzar re-check)",
	},

	// GIT
	{
		trigger: "git:tag-created",
		invalidates: [
			["git", "tags"],
			["repo", "permission"], // Permisos pueden cambiar con tags
		],
		reason: "Al crear tag, invalidar tags y permisos",
	},
	{
		trigger: "git:commit-push",
		invalidates: [
			["git", "commits"],
			["pipeline", "staging"], // Pipeline de staging puede cambiar
		],
		reason: "Al push commit, invalidar commits y pipelines staging",
	},

	// PIPELINE
	{
		trigger: "pipeline:refresh",
		invalidates: [["pipeline"]],
		reason: "Al refrescar pipeline manualmente, invalidar todos",
	},
	{
		trigger: "pipeline:provider-change",
		invalidates: [
			["pipeline", "detection"],
			["pipeline", "unified"],
		],
		reason: "Al cambiar proveedor, invalidar detección y unified",
	},

	// REPOSITORY
	{
		trigger: "repo:branch-protection-change",
		invalidates: [["repo", "branch-protection"]],
		reason: "Al cambiar branch protection, invalidar esa query",
	},

	// USER
	{
		trigger: "user:favorite-toggle",
		invalidates: [["user", "collections"]],
		reason: "Al toggle favorite, invalidar collections (optimistic update)",
	},
	{
		trigger: "user:project-change",
		invalidates: [["user", "collections"]],
		reason: "Al modificar proyectos, invalidar collections",
	},
];

// ============================================================================
// HELPER FUNCTIONS PARA INVALIDACIÓN
// ============================================================================

/**
 * Invalida queries por dominio
 */
export function invalidateByDomain(
	queryClient: import("@tanstack/react-query").QueryClient,
	domain: QueryKeyDomain,
): void {
	queryClient.invalidateQueries({ queryKey: [domain] });
}

/**
 * Invalida queries por trigger específico
 */
export function invalidateByTrigger(
	queryClient: import("@tanstack/react-query").QueryClient,
	trigger: string,
): void {
	const rule = invalidationRules.find((r) => r.trigger === trigger);
	if (rule) {
		rule.invalidates.forEach((queryKey) => {
			queryClient.invalidateQueries({ queryKey });
		});
	}
}

/**
 * Aplica política de caché a una query
 */
export function applyCachePolicy(
	domain: QueryKeyDomain,
): Partial<CachePolicy> {
	const policy = cachePolicies[domain];
	return {
		staleTime: policy.staleTime,
		gcTime: policy.gcTime,
		retry: policy.retry,
		refetchOnWindowFocus: policy.refetchOnWindowFocus,
	};
}
