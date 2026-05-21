import { useQuery } from "@tanstack/react-query";
import { checkCurlInstalled } from "@/api/curl";
import { queryKeys, applyCachePolicy } from "@/lib/queryKeys";

export interface CurlAccess {
	hasAccess: boolean;
	isInstalled: boolean;
}

export function useCurlAccess() {
	return useQuery({
		queryKey: queryKeys.tools.curlAccess(),
		queryFn: async (): Promise<CurlAccess> => {
			// Verificar que curl esté instalado
			const isInstalled = await checkCurlInstalled();
			if (!isInstalled) {
				return {
					hasAccess: false,
					isInstalled: false,
				};
			}

			// Si está instalado, tiene acceso
			return {
				hasAccess: true,
				isInstalled: true,
			};
		},
		...applyCachePolicy("tools"), // Reuse tools cache policy (long cache)
	});
}
