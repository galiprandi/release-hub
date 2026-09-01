import { describe, it, expect } from 'vitest';
import { normalizeJson, computeDiff, detectContentType } from './diffEngine';

describe('diffEngine', () => {
	describe('normalizeJson', () => {
		it('should sort keys recursively', () => {
			const input = JSON.stringify({ z: 1, a: { c: 3, b: 2 } });
			const output = normalizeJson(input);
			expect(output).toBe(JSON.stringify({ a: { b: 2, c: 3 }, z: 1 }, null, 2));
		});

		it('should handle arrays', () => {
			const input = JSON.stringify([{ b: 2, a: 1 }]);
			const output = normalizeJson(input);
			expect(output).toBe(JSON.stringify([{ a: 1, b: 2 }], null, 2));
		});
	});

	describe('detectContentType', () => {
		it('should detect JSON', () => {
			expect(detectContentType('{"a": 1}')).toBe('json');
			expect(detectContentType('[1, 2, 3]')).toBe('json');
		});

		it('should detect cURL', () => {
			expect(detectContentType('curl -X GET http://example.com')).toBe('curl');
		});

		it('should detect JWT', () => {
			// Mock JWT (header.payload.signature)
			const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
			const payload = btoa(JSON.stringify({ sub: '1234567890', name: 'John Doe', iat: 1516239022 }));
			const signature = 'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
			expect(detectContentType(`${header}.${payload}.${signature}`)).toBe('jwt');
		});

		it('should detect JavaScript', () => {
			expect(detectContentType('import React from "react"')).toBe('javascript');
			expect(detectContentType('const a = 1;')).toBe('javascript');
			expect(detectContentType('function test() {}')).toBe('javascript');
		});

		it('should detect HTML', () => {
			expect(detectContentType('<div>Hello</div>')).toBe('html');
		});

		it('should detect CSS', () => {
			expect(detectContentType('.test { color: red; }')).toBe('css');
		});

		it('should detect Python', () => {
			expect(detectContentType('def my_func():\n    print("hello")')).toBe('python');
		});

		it('should default to text', () => {
			expect(detectContentType('just some random text')).toBe('text');
		});
	});

	describe('computeDiff', () => {
		it('should identify equal lines', () => {
			const diff = computeDiff('line1\nline2', 'line1\nline2');
			expect(diff[0].left?.type).toBe('equal');
			expect(diff[1].left?.type).toBe('equal');
		});

		it('should pair changed lines on the same row', () => {
			const diff = computeDiff('line1', 'line2');
			expect(diff).toHaveLength(1);
			expect(diff[0].left?.type).toBe('removed');
			expect(diff[0].left?.value).toBe('line1');
			expect(diff[0].right?.type).toBe('added');
			expect(diff[0].right?.value).toBe('line2');
		});

		it('should identify additions', () => {
			const diff = computeDiff('line1', 'line1\nline2');
			expect(diff[0].left?.type).toBe('equal');
			expect(diff[1].right?.type).toBe('added');
			expect(diff[1].left).toBeUndefined();
		});

		it('should identify removals', () => {
			const diff = computeDiff('line1\nline2', 'line1');
			expect(diff[0].left?.type).toBe('equal');
			expect(diff[1].left?.type).toBe('removed');
			expect(diff[1].right).toBeUndefined();
		});
	});
});
