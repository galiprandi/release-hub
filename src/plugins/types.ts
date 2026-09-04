/**
 * Plugin System Types
 *
 * Cada plugin es autocontenido: maneja su propio ciclo de vida,
 * detección de disponibilidad, y render. El resto de la app no
 * sabe qué plugins existen ni cuáles están cargados.
 */

import type { ReactNode } from 'react'

/** Módulo/vista donde se monta el plugin */
export type PluginSlot = 'repo' | 'dashboard'

/** Posición dentro del módulo: header (arriba) o footer (abajo) */
export type PluginPosition = 'header' | 'footer'

/** Endpoint de salud que un plugin puede registrar para que el módulo /health testee */
export interface HealthEndpointRegistration {
	product: string
	service: string
	url: string
	environment: 'staging' | 'production'
}

/**
 * API que el sistema expone a los plugins.
 * Permite comunicación desacoplada entre plugins y módulos core.
 */
export interface PluginAPI {
	/**
	 * Registra un endpoint de salud para que el módulo /health lo testee.
	 * Si /health no está montado, es no-op (silencioso).
	 */
	registerHealthEndpoint: (endpoint: HealthEndpointRegistration) => void
}

/**
 * Interfaz que todo plugin debe implementar.
 * Cada plugin es una carpeta bajo src/plugins/<id>/ con un index.tsx
 * que exporta default un objeto que satisface esta interfaz.
 */
export interface Plugin<TProps = unknown> {
	/** Identificador único del plugin (ej: "seki", "pulsar") */
	id: string
	/** Módulo/vista donde se monta */
	slot: PluginSlot
	/** Posición dentro del módulo */
	position: PluginPosition
	/**
	 * Verifica si el plugin puede ejecutarse (token válido, CLI disponible, etc).
	 * Se cachea con React Query para no ejecutarse en cada render.
	 * Si retorna false, el plugin no se renderiza (console.warn + null).
	 */
	isAvailable: () => Promise<boolean>
	/**
	 * Renderiza el componente del plugin si está disponible.
	 * Recibe props del módulo donde se monta (ej: { org, repo }).
	 */
	render: (props: TProps) => ReactNode
}

/** Props que recibe un plugin montado en el slot 'repo' */
export interface RepoPluginProps {
	org: string
	repo: string
}
