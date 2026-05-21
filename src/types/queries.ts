export interface QueryRecord {
	id: string;
	curl: string;
	lastSent: string;
	lastResponse?: {
		status: number;
		statusText: string;
		headers: Record<string, string>;
		body: string;
		responseTime: number;
	};
}
