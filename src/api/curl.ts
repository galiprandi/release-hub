import { runCommand } from '@/api/exec';
import { quote } from '@/utils/shell';

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
 * @param args - Array of strings representing curl arguments
 * @returns The response from the curl command
 */
export async function executeCurlCommand(args: string[]): Promise<string> {
	try {
		// Quote each argument and join with spaces
		const quotedArgs = args.map(arg => quote(arg)).join(' ');
		// Add -i flag to include headers in the response
		const command = `curl -i ${quotedArgs}`;
		const result = await runCommand(command);
		return result.stdout;
	} catch (error) {
		console.error('[Curl] Error executing command:', error);
		throw error;
	}
}
