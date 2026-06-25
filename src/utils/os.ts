export type OSType = "macOS" | "Linux" | "Windows" | "unknown";

/**
 * Detects the operating system of the user based on the user agent.
 */
export function detectOS(): OSType {
	const userAgent = navigator.userAgent;
	if (userAgent.includes("Mac")) return "macOS";
	if (userAgent.includes("Linux")) return "Linux";
	if (userAgent.includes("Windows")) return "Windows";
	return "unknown";
}
