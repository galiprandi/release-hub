import { parseCurlCommand } from './curlParser';
import { decodeJWT } from '@/hooks/useToken';

export type DiffMode = 'json' | 'jwt' | 'curl' | 'text';

/**
 * Detects the content type from a string.
 * Priority: JWT > cURL > JSON > text
 */
export function detectContentType(text: string): DiffMode {
	if (!text || text.trim().length === 0) return 'text';

	const trimmed = text.trim();

	// Check for JWT (3 parts separated by dots, base64-like)
	const jwtParts = trimmed.split('.');
	if (jwtParts.length === 3) {
		try {
			// Try to decode the header to verify it's a valid JWT
			const header = JSON.parse(atob(jwtParts[0].replace(/-/g, '+').replace(/_/g, '/')));
			if (header && (header.alg || header.typ)) {
				return 'jwt';
			}
		} catch {
			// Not a valid JWT, continue checking
		}
	}

	// Check for cURL command
	if (trimmed.toLowerCase().startsWith('curl ')) {
		return 'curl';
	}

	// Check for JSON
	if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
		try {
			JSON.parse(trimmed);
			return 'json';
		} catch {
			// Not valid JSON, fallback to text
		}
	}

	// Default to text
	return 'text';
}

export interface DiffResult {
	type: 'added' | 'removed' | 'changed' | 'equal';
	value: string;
	lineNumber?: number;
}

export interface DiffLine {
	left?: DiffResult;
	right?: DiffResult;
}

/**
 * Normalizes a JSON string by parsing it and sorting all keys recursively.
 */
export function normalizeJson(jsonStr: string): string {
	if (!jsonStr) return '';
	try {
		const parsed = JSON.parse(jsonStr);
		const sorted = sortObjectKeys(parsed);
		return JSON.stringify(sorted, null, 2);
	} catch {
		return jsonStr;
	}
}

function sortObjectKeys(obj: unknown): unknown {
	if (obj === null || typeof obj !== 'object') {
		return obj;
	}

	if (Array.isArray(obj)) {
		return obj.map(sortObjectKeys);
	}

	const object = obj as Record<string, unknown>;
	const sortedKeys = Object.keys(object).sort();
	const result: Record<string, unknown> = {};
	for (const key of sortedKeys) {
		result[key] = sortObjectKeys(object[key]);
	}
	return result;
}

/**
 * Formats a timestamp as a human-readable expiration message.
 */
export function formatExpiration(exp: number): string {
	const now = Math.floor(Date.now() / 1000);
	const diff = exp - now;

	if (diff <= 0) {
		return 'Expirado';
	}

	const hours = Math.floor(diff / 3600);
	const minutes = Math.floor((diff % 3600) / 60);

	if (hours > 24) {
		const days = Math.floor(hours / 24);
		const remainingHours = hours % 24;
		return `Expira en ${days}d ${remainingHours}h`;
	}

	if (hours > 0) {
		return `Expira en ${hours}h ${minutes}m`;
	}

	return `Expira en ${minutes}m`;
}

/**
 * Decodes a JWT and returns a normalized JSON string of its parts.
 */
export function decodeAndNormalizeJwt(token: string): string {
	if (!token) return '';
	try {
		const parts = token.split('.');
		if (parts.length < 2) return token;

		const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
		const payload = decodeJWT(token);

		return JSON.stringify({
			header: sortObjectKeys(header),
			payload: sortObjectKeys(payload || {})
		}, null, 2);
	} catch {
		return token;
	}
}

/**
 * Normalizes a cURL command for comparison.
 */
export function normalizeCurl(curlStr: string): string {
	if (!curlStr) return '';
	try {
		const parsed = parseCurlCommand(curlStr);
		return JSON.stringify({
			method: parsed.method,
			url: parsed.url,
			domain: parsed.domain,
			path: parsed.path,
			queryParams: sortObjectKeys(parsed.queryParams),
			headers: sortObjectKeys(parsed.headers),
			body: parsed.body ? normalizeJson(parsed.body) : ''
		}, null, 2);
	} catch {
		return curlStr;
	}
}

/**
 * Computes the Longest Common Subsequence (LCS) matrix.
 */
function getLcsMatrix(linesA: string[], linesB: string[]): number[][] {
	const n = linesA.length;
	const m = linesB.length;
	const matrix: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

	for (let i = 1; i <= n; i++) {
		for (let j = 1; j <= m; j++) {
			if (linesA[i - 1] === linesB[j - 1]) {
				matrix[i][j] = matrix[i - 1][j - 1] + 1;
			} else {
				matrix[i][j] = Math.max(matrix[i - 1][j], matrix[i][j - 1]);
			}
		}
	}
	return matrix;
}

/**
 * Computes a line-by-line diff using the LCS algorithm.
 */
export function computeDiff(textA: string, textB: string): DiffLine[] {
	if (!textA && !textB) return [];

	const linesA = textA.split('\n');
	const linesB = textB.split('\n');
	const matrix = getLcsMatrix(linesA, linesB);
	const diff: DiffLine[] = [];

	let i = linesA.length;
	let j = linesB.length;

	while (i > 0 || j > 0) {
		if (i > 0 && j > 0 && linesA[i - 1] === linesB[j - 1]) {
			diff.unshift({
				left: { type: 'equal', value: linesA[i - 1], lineNumber: i },
				right: { type: 'equal', value: linesB[j - 1], lineNumber: j }
			});
			i--;
			j--;
		} else if (j > 0 && (i === 0 || matrix[i][j - 1] >= matrix[i - 1][j])) {
			diff.unshift({
				right: { type: 'added', value: linesB[j - 1], lineNumber: j }
			});
			j--;
		} else if (i > 0 && (j === 0 || matrix[i][j - 1] < matrix[i - 1][j])) {
			diff.unshift({
				left: { type: 'removed', value: linesA[i - 1], lineNumber: i }
			});
			i--;
		}
	}

	// Post-process to detect 'changed' lines (when a removal is followed by an addition at the same logical position)
	// For simplicity in this UI, we could keep them as separate rows or combine them.
	// The user requested "rojo para eliminados/modificados en origen, verde para adiciones en destino".
	// Our current rendering already handles this well by showing them side-by-side where possible.

	return diff;
}
