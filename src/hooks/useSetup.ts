import { useQueries } from "@tanstack/react-query";
import { runCommand } from "@/api/exec";
import { applyCachePolicy } from "@/lib/queryKeys";

export type OSType = "macOS" | "Linux" | "Windows" | "unknown";

export interface CommandDef {
	name: string;
	command: string;
	description?: string;
	setupInfo?: {
		osCommands: Array<{
			os: OSType;
			cmd: string;
			label?: string;
		}>;
	};
}

export interface CommandResult {
	name: string;
	isInstalled: boolean;
	version?: string;
	isRequired: boolean;
	description?: string;
}

interface UseSetupOptions {
	required: CommandDef[];
	optional?: CommandDef[];
}

export function useSetup({ required, optional = [] }: UseSetupOptions) {
	const allCommands = [...required, ...optional];

	const commandChecks = useQueries({
		queries: allCommands.map((cmdDef) => ({
			queryKey: ["tools", cmdDef.name, "version"],
			queryFn: async () => {
				try {
					const result = await runCommand([cmdDef.command, '--version']);
					return result.stdout.trim();
				} catch {
					return null;
				}
			},
			retry: false,
			...applyCachePolicy("tools"),
		})),
	});

	const results: CommandResult[] = allCommands.map((cmdDef, index) => {
		const versionCheck = commandChecks[index].data;

		return {
			name: cmdDef.name,
			isInstalled: !!versionCheck,
			version: versionCheck || undefined,
			isRequired: required.some((r) => r.name === cmdDef.name),
			description: cmdDef.description,
		};
	});

	const allRequiredInstalled = required.every((cmdDef) => {
		const result = results.find((r) => r.name === cmdDef.name);
		return result?.isInstalled;
	});

	const isLoading = commandChecks.some((check) => check.isLoading);
	const hasOptionalMissing = optional.some((cmdDef) => {
		const result = results.find((r) => r.name === cmdDef.name);
		return !result?.isInstalled;
	});

	return {
		results,
		allRequiredInstalled,
		isLoading,
		hasOptionalMissing,
	};
}
