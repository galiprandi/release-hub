import { describe, it, expect } from 'vitest';
import { normalizeJson, computeDiff } from './diffEngine';

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

	describe('computeDiff', () => {
		it('should identify equal lines', () => {
			const diff = computeDiff('line1\nline2', 'line1\nline2');
			expect(diff[0].left?.type).toBe('equal');
			expect(diff[1].left?.type).toBe('equal');
		});

		it('should identify changed lines (as removal and addition)', () => {
			const diff = computeDiff('line1', 'line2');
			expect(diff[0].left?.type).toBe('removed');
			expect(diff[1].right?.type).toBe('added');
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
