import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import type { ReactNode } from "react";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 5 * 60 * 1000, // 5 minutos (revalidación en background)
			gcTime: 24 * 60 * 60 * 1000, // 24 horas para persistencia
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
						// No persistir si el pipeline está en progreso o pendiente
						if (query.queryKey[0] === "pipeline") {
							const data = query.state.data as any;
							const status = data?.status?.toLowerCase();
							const inProgressStatuses = ["in_progress", "running", "pending"];
							
							if (status && inProgressStatuses.includes(status)) {
								return false;
							}
						}
						
						// Por defecto, persistir queries exitosas
						return query.state.status === "success";
					},
				},
			}}
		>
			{children}
			<ReactQueryDevtools />
		</PersistQueryClientProvider>
	);
}
