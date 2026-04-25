/**
 * Unified Settings Hook
 * Manages global application settings with TanStack Query + localStorage persistence
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const SETTINGS_KEY = 'releasehub_settings'

export interface Settings {
	sekiToken: string | null
	discordWebhook: string | null
}

const DEFAULT_SETTINGS: Settings = {
	sekiToken: null,
	discordWebhook: null,
}

/**
 * Load settings from localStorage with migration from old keys
 */
function loadSettings(): Settings {
	try {
		const stored = localStorage.getItem(SETTINGS_KEY)
		if (stored) {
			return JSON.parse(stored) as Settings
		}

		// Migration: Try to migrate from old per-repo discord webhooks
		const oldDiscordKeys = Object.keys(localStorage).filter(key => key.startsWith('discord_webhook_'))
		if (oldDiscordKeys.length > 0) {
			const firstWebhook = localStorage.getItem(oldDiscordKeys[0])
			const migratedSettings: Settings = {
				...DEFAULT_SETTINGS,
				discordWebhook: firstWebhook || null,
			}
			localStorage.setItem(SETTINGS_KEY, JSON.stringify(migratedSettings))
			// Clean up old keys
			oldDiscordKeys.forEach(key => localStorage.removeItem(key))
			return migratedSettings
		}

		// Also migrate seki token if exists
		const oldSekiToken = localStorage.getItem('seki_api_token')
		if (oldSekiToken) {
			const migratedSettings: Settings = {
				...DEFAULT_SETTINGS,
				sekiToken: oldSekiToken,
			}
			localStorage.setItem(SETTINGS_KEY, JSON.stringify(migratedSettings))
			// Don't remove old key yet for backward compatibility
			return migratedSettings
		}

		return DEFAULT_SETTINGS
	} catch {
		return DEFAULT_SETTINGS
	}
}

/**
 * Save settings to localStorage
 */
function saveSettings(settings: Settings): void {
	try {
		localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
	} catch (error) {
		console.error('Failed to save settings:', error)
	}
}

/**
 * Hook to manage global settings with TanStack Query
 * Provides reactive state with automatic caching and persistence
 */
export function useSettings() {
	const queryClient = useQueryClient()

	// Query to load settings
	const query = useQuery({
		queryKey: ['settings'],
		queryFn: () => loadSettings(),
		staleTime: Infinity, // Settings don't go stale
		gcTime: Infinity, // Keep in cache forever
		initialData: DEFAULT_SETTINGS,
	})

	// Mutation to update settings
	const mutation = useMutation({
		mutationFn: (newSettings: Partial<Settings>) => {
			const current = query.data || DEFAULT_SETTINGS
			const updated = { ...current, ...newSettings }
			saveSettings(updated)
			return Promise.resolve(updated)
		},
		onSuccess: (updated) => {
			queryClient.setQueryData(['settings'], updated)
		},
	})

	const updateSettings = (newSettings: Partial<Settings>) => {
		mutation.mutate(newSettings)
	}

	const setSekiToken = (token: string | null) => {
		updateSettings({ sekiToken: token })
		// Also update legacy key for backward compatibility
		if (token) {
			localStorage.setItem('seki_api_token', token)
		} else {
			localStorage.removeItem('seki_api_token')
		}
	}

	const setDiscordWebhook = (webhook: string | null) => {
		updateSettings({ discordWebhook: webhook })
	}

	const clearAll = () => {
		updateSettings(DEFAULT_SETTINGS)
		localStorage.removeItem('seki_api_token')
	}

	return {
		settings: query.data || DEFAULT_SETTINGS,
		isLoading: query.isLoading,
		isError: query.isError,
		error: query.error,
		updateSettings,
		setSekiToken,
		setDiscordWebhook,
		clearAll,
		isUpdating: mutation.isPending,
	}
}
