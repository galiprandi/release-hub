import { useQuery } from "@tanstack/react-query";
import { findFreePort } from "@/api/portForward";
import { DEFAULT_START_PORT, DEFAULT_MAX_PORTS } from "@/config/portForward";

export function usePortFree(initialPort = DEFAULT_START_PORT, max = DEFAULT_MAX_PORTS) {
	return useQuery({
		queryKey: ["port-free", initialPort, max],
		queryFn: () => findFreePort(initialPort, max),
		enabled: true,
		staleTime: 0,
		gcTime: 0,
		retry: 0,
	});
}
