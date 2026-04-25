/**
 * Hook to manage Discord webhook URL for notifications
 * Now uses global settings instead of per-repository storage
 * The repo parameter is kept for backward compatibility but is not used
 */
export function useDiscordChannel(_repo?: string) {
	const getWebhook = () => {
		// Try global settings first
		try {
			const settings = localStorage.getItem('releasehub_settings')
			if (settings) {
				const parsed = JSON.parse(settings)
				if (parsed.discordWebhook) {
					return parsed.discordWebhook
				}
			}
		} catch {
			// Fallback to old per-repo key if settings fail
		}

		// Fallback to old per-repo key for backward compatibility
		if (_repo) {
			const oldKey = `discord_webhook_${_repo}`
			return localStorage.getItem(oldKey) || ""
		}

		return ""
	}

	const saveWebhook = (webhookUrl: string) => {
		// Save to global settings
		try {
			const settings = localStorage.getItem('releasehub_settings')
			const parsed = settings ? JSON.parse(settings) : { sekiToken: null, discordWebhook: null }
			parsed.discordWebhook = webhookUrl
			localStorage.setItem('releasehub_settings', JSON.stringify(parsed))
		} catch (error) {
			console.error('Failed to save webhook to settings:', error)
		}
	}

	return {
		webhookUrl: getWebhook(),
		saveWebhook,
	}
}
