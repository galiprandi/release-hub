import { useMutation } from "@tanstack/react-query";
import { runCommand } from "@/api/exec";

interface UseSekiTokenRefreshOptions {
	onSuccess?: (token: string) => void;
	onError?: (error: string) => void;
}

/**
 * Hook to refresh the Seki token by running `seki auth get --token-only`.
 * Executes the Seki CLI locally via the hardened /local/exec endpoint
 * and returns the raw JWT token from stdout.
 */
export function useSekiTokenRefresh({
	onSuccess,
	onError,
}: UseSekiTokenRefreshOptions = {}) {
	const mutation = useMutation({
		mutationFn: async (): Promise<string> => {
			const result = await runCommand([
				"seki",
				"auth",
				"get",
				"--token-only",
			]);
			const token = result.stdout.trim();
			if (!token) {
				throw new Error(
					"El comando seki auth get --token-only no devolvió un token",
				);
			}
			// Basic JWT format validation (3 dot-separated parts)
			const parts = token.split(".");
			if (parts.length !== 3) {
				throw new Error("El token devuelto no tiene formato JWT válido");
			}
			return token;
		},
		onSuccess: (token) => {
			onSuccess?.(token);
		},
		onError: (error) => {
			const message =
				error instanceof Error ? error.message : "Error al obtener el token";
			onError?.(message);
		},
	});

	return {
		refreshToken: mutation.mutate,
		isRefreshing: mutation.isPending,
		isError: mutation.isError,
		error: mutation.error instanceof Error ? mutation.error.message : null,
		isSuccess: mutation.isSuccess,
		reset: mutation.reset,
	};
}
