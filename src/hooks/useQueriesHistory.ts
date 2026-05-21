import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys, applyCachePolicy } from "@/lib/queryKeys";
import type { QueryRecord } from "@/types/queries";
import { generateQueryId } from "@/utils/curlParser";

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
		mutationFn: async (record: Omit<QueryRecord, 'id' | 'lastSent'>): Promise<QueryRecord> => {
			const currentHistory = loadHistoryFromStorage();
			const existingIndex = currentHistory.findIndex((q) => q.curl === record.curl);

			const newRecord: QueryRecord = {
				...record,
				id: generateQueryId(record.curl),
				lastSent: new Date().toISOString(),
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
		onSuccess: () => {
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
		onSuccess: () => {
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
