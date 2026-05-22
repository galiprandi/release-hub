import { describe, it, expect } from 'vitest';
import { parseCurlCommand, formatJSON, minifyJSON } from './curlParser';

describe('curlParser', () => {
	describe('parseCurlCommand', () => {
		it('should parse a simple GET request', () => {
			const curl = "curl 'https://api.example.com/users'";
			const parsed = parseCurlCommand(curl);
			expect(parsed.method).toBe('GET');
			expect(parsed.url).toBe('https://api.example.com/users');
			expect(parsed.domain).toBe('api.example.com');
			expect(parsed.path).toBe('/users');
		});

		it('should parse a POST request with headers and body', () => {
			const curl = `curl -X POST "https://api.example.com/users" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer my-token" \
  -d '{"name": "John Doe"}'`;
			const parsed = parseCurlCommand(curl);
			expect(parsed.method).toBe('POST');
			expect(parsed.headers['Content-Type']).toBe('application/json');
			expect(parsed.headers['Authorization']).toBe('Bearer my-token');
			expect(parsed.body).toBe('{"name": "John Doe"}');
		});

		it('should handle brackets in URL by encoding them', () => {
			const curl = "curl 'https://api.example.com/users[1]'";
			const parsed = parseCurlCommand(curl);
			expect(parsed.url).toBe('https://api.example.com/users%5B1%5D');
		});

		it('should throw error for invalid curl', () => {
			expect(() => parseCurlCommand('not a curl command')).toThrow();
		});
	});

	describe('formatJSON', () => {
		it('should format valid JSON', () => {
			const json = '{"a":1}';
			expect(formatJSON(json)).toBe('{\n  "a": 1\n}');
		});

		it('should return original text for invalid JSON', () => {
			const text = 'not json';
			expect(formatJSON(text)).toBe('not json');
		});
	});

	describe('minifyJSON', () => {
		it('should minify valid JSON', () => {
			const json = '{\n  "a": 1\n}';
			expect(minifyJSON(json)).toBe('{"a":1}');
		});

		it('should return original text for invalid JSON', () => {
			const text = 'not json';
			expect(minifyJSON(text)).toBe('not json');
		});
	});
});
