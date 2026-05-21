import { runCommand } from '@/api/exec';

/**
 * Verifies that curl is installed and accessible.
 */
export async function checkCurlInstalled(): Promise<boolean> {
	try {
		const result = await runCommand('curl --version');
		return result.stdout.includes('curl');
	} catch {
		return false;
	}
}

/**
 * Executes a curl command with the provided arguments.
 * @param args - The curl command arguments (e.g., '-X POST https://api.example.com -H "Content-Type: application/json"')
 * @returns The response from the curl command
 */
export async function executeCurlCommand(args: string): Promise<string> {
	try {
		// Add -i flag to include headers in the response
		const command = `curl -i ${args}`;
		const result = await runCommand(command);
		return result.stdout;
	} catch (error) {
		console.error('[Curl] Error executing command:', error);
		throw error;
	}
}
