import { describe, it, expect } from 'vitest';
import { parseCurlCommand } from './curlParser';

describe('curlParser', () => {
  it('parses basic GET request', () => {
    const curl = "curl https://api.example.com/users";
    const parsed = parseCurlCommand(curl);
    expect(parsed.method).toBe('GET');
    expect(parsed.url).toBe('https://api.example.com/users');
  });

  it('parses POST request with headers and body', () => {
    const curl = "curl -X POST https://api.example.com/users -H 'Content-Type: application/json' -d '{\"name\": \"John\"}'";
    const parsed = parseCurlCommand(curl);
    expect(parsed.method).toBe('POST');
    expect(parsed.headers['Content-Type']).toBe('application/json');
    expect(parsed.body).toBe('{"name": "John"}');
  });

  it('handles malicious input in headers to prevent potential ReDoS or bypasses', () => {
    const maliciousHeader = "curl https://api.example.com -H '" + "A".repeat(1000) + ": value'";
    const parsed = parseCurlCommand(maliciousHeader);
    expect(parsed.headers["A".repeat(1000)]).toBe('value');
  });

  it('handles command substitution attempt in URL', () => {
    // Current parser extracts URL using regex.
    // It should not execute anything, but let's see what it extracts.
    const curl = "curl 'https://api.example.com/$(whoami)'";
    const parsed = parseCurlCommand(curl);
    // Note: parseCurlCommand currently replaces [ ] with %5B %5D and handles backslashes
    expect(parsed.url).toContain('$(whoami)');
  });

  it('handles escaped quotes in body', () => {
    const curl = `curl -X POST https://api.example.com -d '{"key": "value with \\'single quote\\'"}'`;
    const parsed = parseCurlCommand(curl);
    expect(parsed.body).toBe('{"key": "value with \\\'single quote\\\'"}');
  });

  it('fails on completely invalid input', () => {
    expect(() => parseCurlCommand('not a curl command')).toThrow();
  });
});
