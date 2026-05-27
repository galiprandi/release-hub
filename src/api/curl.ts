import { runCommand } from '@/api/exec';

/**
 * Verifies that curl is installed and accessible.
 */
export async function checkCurlInstalled(): Promise<boolean> {
	try {
		const result = await runCommand(['curl', '--version']);
		return result.stdout.includes('curl');
	} catch {
		return false;
	}
}

/**
 * Executes a curl command with the provided arguments.
 * @param args - The curl command arguments (string or array of strings)
 * @returns The response from the curl command
 */
export async function executeCurlCommand(args: string | string[]): Promise<string> {
	try {
		// If args is a string, we still use it as is for backward compatibility
		// but we recommend using string[] for security
		let command: string | string[];

		if (Array.isArray(args)) {
			command = ['curl', '-i', ...args];
		} else {
			command = `curl -i ${args}`;
		}

		const result = await runCommand(command);
		return result.stdout;
	} catch (error) {
		console.error('[Curl] Error executing command:', error);
		throw error;
	}
}
