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
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Robustly tokenizes a shell command while respecting quotes and escapes.
 */
function tokenize(command: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inQuote: string | null = null;
  let escaped = false;

  for (let i = 0; i < command.length; i++) {
    const char = command[i];

    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (inQuote) {
      if (char === inQuote) {
        inQuote = null;
      } else {
        current += char;
      }
    } else if (char === "'" || char === '"') {
      inQuote = char;
    } else if (char === ' ') {
      if (current) {
        tokens.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }
  if (current) tokens.push(current);
  return tokens;
}

/**
 * Parses a cURL command string and extracts its components
 */
export function parseCurlCommand(curlString: string): ParsedCurl {
  // Normalize line continuations
  const normalized = curlString.replace(/\\\s*\n/g, ' ').trim();
  const tokens = tokenize(normalized);

  let method = 'GET';
  let url = '';
  const headers: Record<string, string> = {};
  let body = '';

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // Method
    if (token === '-X' || token === '--request') {
      if (tokens[i + 1]) {
        method = tokens[i + 1].toUpperCase();
        i++;
      }
    } else if (token.startsWith('-X')) {
      method = token.slice(2).toUpperCase();
    }

    // Headers
    else if (token === '-H' || token === '--header') {
      if (tokens[i + 1]) {
        const headerValue = tokens[i + 1];
        const colonIndex = headerValue.indexOf(':');
        if (colonIndex > -1) {
          const key = headerValue.slice(0, colonIndex).trim();
          const val = headerValue.slice(colonIndex + 1).trim();
          headers[key] = val;
        }
        i++;
      }
    } else if (token.startsWith('-H')) {
      const headerValue = token.slice(2);
      const colonIndex = headerValue.indexOf(':');
      if (colonIndex > -1) {
        const key = headerValue.slice(0, colonIndex).trim();
        const val = headerValue.slice(colonIndex + 1).trim();
        headers[key] = val;
      }
    }

    // Body
    else if (
      token === '-d' ||
      token === '--data' ||
      token === '--data-raw' ||
      token === '--data-binary'
    ) {
      if (tokens[i + 1]) {
        body = tokens[i + 1];
        i++;
      }
    } else if (token.startsWith('-d')) {
      body = token.slice(2);
    }

    // URL
    else if (token === '--url') {
      if (tokens[i + 1]) {
        url = tokens[i + 1];
        i++;
      }
    } else if (
      (token.startsWith('http://') || token.startsWith('https://')) &&
      !url
    ) {
      url = token;
    }
  }

  if (!url) {
    throw new Error('Could not extract URL from cURL command');
  }

  // Normalize URL (unescape brackets which are common in seki urls but interpreted by curl)
  url = url.replace(/\\\[/g, '[').replace(/\\\]/g, ']');
  url = url.replace(/\[/g, '%5B').replace(/\]/g, '%5D');

  // Parse URL to extract domain and path
  const urlObj = new URL(url);
  const normalizedUrl = urlObj.toString();
  const domain = urlObj.hostname.replace(/^www\./, '');
  const path = urlObj.pathname;

  // Check if Authorization header has an expired JWT token
  let tokenExpired = false;
  let tokenExpirationDate: string | null = null;
  const authHeaderKey = Object.keys(headers).find(
    (key) => key.toLowerCase() === 'authorization',
  );
  if (authHeaderKey) {
    const authValue = headers[authHeaderKey];
    const token = authValue.replace(/^Bearer\s+/i, '').trim();
    if (token && token.length > 0) {
      tokenExpired = isTokenExpired(token);
      tokenExpirationDate = getExpirationDate(token);
    }
  }

  const queryParams: Record<string, string> = {};
  urlObj.searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });

  return {
    method,
    url: normalizedUrl,
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
  let hash = 0;
  for (let i = 0; i < curl.length; i++) {
    const char = curl.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `query-${Math.abs(hash).toString(16)}`;
}

export function parseCurlForDisplay(curl: string): ParsedCurl | null {
  try {
    return parseCurlCommand(curl);
  } catch {
    return null;
  }
}

export function formatJSON(text: string): string {
  try {
    const parsed = JSON.parse(text);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return text;
  }
}

export function minifyJSON(text: string): string {
  try {
    const parsed = JSON.parse(text);
    return JSON.stringify(parsed);
  } catch {
    return text;
  }
}
