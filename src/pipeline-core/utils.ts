import type { PipelineEvent } from "./types";

/**
 * Extrae URLs de rutas externas accesibles desde los eventos del pipeline
 * @param events Lista de eventos del pipeline (unificados)
 * @returns Lista de URLs únicas
 */
export function extractRoutes(events: PipelineEvent[]): string[] {
	const routes = new Set<string>();

	const processMarkdown = (text?: string) => {
		if (!text) return;
		const urls = text.match(/https?:\/\/[^\s)]+/g);
		if (urls) {
			urls.forEach((url) => {
				try {
					const urlObj = new URL(url);
					// Filtrar URLs de servicios internos de Kubernetes
					if (urlObj.hostname.endsWith(".svc.cluster.local")) {
						return;
					}
					// Solo incluir si es un dominio externo
					routes.add(urlObj.origin + urlObj.pathname);
				} catch {
					// Ignorar URLs malformadas
				}
			});
		}
	};

	events.forEach((event) => {
		processMarkdown(event.markdown);
		// También procesar subeventos
		if (event.subevents) {
			event.subevents.forEach((sub) => processMarkdown(sub.markdown));
		}
	});

	return Array.from(routes);
}
