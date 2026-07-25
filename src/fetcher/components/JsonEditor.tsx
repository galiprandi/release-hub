import { useState, useMemo } from 'react';
import { Copy, Check, Code, Search, X } from 'lucide-react';
import { formatJSON } from '@/utils/curlParser';
import { IconButton } from '@/components/shared/IconButton';

interface JsonEditorProps {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	readOnly?: boolean;
	height?: string;
	searchQuery?: string;
	onSearchChange?: (query: string) => void;
}

export function JsonEditor({ 
	value, 
	onChange, 
	placeholder = '{"key": "value"}', 
	readOnly = false, 
	height = 'h-60',
	searchQuery = '',
	onSearchChange
}: JsonEditorProps) {
	const [copied, setCopied] = useState(false);
	const [searchExpanded, setSearchExpanded] = useState(false);
	const [formatFeedback, setFormatFeedback] = useState(false);

	const stats = useMemo(() => {
		if (!value) return { lines: 0, chars: 0 };
		return {
			lines: value.split('\n').length,
			chars: value.length
		};
	}, [value]);

	const handleFormatToggle = () => {
		setFormatFeedback(true);
		setTimeout(() => setFormatFeedback(false), 1000);
		
		if (readOnly) return;
		
		// Only try to format if it looks like JSON
		const trimmed = value.trim();
		if (!trimmed || (!trimmed.startsWith('{') && !trimmed.startsWith('['))) return;
		
		const formatted = formatJSON(value);
		if (formatted !== value) {
			onChange(formatted);
		}
	};

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(value);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	};

	const getDisplayValue = () => {
		if (!value) return '';
		
		let displayValue = value;
		
		// For readOnly, always format if it looks like JSON
		if (readOnly) {
			const trimmed = value.trim();
			if (trimmed && (trimmed.startsWith('{') || trimmed.startsWith('['))) {
				displayValue = formatJSON(value);
			}
		}
		
		// Apply search filtering
		if (searchQuery && onSearchChange) {
			const formatted = formatJSON(displayValue);
			return formatted
				.split('\n')
				.filter((line) => line.toLowerCase().includes(searchQuery.toLowerCase()))
				.join('\n') || '(Sin coincidencias)';
		}
		
		return displayValue;
	};

	return (
		<div>
			<div className="flex items-center justify-between bg-muted/30 border border-border rounded-t-lg pb-1 px-4">
				<div className="flex items-center gap-2">
					<label className="text-xs font-medium text-muted-foreground">JSON</label>
				</div>
				<div className="flex items-center gap-1.5">
					{onSearchChange && (
						<div className="flex items-center gap-1.5">
							{searchExpanded ? (
								<div className="flex items-center gap-1.5">
									<input
										type="text"
										value={searchQuery}
										onChange={(e) => onSearchChange(e.target.value)}
										placeholder="Buscar..."
										className="px-2 py-1 text-xs border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary w-32"
										autoFocus
									/>
									<IconButton
										icon={<X className="w-4 h-4" />}
										tooltip="Cerrar búsqueda"
										aria-label="Cerrar búsqueda de JSON"
										onClick={() => {
											setSearchExpanded(false);
											onSearchChange('');
										}}
										className="text-primary hover:text-primary/80 hover:bg-muted"
									/>
								</div>
							) : (
								<IconButton
									icon={<Search className="w-4 h-4" />}
									tooltip="Buscar"
									aria-label="Buscar en JSON"
									onClick={() => setSearchExpanded(true)}
									className="text-primary hover:text-primary/80 hover:bg-muted"
								/>
							)}
						</div>
					)}
					<IconButton
						icon={formatFeedback ? <Check className="w-4 h-4 text-success animate-in zoom-in duration-200" /> : <Code className="w-4 h-4" />}
						tooltip={formatFeedback ? 'Formateado' : 'Formatear JSON'}
						aria-label={formatFeedback ? 'JSON formateado con éxito' : 'Formatear código JSON'}
						onClick={handleFormatToggle}
						className="text-primary hover:text-primary/80 hover:bg-muted"
					/>
					<IconButton
						icon={copied ? <Check className="w-4 h-4 text-success animate-in zoom-in duration-200" /> : <Copy className="w-4 h-4" />}
						tooltip={copied ? '¡Copiado!' : 'Copiar JSON'}
						aria-label={copied ? 'Código JSON copiado con éxito' : 'Copiar código JSON al portapapeles'}
						onClick={handleCopy}
						className="text-primary hover:text-primary/80 hover:bg-muted"
					/>
				</div>
			</div>
			{readOnly ? (
				<div className="relative">
					<pre className={`w-full ${height} px-2.5 py-1.5 text-xs font-mono whitespace-pre-wrap break-all border border-t-0 rounded-b-lg bg-muted/30 overflow-auto`}>
						{getDisplayValue() || '(Sin respuesta)'}
					</pre>
					{value && (
						<div className="absolute bottom-2 right-2 text-xs text-muted-foreground bg-background/80 px-1.5 py-0.5 rounded">
							{stats.lines} líneas · {stats.chars} caracteres
						</div>
					)}
				</div>
			) : (
				<div className="relative">
					<textarea
						value={value}
						onChange={(e) => onChange(e.target.value)}
						placeholder={placeholder}
						readOnly={readOnly}
						className={`w-full ${height} px-2.5 py-1.5 text-sm border border-t-0 rounded-b-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 font-mono bg-background`}
					/>
					{value && (
						<div className="absolute bottom-2 right-2 text-xs text-muted-foreground bg-background/80 px-1.5 py-0.5 rounded">
							{stats.lines} líneas · {stats.chars} caracteres
						</div>
					)}
				</div>
			)}
		</div>
	);
}
