import { describe, it, expect } from 'vitest';
import { parseCurlCommand } from './curlParser';

describe('curlParser', () => {
  it('should parse a simple GET request', () => {
    const curl = "curl 'https://api.example.com/v1/users'";
    const parsed = parseCurlCommand(curl);

    expect(parsed.method).toBe('GET');
    expect(parsed.url).toBe('https://api.example.com/v1/users');
    expect(parsed.domain).toBe('api.example.com');
    expect(parsed.path).toBe('/v1/users');
  });

  it('should parse a POST request with -X and -d', () => {
    const curl = "curl -X POST 'https://api.example.com/v1/users' -d '{\"name\": \"John\"}'";
    const parsed = parseCurlCommand(curl);

    expect(parsed.method).toBe('POST');
    expect(parsed.body).toBe('{"name": "John"}');
  });

  it('should support compact flags like -XPOST and -d\'data\'', () => {
    const curl = "curl -XPOST 'https://api.example.com/v1/users' -d'{\"name\":\"John\"}'";
    const parsed = parseCurlCommand(curl);

    expect(parsed.method).toBe('POST');
    expect(parsed.body).toBe('{"name":"John"}');
  });

  it('should parse multiple headers with -H', () => {
    const curl = "curl 'https://api.example.com' -H 'Content-Type: application/json' -H 'Authorization: Bearer my-token'";
    const parsed = parseCurlCommand(curl);

    expect(parsed.headers['Content-Type']).toBe('application/json');
    expect(parsed.headers['Authorization']).toBe('Bearer my-token');
  });

  it('should support compact header flag -H\'Key: Value\'', () => {
    const curl = "curl 'https://api.example.com' -H'X-Custom: custom-value'";
    const parsed = parseCurlCommand(curl);

    expect(parsed.headers['X-Custom']).toBe('custom-value');
  });

  it('should handle line continuations', () => {
    const curl = `curl 'https://api.example.com' \\
      -H 'X-Header: value' \\
      -d 'data'`;
    const parsed = parseCurlCommand(curl);

    expect(parsed.url).toBe('https://api.example.com/');
    expect(parsed.headers['X-Header']).toBe('value');
    expect(parsed.body).toBe('data');
  });

  it('should parse query parameters correctly', () => {
    const curl = "curl 'https://api.example.com/search?q=typescript&limit=10'";
    const parsed = parseCurlCommand(curl);

    expect(parsed.queryParams.q).toBe('typescript');
    expect(parsed.queryParams.limit).toBe('10');
  });

  it('should handle escaped characters in quotes', () => {
    const curl = "curl -d '{\"message\": \"Don\\'t forget\"}' 'https://api.example.com'";
    const parsed = parseCurlCommand(curl);

    expect(parsed.body).toBe("{\"message\": \"Don't forget\"}");
  });

  it('should throw error if no URL is found', () => {
    const curl = "curl -X POST -H 'Content-Type: application/json'";
    expect(() => parseCurlCommand(curl)).toThrow('Could not extract URL from cURL command');
  });

  it('should not be confused by URLs inside headers or bodies', () => {
    const curl =
      "curl -X POST 'https://api.actual.com' -H 'Referer: https://api.fake.com' -d '{\"callback\": \"https://api.callback.com\"}'";
    const parsed = parseCurlCommand(curl);

    expect(parsed.url).toBe('https://api.actual.com/');
    expect(parsed.domain).toBe('api.actual.com');
  });

  it('should handle encoded brackets in Seki URLs', () => {
    const curl = "curl 'https://seki.com/api/v1/pods\\[0\\]'";
    const parsed = parseCurlCommand(curl);

    expect(parsed.url).toBe('https://seki.com/api/v1/pods%5B0%5D');
  });
});
