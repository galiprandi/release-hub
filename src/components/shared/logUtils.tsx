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
 * Resalta una línea de log con colores según timestamps, niveles de log y filtros
 */
export function highlightLogLine(line: string, filter?: string): React.ReactNode {
	if (!line) return line;

	// Limpiar ANSI color codes antes de resaltar
	let highlighted = stripAnsiCodes(line);

	// Patrón para timestamps (ej: 2024-04-30 10:00:00, Apr 30 10:00:00, etc.)
	const timestampPattern = /^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})|^(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})|^(\d{2}:\d{2}:\d{2})/;

	// Patrón para niveles de log
	const logLevelPattern = /\b(INFO|WARN|WARNING|ERROR|ERR|DEBUG|FATAL|TRACE)\b/gi;

	// Reemplazar timestamps
	highlighted = highlighted.replace(timestampPattern, '<span class="text-blue-400">$&</span>');

	// Reemplazar niveles de log
	highlighted = highlighted.replace(logLevelPattern, (match) => {
		const level = match.toUpperCase();
		let colorClass = 'text-gray-400';
		if (level === 'ERROR' || level === 'ERR' || level === 'FATAL') {
			colorClass = 'text-red-400 font-bold';
		} else if (level === 'WARN' || level === 'WARNING') {
			colorClass = 'text-yellow-400 font-bold';
		} else if (level === 'INFO') {
			colorClass = 'text-green-400';
		} else if (level === 'DEBUG' || level === 'TRACE') {
			colorClass = 'text-purple-400';
		}
		return `<span class="${colorClass}">${match}</span>`;
	});

	// Resaltar término de búsqueda
	if (filter && filter.trim()) {
		const escapedFilter = filter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const filterPattern = new RegExp(`(${escapedFilter})`, 'gi');
		highlighted = highlighted.replace(filterPattern, '<mark class="bg-yellow-500/30 text-yellow-200 rounded px-0.5">$1</mark>');
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
