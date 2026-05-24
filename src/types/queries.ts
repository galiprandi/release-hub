export interface QueryRecord {
	id: string;
	curl: string;
	createdAt: string;
	updatedAt: string;
	response?: {
		status: number;
		statusText: string;
		headers: Record<string, string>;
		body: string;
		responseTime: number;
	};
}
