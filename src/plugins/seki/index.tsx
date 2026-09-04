/**
 * Seki Plugin — Punto de entrada.
 *
 * Autocontenido:
 * - isAvailable(): verifica si hay token válido de Seki (localStorage o CLI)
 * - render(): renderiza el monitor si está disponible, null si no
 *
 * El plugin se monta en el slot 'repo' posición 'header'.
 * El resto de la app no sabe que este plugin existe.
 */

import type { Plugin, RepoPluginProps } from '../types'
import { checkSekiTokenAvailable } from './token'
import { SekiPluginMonitor } from './monitor'

const sekiPlugin: Plugin<RepoPluginProps> = {
	id: 'seki',
	slot: 'repo',
	position: 'header',
	isAvailable: checkSekiTokenAvailable,
	render: (props) => <SekiPluginMonitor {...props} />,
}

export default sekiPlugin
