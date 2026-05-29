import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { startPortForward, stopPortForward, getActivePortForwards } from "@/api/portForward";

interface UsePortForwardOptions {
	deployment: string;
	namespace: string;
	context?: string;
}

type PortForwardStatus = "idle" | "loading" | "success" | "error";

export function usePortForward({ deployment, namespace, context }: UsePortForwardOptions) {
	const queryClient = useQueryClient();

	const { data: activeForwards = [] } = useQuery({
		queryKey: ["port-forward", "active"],
		queryFn: getActivePortForwards,
		refetchInterval: 5000,
		staleTime: 0,
		gcTime: 0,
	});

	const activeForward = activeForwards.find(
		(pf) =>
			pf.deployment === deployment &&
			pf.namespace === namespace &&
			pf.context === (context || ""),
	);
	const isActive = !!activeForward;

	const connectMutation = useMutation({
		mutationFn: async ({ localPort, remotePort }: { localPort: number; remotePort: number }) => {
			return startPortForward({
				deployment,
				namespace,
				context,
				localPort,
				remotePort,
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["port-forward", "active"] });
			queryClient.invalidateQueries({ queryKey: ["port-free"] });
		},
	});

	const disconnectMutation = useMutation({
		mutationFn: async () => {
			return stopPortForward({ deployment, namespace, context });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["port-forward", "active"] });
			queryClient.invalidateQueries({ queryKey: ["port-free"] });
		},
	});

	const connect = useCallback(
		async (localPort: number, remotePort: number) => {
			await connectMutation.mutateAsync({ localPort, remotePort });
		},
		[connectMutation],
	);

	const disconnect = useCallback(async () => {
		await disconnectMutation.mutateAsync();
	}, [disconnectMutation]);

	const isPending = connectMutation.isPending || disconnectMutation.isPending;
	const lastError = connectMutation.error || disconnectMutation.error;

	let status: PortForwardStatus = "idle";
	if (isPending) status = "loading";
	else if (isActive) status = "success";
	else if (lastError) status = "error";

	return {
		connect,
		disconnect,
		status,
		error: lastError?.message,
		isActive,
		localPort: activeForward?.localPort,
		remotePort: activeForward?.remotePort,
	};
}
