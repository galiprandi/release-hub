# Testing Strategy: CLI-Based Adapters

In ReleaseHub, we rely heavily on CLI tools like `docker`, `kubectl`, and `gh`. To ensure the reliability of our adapters, we follow these testing principles.

## 1. Testing the Core Executor (`exec.ts`)

The `runCommand` utility itself must be tested by mocking the underlying `axios` instance (`apiExec`).

```typescript
import { vi } from 'vitest';
import { apiExec } from './exec';

// Inside test
const spy = vi.spyOn(apiExec, 'post').mockResolvedValue({
    data: { stdout: '...', stderr: '', success: true }
});
```

## 2. Mocks for `runCommand` in Adapters

All CLI-based adapters use the `runCommand` utility from `@/api/exec.ts`. We must mock this utility to avoid executing real commands during tests.

```typescript
import { vi } from 'vitest';
import { runCommand } from '@/api/exec';

vi.mock('@/api/exec', () => ({ runCommand: vi.fn() }));
```

## 2. Testing Sequential Outputs

For complex flows requiring multiple CLI calls, use `mockResolvedValueOnce` sequentially.

```typescript
vi.mocked(runCommand)
  .mockResolvedValueOnce({ stdout: 'first-output', stderr: '', success: true })
  .mockResolvedValueOnce({ stdout: 'second-output', stderr: '', success: true });
```

## 3. Resilience and Sanitization

- **Sanitization**: Always test that input sanitizers correctly reject malicious or malformed input (e.g., command injection attempts).
- **Graceful Failure**: Ensure the adapter handles command failures (rejected promises) by logging the error and returning safe defaults (empty arrays, null, or false).
- **Parsing Robustness**: CLI output can change. Use `--format json` whenever possible and test that parsers handle missing fields or malformed lines without crashing the entire flow.

## 4. Coverage Targets

We target **100% statement coverage** for all API adapters. This includes testing:
- Successful execution.
- Command execution failures.
- Sanitization edge cases.
- Malformed/Unexpected output parsing.
