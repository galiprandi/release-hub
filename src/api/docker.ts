import { runCommand } from '@/api/exec';

export interface ContainerInfo {
	id: string;
	name: string;
	status: string;
	ports: string;
	image: string;
	created: string;
	runningFor?: string;
	restartCount?: number;
}

/**
 * Sanitizes Docker container IDs to prevent command injection.
 * Docker container IDs are 64-character hex strings (typically displayed as 12-char short IDs).
 */
function sanitizeContainerId(containerId: string): string {
	if (!containerId) {
		throw new Error('Container ID cannot be empty');
	}
	// Docker container IDs are hexadecimal (0-9, a-f)
	const safeIdRegex = /^[a-f0-9]+$/i;
	if (!safeIdRegex.test(containerId)) {
		throw new Error(`Invalid container ID format: ${containerId}`);
	}
	return containerId;
}

/**
 * Verifies that Docker is installed and accessible.
 */
export async function checkDockerInstalled(): Promise<boolean> {
	try {
		const result = await runCommand(['docker', '--version']);
		return result.stdout.includes('Docker version');
	} catch {
		return false;
	}
}

/**
 * Verifies that the user can execute Docker commands (has proper permissions).
 */
export async function checkDockerAccess(): Promise<boolean> {
	try {
		await runCommand(['docker', 'ps']);
		return true;
	} catch {
		return false;
	}
}

function parseContainers(output: string): ContainerInfo[] {
	if (!output || !output.trim()) {
		return [];
	}

	const lines = output.trim().split('\n');
	const containers: ContainerInfo[] = [];

	for (const line of lines) {
		const trimmedLine = line.trim();
		if (!trimmedLine) continue;

		try {
			const container = JSON.parse(trimmedLine) as {
				ID: string
				Image: string
				Status: string
				Ports: string
				CreatedAt: string
				Names: string
				RunningFor: string
				RestartCount?: number
			}

			containers.push({
				id: container.ID || 'unknown',
				image: container.Image || 'unknown',
				status: container.Status || 'unknown',
				ports: container.Ports || '',
				created: container.CreatedAt || '',
				name: container.Names || 'unnamed',
				runningFor: container.RunningFor || '',
				restartCount: container.RestartCount ?? 0,
			})
		} catch (e) {
			console.warn('[Docker] Failed to parse container line:', trimmedLine, e);
			continue;
		}
	}

	return containers;
}

/**
 * Lists all containers (running and stopped).
 */
export async function getContainers(): Promise<ContainerInfo[]> {
	try {
		const result = await runCommand(['docker', 'ps', '-a', '--format', 'json']);
		return parseContainers(result.stdout);
	} catch (error) {
		console.error('[Docker] Error getting containers:', error);
		return [];
	}
}

/**
 * Gets logs from a container (fallback for when SSE is not available).
 * @param since - Unix timestamp (seconds) to get logs only after this time (optional)
 */
export async function getContainerLogs(containerId: string, tail = 100, since?: number): Promise<string> {
	try {
		const sanitizedId = sanitizeContainerId(containerId);
		let args: string[] = ['docker', 'logs', `--tail=${tail}`, sanitizedId];
		if (since) {
			// Convert Unix timestamp to ISO format for Docker --since
			const sinceDate = new Date(since * 1000);
			args = ['docker', 'logs', `--since=${sinceDate.toISOString()}`, sanitizedId];
		}
		const result = await runCommand(args);
		// Some containers use stdout, others use stderr
		// Use stderr if it has content, otherwise use stdout
		const logs = (result.stderr || '').trim() || (result.stdout || '').trim();
		// Replace literal \n with actual newlines
		const cleanLogs = logs.replace(/\\n/g, '\n');
		return cleanLogs;
	} catch (error) {
		console.error(`[Docker] Error getting logs for container ${containerId}:`, error);
		return '';
	}
}

/**
 * Starts a stopped container.
 */
export async function startContainer(containerId: string): Promise<boolean> {
	try {
		const sanitizedId = sanitizeContainerId(containerId);
		await runCommand(['docker', 'start', sanitizedId]);
		return true;
	} catch (error) {
		console.error('[Docker] Error starting container:', error);
		return false;
	}
}

/**
 * Restarts a container.
 */
export async function restartContainer(containerId: string): Promise<boolean> {
	try {
		const sanitizedId = sanitizeContainerId(containerId);
		await runCommand(['docker', 'restart', sanitizedId]);
		return true;
	} catch (error) {
		console.error('[Docker] Error restarting container:', error);
		return false;
	}
}

/**
 * Stops a running container.
 */
export async function stopContainer(containerId: string): Promise<boolean> {
	try {
		const sanitizedId = sanitizeContainerId(containerId);
		await runCommand(['docker', 'stop', sanitizedId]);
		return true;
	} catch (error) {
		console.error('[Docker] Error stopping container:', error);
		return false;
	}
}
