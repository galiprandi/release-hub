import React from "react";

// Patrón para detectar niveles de log
export const logLevelPattern = /\b(INFO|WARN|WARNING|ERROR|ERR|DEBUG|FATAL|TRACE)\b/gi;

/**
 * Elimina códigos de escape ANSI de texto
 */
export function stripAnsiCodes(text: string): string {
	const esc = String.fromCharCode(0x1b);
	return text.replace(new RegExp(esc + '\\[[0-9;]*m', 'g'), "");
}

/**
 * Resalta una línea de log con colores según timestamps, niveles de log y filtros.
 * Implementa una estrategia de reemplazo que evita modificar el contenido dentro de etiquetas HTML
 * ya insertadas, previniendo la corrupción del marcado (ej: evitar que el nivel 'INFO' coincida
 * con la clase 'text-info').
 */
export function highlightLogLine(line: string, filter?: string, customHighlight?: string): React.ReactNode {
	if (!line) return line;

	// 1. Limpiar ANSI color codes
	let highlighted = stripAnsiCodes(line);

	// 2. Reemplazar timestamps (se hace primero sobre texto plano)
	const timestampPattern = /^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})|^(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})|^(\d{2}:\d{2}:\d{2})/;
	highlighted = highlighted.replace(timestampPattern, '<span class="text-info">$&</span>');

	// Función helper para aplicar reemplazos evitando colisiones con etiquetas HTML
	const safeReplace = (html: string, pattern: string, replacer: (match: string) => string, flags = "gi") => {
		const regex = new RegExp(`(<[^>]+>)|(${pattern})`, flags);
		return html.replace(regex, (_match, tag, text) => {
			if (tag) return tag;
			return replacer(text);
		});
	};

	// 3. Reemplazar niveles de log
	highlighted = safeReplace(highlighted, "\\b(INFO|WARN|WARNING|ERROR|ERR|DEBUG|FATAL|TRACE)\\b", (match) => {
		const level = match.toUpperCase();
		let colorClass = 'text-muted-foreground';
		if (level === 'ERROR' || level === 'ERR' || level === 'FATAL') {
			colorClass = 'text-destructive font-bold';
		} else if (level === 'WARN' || level === 'WARNING') {
			colorClass = 'text-warning font-bold';
		} else if (level === 'INFO') {
			colorClass = 'text-success';
		} else if (level === 'DEBUG' || level === 'TRACE') {
			colorClass = 'text-ai';
		}
		return `<span class="${colorClass}">${match}</span>`;
	});

	// 4. Resaltar término de búsqueda
	if (filter && filter.trim()) {
		const escapedFilter = filter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		highlighted = safeReplace(highlighted, escapedFilter, (match) =>
			`<mark class="bg-warning/30 text-warning rounded px-0.5">${match}</mark>`
		);
	}

	// 5. Resaltar término personalizado
	if (customHighlight && customHighlight.trim()) {
		try {
			const escapedCustom = customHighlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			highlighted = safeReplace(highlighted, escapedCustom, (match) =>
				`<mark class="bg-ai/40 text-ai rounded px-0.5 border border-ai/20">${match}</mark>`
			);
		} catch (e) {
			console.warn('[logUtils] Invalid custom highlight regex/pattern:', e);
		}
	}

	return <span dangerouslySetInnerHTML={{ __html: highlighted }} />;
}

/**
 * Agrupa líneas de texto en logs completos (multi-línea)
 * Detecta el inicio de nuevos logs basándose en patrones comunes
 */
export function groupLogs(logText: string): string[] {
	if (!logText) return [];
	const lines = logText.split("\n");
	const logGroups: string[][] = [];
	let currentGroup: string[] = [];

	// Patrón para detectar inicio de nuevo log (timestamp o nivel de log)
	const logStartPattern = (line: string): boolean => {
		const cleanLine = stripAnsiCodes(line);
		
		// Timestamp ISO (2026-04-30)
		if (/^\d{4}-\d{2}-\d{2}/.test(cleanLine)) return true;
		
		// JSON
		if (/^\{/.test(cleanLine) || /^"level":/.test(cleanLine)) return true;
		
		// Corchetes específicos de logs ([Nest], [RedisBaseModel], [Handler], etc.)
		if (/^\[Nest\]|\[RedisBaseModel\]|\[Handler\]|\[OnUserUpdated\]|\[FCMBase\]|\[PushNotificationStrategy\]|\[PushNotificationClient\]|\[Notifier\]/.test(cleanLine)) return true;
		
		// kafka-client logs (info:, silly:, error:)
		if (/^info:|^silly:|^error:|^warn:/.test(cleanLine)) return true;
		
		return false;
	};

	for (const line of lines) {
		if (logStartPattern(line)) {
			// Inicio de nuevo log
			if (currentGroup.length > 0) {
				logGroups.push(currentGroup);
			}
			currentGroup = [line];
		} else {
			// Continuación del log actual
			currentGroup.push(line);
		}
	}
	if (currentGroup.length > 0) {
		logGroups.push(currentGroup);
	}

	return logGroups.map(group => group.join("\n"));
}
