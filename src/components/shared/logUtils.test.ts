import { describe, it, expect } from 'vitest';
import { stripAnsiCodes, highlightLogLine, groupLogs } from './logUtils';
import { render } from '@testing-library/react';

describe('logUtils', () => {
	describe('stripAnsiCodes', () => {
		it('should remove ANSI escape codes from text', () => {
			const esc = String.fromCharCode(0x1b);
			const input = `${esc}[31mRed text${esc}[0m`;
			expect(stripAnsiCodes(input)).toBe('Red text');
		});

		it('should return the same text if no ANSI codes are present', () => {
			const input = 'Normal text';
			expect(stripAnsiCodes(input)).toBe('Normal text');
		});
	});

	describe('highlightLogLine', () => {
		it('should return null/undefined if line is empty', () => {
			expect(highlightLogLine('')).toBe('');
		});

		it('should highlight timestamps at the beginning of the line', () => {
			const line = '2024-04-30 10:00:00 This is a log';
			const { container } = render(highlightLogLine(line) as React.ReactElement);
			expect(container.querySelector('.text-blue-400')).toBeTruthy();
			expect(container.querySelector('.text-blue-400')?.textContent).toBe('2024-04-30 10:00:00');
		});

		it('should highlight log levels with appropriate colors', () => {
			const levels = [
				{ level: 'ERROR', color: 'text-red-400' },
				{ level: 'ERR', color: 'text-red-400' },
				{ level: 'FATAL', color: 'text-red-400' },
				{ level: 'WARN', color: 'text-yellow-400' },
				{ level: 'WARNING', color: 'text-yellow-400' },
				{ level: 'INFO', color: 'text-green-400' },
				{ level: 'DEBUG', color: 'text-purple-400' },
				{ level: 'TRACE', color: 'text-purple-400' },
			];

			levels.forEach(({ level, color }) => {
				const line = `[${level}] Some message`;
				const { container } = render(highlightLogLine(line) as React.ReactElement);
				const span = container.querySelector(`.${color.split(' ')[0]}`);
				expect(span).toBeTruthy();
				expect(span?.textContent).toBe(level);
			});
		});

		it('should highlight filter terms', () => {
			const line = 'Search for this term';
			const filter = 'term';
			const { container } = render(highlightLogLine(line, filter) as React.ReactElement);
			const mark = container.querySelector('mark');
			expect(mark).toBeTruthy();
			expect(mark?.textContent).toBe('term');
		});

		it('should strip ANSI codes before highlighting', () => {
			const esc = String.fromCharCode(0x1b);
			const line = `${esc}[31m2024-04-30 10:00:00 ERROR Message${esc}[0m`;
			const { container } = render(highlightLogLine(line) as React.ReactElement);

			expect(container.textContent).not.toContain(esc);
			expect(container.querySelector('.text-blue-400')).toBeTruthy();
			expect(container.querySelector('.text-red-400')).toBeTruthy();
		});

		it('should handle regex special characters in filter', () => {
			const line = 'Error with [status] 500';
			const filter = '[status]';
			const { container } = render(highlightLogLine(line, filter) as React.ReactElement);
			const mark = container.querySelector('mark');
			expect(mark).toBeTruthy();
			expect(mark?.textContent).toBe('[status]');
		});
	});

	describe('groupLogs', () => {
		it('should group multi-line logs correctly', () => {
			const logText = '2024-04-30 Line 1\n  Subline 1\n  Subline 2\n2024-04-30 Line 2';
			const groups = groupLogs(logText);
			expect(groups).toHaveLength(2);
			expect(groups[0]).toBe('2024-04-30 Line 1\n  Subline 1\n  Subline 2');
			expect(groups[1]).toBe('2024-04-30 Line 2');
		});

		it('should detect new logs by various patterns', () => {
			const logText = [
				'2024-04-30 ISO date',
				'{"level":"info"} JSON',
				'[Nest] Nest log',
				'info: Kafka log',
				'not a start line'
			].join('\n');

			const groups = groupLogs(logText);
			// "not a start line" should be part of "info: Kafka log"
			expect(groups).toHaveLength(4);
			expect(groups[3]).toBe('info: Kafka log\nnot a start line');
		});

		it('should handle empty input', () => {
			expect(groupLogs('')).toEqual([]);
		});

		it('should handle logs starting with ANSI codes', () => {
			const esc = String.fromCharCode(0x1b);
			const logText = `${esc}[31m2024-04-30 Log with ANSI${esc}[0m\nContinue`;
			const groups = groupLogs(logText);
			expect(groups).toHaveLength(1);
			expect(groups[0]).toContain('2024-04-30');
		});

        it('should detect JSON start with {', () => {
            const logText = '{\n"message": "test"\n}';
            const groups = groupLogs(logText);
            expect(groups).toHaveLength(1);
        });

        it('should detect various bracket patterns', () => {
             const patterns = [
                '[Nest]', '[RedisBaseModel]', '[Handler]', '[OnUserUpdated]',
                '[FCMBase]', '[PushNotificationStrategy]', '[PushNotificationClient]', '[Notifier]'
            ];
            const logText = patterns.join('\n');
            const groups = groupLogs(logText);
            expect(groups).toHaveLength(patterns.length);
        });

        it('should detect kafka-client levels', () => {
            const levels = ['info:', 'silly:', 'error:', 'warn:'];
            const logText = levels.join('\n');
            const groups = groupLogs(logText);
            expect(groups).toHaveLength(levels.length);
        });
	});
});
