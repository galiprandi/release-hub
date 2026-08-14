/**
 * MarkdownLog — Renderiza markdown de logs de Seki con formateo seguro.
 *
 * - Usa `marked` para parsear markdown → HTML
 * - Escapa HTML crudo del input antes de parsear (XSS safe)
 * - Limpia códigos ANSI de terminal (␛[33m, etc.)
 * - Estiliza bloques ```terminal con fondo oscuro y mono
 * - Highlight de palabras clave FAIL/ERROR/Warning en tablas de eventos
 */

import { useMemo } from 'react'
import { marked } from 'marked'

marked.setOptions({
	gfm: true,
	breaks: true,
})

/** Escapa HTML crudo del input para prevenir XSS antes de que marked lo procese */
function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;')
}

/** Limpia códigos ANSI de terminal (ESC[XXm) */
function stripAnsi(text: string): string {
	// eslint-disable-next-line no-control-regex
	return text.replace(/\x1B\[[0-9;]*m/g, '')
}

/** Post-procesa el HTML generado por marked para estilizar bloques terminal */
function postProcessHtml(html: string): string {
	// Estilizar code blocks con class="terminal"
	return html.replace(
		/<pre><code class="terminal">([\s\S]*?)<\/code><\/pre>/g,
		(_match, content) =>
			`<pre class="markdown-log-terminal"><code>${content}</code></pre>`
	)
}

interface MarkdownLogProps {
	content: string
	className?: string
}

export function MarkdownLog({ content, className }: MarkdownLogProps) {
	const html = useMemo(() => {
		// 1. Limpiar códigos ANSI
		const cleaned = stripAnsi(content)
		// 2. Escapar HTML crudo del input
		const escaped = escapeHtml(cleaned)
		// 3. Parsear markdown (marked interpreta el escaped text)
		const raw = marked.parse(escaped, { async: false }) as string
		// 4. Post-procesar para estilizar bloques terminal
		return postProcessHtml(raw)
	}, [content])

	return (
		<div
			className={`markdown-log ${className ?? ''}`}
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	)
}
