import { useQuery } from "@tanstack/react-query";
import { runCommand } from "@/api/exec";

interface JqSetupStatus {
	isInstalled: boolean;
	version?: string;
}

export function useJqSetup() {
	const { data: versionCheck, isLoading } = useQuery({
		queryKey: ["jq", "version"],
		queryFn: async () => {
			try {
				const result = await runCommand(['jq', '--version']);
				return result.stdout.trim();
			} catch {
				return null;
			}
		},
		retry: false,
	});

	const isInstalled = !!versionCheck;

	const status: JqSetupStatus = {
		isInstalled,
		version: versionCheck || undefined,
	};

	return {
		...status,
		isLoading,
	};
}
