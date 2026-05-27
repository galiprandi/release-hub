import { isTokenExpired, getExpirationDate } from '@/hooks/useToken';

export interface ParsedCurl {
	method: string;
	url: string;
	domain: string;
	path: string;
	headers: Record<string, string>;
	queryParams: Record<string, string>;
	body: string;
	isTokenExpired: boolean;
	tokenExpirationDate: string | null;
}

/**
 * Generates a hash ID based on method + domain + path (without query params)
 * Used to identify if a query already exists in history
 */
export function generateQueryHash(parsed: ParsedCurl): string {
	const key = `${parsed.method}:${parsed.domain}${parsed.path}`;
	// Simple hash function
	let hash = 0;
	for (let i = 0; i < key.length; i++) {
		const char = key.charCodeAt(i);
		hash = ((hash << 5) - hash) + char;
		hash = hash & hash; // Convert to 32bit integer
	}
	return Math.abs(hash).toString(36);
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

	// Extract URL - support both direct URL and --url flag
	// Handle URLs in quotes after curl command or --url flag
	const urlMatch = cleaned.match(/--url\s+['"]?([^'"\s]+)['"]?|curl\s+(?:-X\s+\w+\s+)?['"]?(https?:\/\/[^'"\s]+)['"]?/);
	if (!urlMatch) {
		throw new Error('Could not extract URL from cURL command');
	}
	let url = urlMatch[1] || urlMatch[2];

	// Remove backslash escapes from brackets
	url = url.replace(/\\\[/g, '[').replace(/\\\]/g, ']');

	// URL encode brackets to avoid curl interpretation issues
	url = url.replace(/\[/g, '%5B').replace(/\]/g, '%5D');

	// Extract body FIRST (before headers) to avoid conflicts with quotes in headers
	// Use a state machine to properly handle nested quotes
	let body = '';
	const dataMatch = cleaned.match(/(?:-d|--data|--data-raw|--data-binary)\s/i);
	if (dataMatch && dataMatch.index !== undefined) {
		const startIndex = dataMatch.index + dataMatch[0].length;
		const quoteChar = cleaned[startIndex];
		if (quoteChar === "'" || quoteChar === '"') {
			let inString = true;
			let escapeNext = false;
			let endIndex = startIndex + 1;
			
			for (let i = startIndex + 1; i < cleaned.length; i++) {
				const char = cleaned[i];
				
				if (escapeNext) {
					escapeNext = false;
					continue;
				}
				
				if (char === '\\') {
					escapeNext = true;
					continue;
				}
				
				if (char === quoteChar) {
					// Check if this quote is followed by a space or end of string
					// This means the string is closed (the next token is a flag, URL, or EOF)
					const nextChar = cleaned[i + 1];
					if (nextChar === undefined || nextChar === ' ' || nextChar === '\n' || nextChar === '\t') {
						endIndex = i;
						inString = false;
						break;
					}
				}
			}
			
			if (!inString) {
				body = cleaned.slice(startIndex + 1, endIndex);
			}
		}
	}

	// Extract headers AFTER body extraction
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

	// Check if Authorization header has an expired JWT token
	let tokenExpired = false;
	let tokenExpirationDate: string | null = null;
	const authHeaderKey = Object.keys(headers).find(key => key.toLowerCase() === 'authorization');
	if (authHeaderKey) {
		const authValue = headers[authHeaderKey];
		// Extract token from "Bearer <token>" or just the token
		const token = authValue.replace(/^Bearer\s+/i, '').trim();
		// Only check expiration if there's an actual token string
		if (token && token.length > 0) {
			tokenExpired = isTokenExpired(token);
			tokenExpirationDate = getExpirationDate(token);
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
		isTokenExpired: tokenExpired,
		tokenExpirationDate,
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
