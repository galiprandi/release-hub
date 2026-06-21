import { spawn } from 'node:child_process';

/**
 * Execute a command using spawn without a shell and with a mandatory timeout.
 * Mandatory 30s timeout to prevent resource exhaustion.
 */
export const spawnAsync = (
  args: string[],
  stdin?: string,
  timeoutMs = 30000,
): Promise<{
  stdout: string;
  stderr: string;
  success: boolean;
  error?: string;
}> => {
  return new Promise((resolve) => {
    const [cmd, ...cmdArgs] = args;
    const child = spawn(cmd, cmdArgs, { shell: false });

    let stdout = '';
    let stderr = '';

    const timeout = setTimeout(() => {
      child.kill();
      resolve({
        stdout,
        stderr,
        success: false,
        error: `Process timed out after ${timeoutMs}ms`,
      });
    }, timeoutMs);

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    if (stdin && child.stdin) {
      child.stdin.write(stdin);
      child.stdin.end();
    }

    child.on('close', (code) => {
      clearTimeout(timeout);
      resolve({ stdout, stderr, success: code === 0 });
    });

    child.on('error', (err) => {
      clearTimeout(timeout);
      resolve({ stdout, stderr, success: false, error: err.message });
    });
  });
};
