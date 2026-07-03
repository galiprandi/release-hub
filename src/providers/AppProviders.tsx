import { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import * as Tooltip from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";
import { cachePolicies } from "@/lib/queryKeys";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			// Valores por defecto (se sobrescriben por query si se especifica)
			staleTime: 5 * 60 * 1000, // 5 minutos
			gcTime: 10 * 60 * 1000, // 10 minutos
			retry: 2,
			refetchOnWindowFocus: false,
		},
	},
});

const persister = createSyncStoragePersister({
	storage: window.localStorage,
	key: "release-hub:query-cache",
});

interface AppProvidersProps {
	children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
	return (
		<PersistQueryClientProvider
			client={queryClient}
			persistOptions={{
				persister,
				maxAge: 24 * 60 * 60 * 1000, // 24 horas
				dehydrateOptions: {
					shouldDehydrateQuery: (query) => {
						const domain = query.queryKey[0] as keyof typeof cachePolicies;
						const policy = cachePolicies[domain];

						// Si no hay política definida para el dominio, no persistir
						if (!policy) {
							return false;
						}

						// Respetar política de persistencia del dominio
						if (!policy.persistInLocalStorage) {
							return false;
						}

						// No persistir si el pipeline está en progreso o pendiente
						if (domain === "pipeline") {
							const data = query.state.data as { status?: string } | undefined;
							const status = data?.status?.toLowerCase();
							const inProgressStatuses = ["in_progress", "running", "pending"];

							if (status && inProgressStatuses.includes(status)) {
								return false;
							}
						}

						// Por defecto, persistir queries exitosas si la política lo permite
						return query.state.status === "success";
					},
				},
			}}
		>
			<Tooltip.Provider delayDuration={0}>
				{children}
				<ReactQueryDevtools />
			</Tooltip.Provider>
		</PersistQueryClientProvider>
	);
}
