import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys, applyCachePolicy } from "@/lib/queryKeys";
import type { QueryRecord } from "@/types/queries";
import { generateQueryId, parseCurlCommand, generateQueryHash } from "@/utils/curlParser";

const STORAGE_KEY = "queries-history";

/**
 * Loads queries history from localStorage
 */
function loadHistoryFromStorage(): QueryRecord[] {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		return stored ? JSON.parse(stored) : [];
	} catch {
		return [];
	}
}

/**
 * Saves queries history to localStorage
 */
function saveHistoryToStorage(history: QueryRecord[]): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
	} catch (error) {
		console.error("[Queries] Failed to save history to localStorage:", error);
	}
}

export function useQueriesHistory() {
	const queryClient = useQueryClient();

	// Query to fetch history
	const query = useQuery({
		queryKey: queryKeys.queries.history(),
		queryFn: () => loadHistoryFromStorage(),
		...applyCachePolicy("queries"),
	});

	// Mutation to add or update a query record
	const addQueryRecord = useMutation({
		mutationFn: async (record: Omit<QueryRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<QueryRecord> => {
			// Validate that curl is not empty
			if (!record.curl || record.curl.trim() === '') {
				throw new Error('Cannot save query with empty curl');
			}

			const currentHistory = loadHistoryFromStorage();

			// Parse curl to generate hash for comparison
			const parsed = parseCurlCommand(record.curl);
			const hash = generateQueryHash(parsed);

			// Find existing record by hash instead of exact curl match
			const existingIndex = currentHistory.findIndex((q) => {
				const existingParsed = parseCurlCommand(q.curl);
				const existingHash = generateQueryHash(existingParsed);
				return existingHash === hash;
			});

			const now = new Date().toISOString();

			const newRecord: QueryRecord = {
				...record,
				id: generateQueryId(record.curl),
				createdAt: existingIndex !== -1 ? currentHistory[existingIndex].createdAt : now,
				updatedAt: now,
			};

			if (existingIndex !== -1) {
				// Update existing record and move to position 0
				currentHistory[existingIndex] = newRecord;
				const updatedHistory = [newRecord, ...currentHistory.filter((_, i) => i !== existingIndex)];
				saveHistoryToStorage(updatedHistory);
				return newRecord;
			} else {
				// Add new record at position 0
				const updatedHistory = [newRecord, ...currentHistory].slice(0, 60);
				saveHistoryToStorage(updatedHistory);
				return newRecord;
			}
		},
		onMutate: async (newRecord) => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({ queryKey: queryKeys.queries.history() });

			// Snapshot previous value
			const previousHistory = queryClient.getQueryData<QueryRecord[]>(queryKeys.queries.history());

			// Parse curl to generate hash for comparison
			const parsed = parseCurlCommand(newRecord.curl);
			const hash = generateQueryHash(parsed);

			// Optimistically update
			const currentHistory = previousHistory || [];
			const existingIndex = currentHistory.findIndex((q) => {
				const existingParsed = parseCurlCommand(q.curl);
				const existingHash = generateQueryHash(existingParsed);
				return existingHash === hash;
			});
			const now = new Date().toISOString();

			const optimisticRecord: QueryRecord = {
				...newRecord,
				id: generateQueryId(newRecord.curl),
				createdAt: existingIndex !== -1 ? currentHistory[existingIndex].createdAt : now,
				updatedAt: now,
			};

			let optimisticHistory;
			if (existingIndex !== -1) {
				optimisticHistory = [optimisticRecord, ...currentHistory.filter((_, i) => i !== existingIndex)];
			} else {
				optimisticHistory = [optimisticRecord, ...currentHistory].slice(0, 60);
			}

			queryClient.setQueryData(queryKeys.queries.history(), optimisticHistory);

			return { previousHistory };
		},
		onError: (_err, _newRecord, context) => {
			// Rollback to previous value
			if (context?.previousHistory) {
				queryClient.setQueryData(queryKeys.queries.history(), context.previousHistory);
			}
		},
		onSuccess: () => {
			// Refetch to ensure consistency
			queryClient.invalidateQueries({ queryKey: queryKeys.queries.history() });
		},
	});

	// Mutation to delete a query record
	const deleteQueryRecord = useMutation({
		mutationFn: async (id: string): Promise<string> => {
			const currentHistory = loadHistoryFromStorage();
			const updatedHistory = currentHistory.filter((q) => q.id !== id);
			saveHistoryToStorage(updatedHistory);
			return id;
		},
		onMutate: async (id) => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({ queryKey: queryKeys.queries.history() });

			// Snapshot previous value
			const previousHistory = queryClient.getQueryData<QueryRecord[]>(queryKeys.queries.history());

			// Optimistically remove the record
			if (previousHistory) {
				queryClient.setQueryData(
					queryKeys.queries.history(),
					previousHistory.filter((q) => q.id !== id)
				);
			}

			return { previousHistory };
		},
		onError: (_err, _id, context) => {
			// Rollback to previous value
			if (context?.previousHistory) {
				queryClient.setQueryData(queryKeys.queries.history(), context.previousHistory);
			}
		},
		onSuccess: () => {
			// Refetch to ensure consistency
			queryClient.invalidateQueries({ queryKey: queryKeys.queries.history() });
		},
	});

	return {
		history: query.data || [],
		isLoading: query.isLoading,
		addQueryRecord: addQueryRecord.mutate,
		deleteQueryRecord: deleteQueryRecord.mutate,
		isAdding: addQueryRecord.isPending,
		isDeleting: deleteQueryRecord.isPending,
	};
}
