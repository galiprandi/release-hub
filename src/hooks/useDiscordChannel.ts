/**
 * Hook to manage Discord webhook URL for freeze notifications
 * Persists webhook URL in localStorage per repository
 */
export function useDiscordChannel(repo: string) {
	const STORAGE_KEY = `discord_webhook_${repo}`

	const getWebhook = () => {
		return localStorage.getItem(STORAGE_KEY) || ""
	}

	const saveWebhook = (webhookUrl: string) => {
		localStorage.setItem(STORAGE_KEY, webhookUrl)
	}

	return {
		webhookUrl: getWebhook(),
		saveWebhook,
	}
}
