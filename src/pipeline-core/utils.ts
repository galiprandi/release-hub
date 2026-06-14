const ROUTE_REGEX = /(https?:\/\/[^\s<>"')]+)/gi;

/**
 * Limpia una URL extraída de markdown, removiendo tags HTML y caracteres no deseados
 */
const cleanUrl = (url: string): string => {
	// Remover tags HTML comunes que pueden quedar al final de la URL
	return url
		.replace(/<\/[^>]+>$/g, '') // Remover </tag> al final
		.replace(/<[^>]+>$/g, '')  // Remover <tag> al final
		.replace(/"$/, '');        // Remover comillas al final
};

/**
 * Verifica si una URL es externa (accesible desde el navegador)
 * Las URLs internas tipo *.svc.cluster.local no son accesibles desde fuera del cluster
 */
const isExternalUrl = (url: string): boolean => {
	try {
		const urlObj = new URL(url);
		const hostname = urlObj.hostname;

		// Filtrar URLs internas de Kubernetes
		if (hostname.includes('.svc.cluster.local')) {
			return false;
		}

		// Filtrar URLs internas de servicios mesh/istio
		if (hostname.includes('.svc.') || hostname.endsWith('.local')) {
			return false;
		}

		return true;
	} catch {
		return false;
	}
};

import type { PipelineEvent } from "./types";

export const extractRoutes = (events: PipelineEvent[]) => {
	const urls = new Set<string>();
	events
		.filter((e) => e.id.toUpperCase().startsWith("DEPLOY"))
		.forEach((event) => {
			if (event.markdown) {
				const matches = event.markdown.match(ROUTE_REGEX);
				if (matches) {
					matches.forEach((match) => {
						const url = cleanUrl(match);
						// Solo incluir URLs externas accesibles desde el navegador
						if (isExternalUrl(url)) {
							urls.add(url);
						}
					});
				}
			}
		});
	return Array.from(urls);
};
