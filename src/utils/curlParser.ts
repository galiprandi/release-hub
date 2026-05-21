export interface ParsedCurl {
	method: string;
	url: string;
	domain: string;
	path: string;
	headers: Record<string, string>;
	queryParams: Record<string, string>;
	body: string;
}

/**
 * Parses a cURL command string and extracts its components
 */
export function parseCurlCommand(curlString: string): ParsedCurl {
	// Remove unnecessary backslash escapes from brackets in URL/query params FIRST
	// When inside single quotes, brackets don't need escaping
	let cleaned = curlString.replace(/\\\[/g, '[').replace(/\\\]/g, ']');

	// Then remove line continuations and extra whitespace
	cleaned = cleaned.replace(/\\\s*\n/g, ' ').replace(/\s+/g, ' ').trim();

	// Extract method (default to GET if not specified)
	let method = 'GET';
	const methodMatch = cleaned.match(/--request\s+(\w+)|-X\s+(\w+)/i);
	if (methodMatch) {
		method = (methodMatch[1] || methodMatch[2]).toUpperCase();
	}

	// Extract URL - capture everything from http/https until next quote or space
	const urlMatch = cleaned.match(/curl\s+(?:['"]?)(https?:\/\/[^'"\s]+)/);
	if (!urlMatch) {
		throw new Error('Could not extract URL from cURL command');
	}
	let url = urlMatch[1];

	// Remove backslash escapes from brackets
	url = url.replace(/\\\[/g, '[').replace(/\\\]/g, ']');

	// URL encode brackets to avoid curl interpretation issues
	url = url.replace(/\[/g, '%5B').replace(/\]/g, '%5D');

	// Extract headers
	const headers: Record<string, string> = {};
	const headerMatches = cleaned.matchAll(/-H\s+['"]?([^'"]+)['"]?|--header\s+['"]?([^'"]+)['"]?/gi);
	for (const match of headerMatches) {
		const headerValue = match[1] || match[2];
		const colonIndex = headerValue.indexOf(':');
		if (colonIndex > -1) {
			const key = headerValue.slice(0, colonIndex).trim();
			const value = headerValue.slice(colonIndex + 1).trim();
			headers[key] = value;
		}
	}

	// Extract body
	let body = '';
	const bodyMatches = cleaned.match(/-d\s+['"]?([^'"]+)['"]?|--data\s+['"]?([^'"]+)['"]?|--data-raw\s+['"]?([^'"]+)['"]?|--data-binary\s+['"]?([^'"]+)['"]?/gi);
	if (bodyMatches) {
		for (const match of bodyMatches) {
			body = match[1] || match[2] || match[3] || match[4] || '';
			if (body) break;
		}
	}

	// Parse URL to extract domain and path
	const urlObj = new URL(url);
	const domain = urlObj.hostname.replace(/^www\./, '');
	const path = urlObj.pathname;

	// Extract query parameters
	const queryParams: Record<string, string> = {};
	urlObj.searchParams.forEach((value, key) => {
		queryParams[key] = value;
	});

	return {
		method,
		url,
		domain,
		path,
		headers,
		queryParams,
		body,
	};
}

/**
 * Generates a unique ID for a query based on curl string
 */
export function generateQueryId(curl: string): string {
	// Simple hash function
	let hash = 0;
	for (let i = 0; i < curl.length; i++) {
		const char = curl.charCodeAt(i);
		hash = ((hash << 5) - hash) + char;
		hash = hash & hash; // Convert to 32bit integer
	}
	return `query-${Math.abs(hash).toString(16)}`;
}

/**
 * Helper to parse curl on-demand for display in table and modal
 * Returns null if parsing fails
 */
export function parseCurlForDisplay(curl: string): ParsedCurl | null {
	try {
		return parseCurlCommand(curl);
	} catch {
		return null;
	}
}

/**
 * Formats a string as JSON if it's valid JSON, otherwise returns the original string
 */
export function formatJSON(text: string): string {
	try {
		const parsed = JSON.parse(text);
		return JSON.stringify(parsed, null, 2);
	} catch {
		return text;
	}
}

/**
 * Minifies a string as JSON if it's valid JSON, otherwise returns the original string
 */
export function minifyJSON(text: string): string {
	try {
		const parsed = JSON.parse(text);
		return JSON.stringify(parsed);
	} catch {
		return text;
	}
}
