import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Boxes, Loader2, Activity, Clock, RotateCcw, CheckCircle2, Terminal } from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { useKubectlNamespaceAccess } from "@/hooks/useKubectlNamespaceAccess";
import { getContexts, getCurrentContext, getPodsForDeployment, getDeployments, getResourceLogs } from "@/api/kubectl";
import { queryKeys, applyCachePolicy, invalidateByDomain } from "@/lib/queryKeys";
import { LogsViewer } from "@/components/shared/LogsViewer";

interface K8sSectionProps {
	namespace: string;
}

export function K8sSection({ namespace }: K8sSectionProps) {
	const queryClient = useQueryClient();
	const [selectedContext, setSelectedContext] = useState<string | undefined>(undefined);
	const { data: access, isLoading: checkingAccess } = useKubectlNamespaceAccess(namespace, selectedContext || undefined);
	const [selectedDeployment, setSelectedDeployment] = useState<string | null>(null);
	const [selectedPod, setSelectedPod] = useState<string | null>(null);
	const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
	const [logsResourceType, setLogsResourceType] = useState<"deployment" | "pod">("deployment");
	const [logsName, setLogsName] = useState<string>("");

	const currentName = selectedPod || logsName;
	const currentType = selectedPod ? "pod" : logsResourceType;

	// Use the auto-detected context if user hasn't manually selected one
	const activeContext = selectedContext || access?.validContext || undefined;

	// Query function for logs
	const queryFn = () => getResourceLogs(currentType, currentName, namespace, 100, activeContext);

	// Query deployments for the namespace
	const { data: deployments } = useQuery({
		queryKey: queryKeys.kubectl.deployments(namespace, activeContext),
		queryFn: () => getDeployments(namespace, activeContext),
		refetchInterval: 30000,
		...applyCachePolicy("kubectl"),
	});

	// Build resources list for LogsViewer select - all deployments
	const resources = useMemo(() => {
		const list: { id: string; name: string; type: string }[] = [];
		
		// Add all deployments
		if (deployments && deployments.length > 0) {
			deployments.forEach(dep => {
				list.push({ id: dep.name, name: dep.name, type: 'deployment' });
			});
		}
		
		return list;
	}, [deployments]);

	const selectedResourceId = selectedPod || logsName;

	const handleResourceChange = (resourceId: string) => {
		const resource = resources.find(r => r.id === resourceId);
		if (!resource) return;

		if (resource.type === 'deployment') {
			setLogsResourceType('deployment');
			setLogsName(resource.name);
			setSelectedPod(null);
		} else if (resource.type === 'pod') {
			setSelectedPod(resource.name);
		}
	};

	if (checkingAccess) {
		return (
			<div className="border border-input rounded-lg p-3 flex items-center gap-3 bg-muted/30">
				<Boxes className="w-5 h-5 text-primary flex-shrink-0" />
				<Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
				<span className="text-sm text-muted-foreground">
					{selectedContext 
						? `Obteniendo recursos de Kubernetes: ${selectedContext}`
						: "Obteniendo recursos de Kubernetes..."
					}
				</span>
			</div>
		);
	}

	if (!access?.hasAccess || !access.canGetDeployments) {
		console.log('[K8s] Kubernetes access not available for namespace:', namespace);
		return null;
	}
	console.log('[K8s] Kubernetes access available for namespace:', namespace);

	const handleViewDeploymentLogs = (deploymentName: string) => {
		setLogsResourceType("deployment");
		setLogsName(deploymentName);
		setIsLogsModalOpen(true);
	};

	const handleViewPodLogs = (podName: string) => {
		setLogsResourceType("pod");
		setLogsName(podName);
		setIsLogsModalOpen(true);
	};

	const handleContextChange = (newContext: string | undefined) => {
		setSelectedContext(newContext);
		setSelectedDeployment(null);
		setSelectedPod(null);
		// Invalidate all kubectl queries when context changes
		// Note: namespace-access is NOT invalidated here - TanStack Query handles it automatically
		// by creating a new query with the different context in the key
		invalidateByDomain(queryClient, "kubectl");
	};

	return (
		<>
			<div className="border border-input rounded-lg p-3 flex items-center gap-3 bg-muted/30">
				<Boxes className="w-5 h-5 text-primary flex-shrink-0" />

				<ContextDropdown
					selectedContext={selectedContext}
					onSelect={handleContextChange}
				/>
				
				<DeploymentDropdown
					namespace={namespace}
					context={activeContext}
					selectedDeployment={selectedDeployment}
					onSelect={(deployment) => {
						setSelectedDeployment(deployment);
						setSelectedPod(null);
					}}
				/>

				{selectedDeployment && <DeploymentStats namespace={namespace} context={activeContext} name={selectedDeployment} />}

				{selectedDeployment && (
					<PodDropdown
						namespace={namespace}
						context={activeContext}
						deploymentName={selectedDeployment}
						selectedPod={selectedPod}
						onSelect={setSelectedPod}
					/>
				)}

				{selectedDeployment && (
					<PodStats
						namespace={namespace}
						context={activeContext}
						deploymentName={selectedDeployment}
						selectedPod={selectedPod}
					/>
				)}

				<div className="flex-1" />

				{selectedDeployment && !selectedPod && (
					<button
						type="button"
						onClick={() => handleViewDeploymentLogs(selectedDeployment)}
						className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-primary hover:text-primary/80 hover:bg-primary/10 rounded transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
					>
						<Terminal className="w-3.5 h-3.5" />
						Logs
					</button>
				)}

				{selectedPod && (
					<button
						type="button"
						onClick={() => handleViewPodLogs(selectedPod)}
						className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-primary hover:text-primary/80 hover:bg-primary/10 rounded transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1"
					>
						<Terminal className="w-3.5 h-3.5" />
						Logs
					</button>
				)}
			</div>

			{isLogsModalOpen && selectedDeployment && (
				<LogsViewer
					queryFn={queryFn}
					onClose={() => setIsLogsModalOpen(false)}
					resources={resources}
					selectedResourceId={selectedResourceId}
					onResourceChange={handleResourceChange}
				/>
			)}
		</>
	);
}

function ContextDropdown({
	selectedContext,
	onSelect,
}: {
	selectedContext: string | undefined;
	onSelect: (context: string | undefined) => void;
}) {
	const { data: contexts, isLoading } = useQuery({
		queryKey: queryKeys.kubectl.contexts(),
		queryFn: async () => {
			const contexts = await getContexts();
			const current = await getCurrentContext();
			return { contexts, current };
		},
		refetchInterval: false,
		staleTime: Infinity,
		...applyCachePolicy("kubectl"),
	});

	const displayValue = selectedContext || contexts?.current || "";

	return (
		<select
			value={displayValue}
			onChange={(e) => onSelect(e.target.value || undefined)}
			disabled={isLoading || !contexts || contexts.contexts.length === 0}
			className="min-w-[180px] px-2 py-1 text-sm bg-background border border-input rounded-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1 disabled:opacity-50"
		>
			<option value="">Seleccionar contexto</option>
			{contexts?.contexts.map((ctx) => (
				<option key={ctx} value={ctx}>
					{ctx}
				</option>
			))}
		</select>
	);
}

function DeploymentDropdown({
	namespace,
	context,
	selectedDeployment,
	onSelect,
}: {
	namespace: string;
	context?: string;
	selectedDeployment: string | null;
	onSelect: (deployment: string | null) => void;
}) {
	const { data: deployments, isLoading } = useQuery({
		queryKey: queryKeys.kubectl.deployments(namespace, context),
		queryFn: () => getDeployments(namespace, context),
		refetchInterval: 30000,
		...applyCachePolicy("kubectl"),
	});

	return (
		<select
			value={selectedDeployment || ""}
			onChange={(e) => onSelect(e.target.value || null)}
			disabled={isLoading || !deployments || deployments.length === 0}
			className="min-w-[200px] px-2 py-1 text-sm bg-background border border-input rounded-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1 disabled:opacity-50"
		>
			<option value="">Seleccionar deployment</option>
			{deployments?.map((deployment) => (
				<option key={deployment.name} value={deployment.name}>
					{deployment.name}
				</option>
			))}
		</select>
	);
}

function DeploymentStats({ namespace, context, name }: { namespace: string; context?: string; name: string }) {
	const { data: deployment, isLoading } = useQuery({
		queryKey: queryKeys.kubectl.deployment(namespace, name, context),
		queryFn: async () => {
			const deployments = await getDeployments(namespace, context);
			return deployments?.find((d) => d.name === name);
		},
		enabled: !!name,
		refetchInterval: 30000,
		...applyCachePolicy("kubectl"),
	});

	if (isLoading || !deployment) {
		return <div className="text-xs text-muted-foreground">Cargando...</div>;
	}

	return (
		<div className="flex items-center gap-2 text-xs">
			<div className="flex items-center gap-1 text-muted-foreground" title={`Pods listos / Pods deseados: ${deployment.ready}`}>
				<CheckCircle2 className="w-3.5 h-3.5" />
				<span>{deployment.ready}</span>
			</div>
			<div className="flex items-center gap-1 text-muted-foreground" title={`Replicas actualizadas: ${deployment.upToDate}`}>
				<Activity className="w-3.5 h-3.5" />
				<span>{deployment.upToDate}</span>
			</div>
			<div className="flex items-center gap-1 text-muted-foreground" title={`Replicas disponibles: ${deployment.available}`}>
				<CheckCircle2 className="w-3.5 h-3.5" />
				<span>{deployment.available}</span>
			</div>
			<div className="flex items-center gap-1 text-muted-foreground" title={`Tiempo desde creación: ${deployment.age}`}>
				<Clock className="w-3.5 h-3.5" />
				<span>{deployment.age}</span>
			</div>
		</div>
	);
}

function PodDropdown({
	namespace,
	context,
	deploymentName,
	selectedPod,
	onSelect,
}: {
	namespace: string;
	context?: string;
	deploymentName: string;
	selectedPod: string | null;
	onSelect: (pod: string | null) => void;
}) {
	const { data: pods, isLoading } = useQuery({
		queryKey: queryKeys.kubectl.pods(namespace, deploymentName, context),
		queryFn: () => getPodsForDeployment(deploymentName, namespace, context),
		enabled: !!deploymentName,
		refetchInterval: 30000,
		...applyCachePolicy("kubectl"),
	});

	return (
		<select
			value={selectedPod || ""}
			onChange={(e) => onSelect(e.target.value || null)}
			disabled={isLoading || !pods || pods.length === 0}
			className="min-w-[200px] px-2 py-1 text-sm bg-background border border-input rounded-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1 disabled:opacity-50"
		>
			<option value="">Todos los pods</option>
			{pods?.map((pod) => (
				<option key={pod.name} value={pod.name}>
					{pod.name}
				</option>
			))}
		</select>
	);
}

function PodStats({
	namespace,
	context,
	deploymentName,
	selectedPod,
	pods: podsProp,
}: {
	namespace: string;
	context?: string;
	deploymentName: string;
	selectedPod: string | null;
	pods?: Array<{ name: string; ready: string; status: string; restarts: string; age: string }>;
}) {
	const { data: podsQuery } = useQuery({
		queryKey: queryKeys.kubectl.pods(namespace, deploymentName, context),
		queryFn: () => getPodsForDeployment(deploymentName, namespace, context),
		enabled: !podsProp && !!deploymentName,
		refetchInterval: 30000,
		...applyCachePolicy("kubectl"),
	});

	const pods = podsProp || podsQuery;

	if (!pods || pods.length === 0) {
		return null;
	}

	const targetPod = selectedPod ? pods.find((p) => p.name === selectedPod) : null;

	if (targetPod) {
		// Stats de un pod específico
		return (
			<Tooltip.Provider>
				<div className="flex items-center gap-2 text-xs">
					<Tooltip.Root>
						<Tooltip.Trigger asChild>
							<div className="flex items-center gap-1 text-muted-foreground cursor-help">
								<CheckCircle2 className="w-3.5 h-3.5" />
								<span>{targetPod.ready}</span>
							</div>
						</Tooltip.Trigger>
						<Tooltip.Portal>
							<Tooltip.Content
								className="bg-popover text-popover-foreground border px-2 py-1 text-xs rounded-md shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50"
								sideOffset={5}
							>
								Contenedores listos / totales: {targetPod.ready}
							</Tooltip.Content>
						</Tooltip.Portal>
					</Tooltip.Root>
					<Tooltip.Root>
						<Tooltip.Trigger asChild>
							<span
								className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium cursor-help ${
									targetPod.status === "Running"
										? "bg-green-100 text-green-700"
										: targetPod.status === "Completed"
											? "bg-blue-100 text-blue-700"
											: targetPod.status === "Error"
												? "bg-red-100 text-red-700"
												: "bg-gray-100 text-gray-700"
								}`}
							>
								{targetPod.status}
							</span>
						</Tooltip.Trigger>
						<Tooltip.Portal>
							<Tooltip.Content
								className="bg-popover text-popover-foreground border px-2 py-1 text-xs rounded-md shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50"
								sideOffset={5}
							>
								Estado del pod: {targetPod.status}
							</Tooltip.Content>
						</Tooltip.Portal>
					</Tooltip.Root>
					<Tooltip.Root>
						<Tooltip.Trigger asChild>
							<div className="flex items-center gap-1 text-muted-foreground cursor-help">
								<RotateCcw className="w-3.5 h-3.5" />
								<span>{targetPod.restarts}</span>
							</div>
						</Tooltip.Trigger>
						<Tooltip.Portal>
							<Tooltip.Content
								className="bg-popover text-popover-foreground border px-2 py-1 text-xs rounded-md shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50"
								sideOffset={5}
							>
								Reinicios del pod: {targetPod.restarts}
							</Tooltip.Content>
						</Tooltip.Portal>
					</Tooltip.Root>
					<Tooltip.Root>
						<Tooltip.Trigger asChild>
							<div className="flex items-center gap-1 text-muted-foreground cursor-help">
								<Clock className="w-3.5 h-3.5" />
								<span>{targetPod.age}</span>
							</div>
						</Tooltip.Trigger>
						<Tooltip.Portal>
							<Tooltip.Content
								className="bg-popover text-popover-foreground border px-2 py-1 text-xs rounded-md shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50"
								sideOffset={5}
							>
								Tiempo desde creación: {targetPod.age}
							</Tooltip.Content>
						</Tooltip.Portal>
					</Tooltip.Root>
				</div>
			</Tooltip.Provider>
		);
	}

	// Stats de todos los pods
	const runningPods = pods.filter((p) => p.status === "Running").length;
	return (
		<Tooltip.Provider>
			<div className="flex items-center gap-2 text-xs">
				<Tooltip.Root>
					<Tooltip.Trigger asChild>
						<div className="flex items-center gap-1 text-muted-foreground cursor-help">
							<Activity className="w-3.5 h-3.5" />
							<span>{pods.length}</span>
						</div>
					</Tooltip.Trigger>
					<Tooltip.Portal>
						<Tooltip.Content
							className="bg-popover text-popover-foreground border px-2 py-1 text-xs rounded-md shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50"
							sideOffset={5}
						>
							Total de pods: {pods.length}
						</Tooltip.Content>
					</Tooltip.Portal>
				</Tooltip.Root>
				<Tooltip.Root>
					<Tooltip.Trigger asChild>
						<div className="flex items-center gap-1 text-muted-foreground cursor-help">
							<CheckCircle2 className="w-3.5 h-3.5" />
							<span>{runningPods}</span>
						</div>
					</Tooltip.Trigger>
					<Tooltip.Portal>
						<Tooltip.Content
							className="bg-popover text-popover-foreground border px-2 py-1 text-xs rounded-md shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50"
							sideOffset={5}
						>
							Pods en ejecución: {runningPods}
						</Tooltip.Content>
					</Tooltip.Portal>
				</Tooltip.Root>
			</div>
		</Tooltip.Provider>
	);
}
