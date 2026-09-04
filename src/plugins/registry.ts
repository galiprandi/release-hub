/**
 * Plugin Registry
 *
 * Registro central de plugins y API para comunicación desacoplada.
 * Los plugins usan pluginAPI.registerHealthEndpoint para registrar
 * endpoints de salud. El bridge (healthBridge.ts) los persiste en
 * localStorage y dispatcha un event que la health page escucha.
 */

import type { Plugin, PluginAPI, HealthEndpointRegistration } from './types'
import { registerHealthEndpoint } from './healthBridge'
import sekiPlugin from './seki'

/** Lista de plugins registrados. Cada plugin se importa desde su carpeta. */
export const plugins: Plugin[] = [
	sekiPlugin as Plugin,
]

/**
 * API que el sistema expone a los plugins.
 * registerHealthEndpoint es siempre funcional (escribe a localStorage
 * via el bridge). La health page escucha los cambios via custom event.
 */
export const pluginAPI: PluginAPI = {
	registerHealthEndpoint: (endpoint: HealthEndpointRegistration) => {
		registerHealthEndpoint(endpoint)
	},
}
