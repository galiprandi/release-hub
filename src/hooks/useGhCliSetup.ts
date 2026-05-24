import { useQuery } from "@tanstack/react-query";
import { runCommand } from "@/api/exec";

interface GhCliSetupStatus {
	isInstalled: boolean;
	isAuthenticated: boolean;
	version?: string;
	account?: string;
}

export function useGhCliSetup() {
	const { data: versionCheck, isLoading: checkingVersion } = useQuery({
		queryKey: ["gh-cli", "version"],
		queryFn: async () => {
			try {
				const result = await runCommand("gh --version");
				return result.stdout.trim();
			} catch {
				return null;
			}
		},
		retry: false,
	});

	const { data: authCheck, isLoading: checkingAuth } = useQuery({
		queryKey: ["gh-cli", "auth"],
		queryFn: async () => {
			try {
				const result = await runCommand("gh auth status");
				return result.stdout;
			} catch {
				return null;
			}
		},
		retry: false,
		enabled: !!versionCheck,
	});

	const isInstalled = !!versionCheck;
	const isAuthenticated = !!authCheck;

	// Extraer nombre de cuenta del output de gh auth status
	let account: string | undefined;
	if (authCheck) {
		const accountMatch = authCheck.match(/Logged in to github\.com account (\S+)/);
		account = accountMatch?.[1];
	}

	const status: GhCliSetupStatus = {
		isInstalled,
		isAuthenticated,
		version: versionCheck || undefined,
		account,
	};

	return {
		...status,
		isLoading: checkingVersion || checkingAuth,
	};
}
