export interface QueryRecord {
	id: string;
	method: string;
	url: string;
	domain: string;
	path: string;
	headers: Record<string, string>;
	queryParams: Record<string, string>;
	body: string;
	lastSent: string;
}
