/**
 * PluginSlot — Componente que renderiza plugins por slot + position.
 *
 * Itera el registry, filtra por slot/position, verifica disponibilidad
 * con React Query (cache 60s), y renderiza los habilitados.
 * Si un plugin no está disponible, loguea warning y retorna null.
 */

import { Fragment, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { plugins } from './registry'
import type { PluginSlot, PluginPosition, Plugin } from './types'

interface PluginSlotProps {
	slot: PluginSlot
	position: PluginPosition
	props: unknown
}

/** Hook interno: verifica disponibilidad de un plugin con cache */
function usePluginAvailability(plugin: Plugin) {
	return useQuery({
		queryKey: ['plugin-available', plugin.id],
		queryFn: () => plugin.isAvailable(),
		staleTime: 60_000,
		retry: false,
	})
}

/** Componente interno: renderiza un plugin si está disponible */
function PluginRenderer({ plugin, props }: { plugin: Plugin; props: unknown }) {
	const { data: available, isLoading } = usePluginAvailability(plugin)

	// Still checking availability — don't render yet, don't warn
	if (isLoading || available === undefined) return null

	if (available === false) {
		console.warn(`[Plugin] ${plugin.id} no disponible`)
		return null
	}

	return <Fragment key={plugin.id}>{plugin.render(props)}</Fragment>
}

export function PluginSlot({ slot, position, props }: PluginSlotProps): ReactNode {
	const filtered = plugins.filter(
		(p) => p.slot === slot && p.position === position,
	)

	if (filtered.length === 0) return null

	return (
		<>
			{filtered.map((plugin) => (
				<PluginRenderer key={plugin.id} plugin={plugin} props={props} />
			))}
		</>
	)
}
