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
 * Strictly enforces array-based arguments for security.
 * @param args - The curl command arguments as an array of strings
 * @returns The response from the curl command
 */
export async function executeCurlCommand(args: string[]): Promise<string> {
	try {
		const command = ['curl', '-i', ...args];
		const result = await runCommand(command);
		return result.stdout;
	} catch (error) {
		console.error('[Curl] Error executing command:', error);
		throw error;
	}
}
