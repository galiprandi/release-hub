export interface QueryRecord {
	id: string;
	curl: string;
	response?: {
		status: number;
		statusText: string;
		headers: Record<string, string>;
		body: string;
		responseTime: number;
	};
	createdAt?: string;
	updatedAt?: string;
}
