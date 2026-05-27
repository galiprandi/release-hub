import { useState, useMemo } from 'react';
import { Copy, Check, AlertCircle, Code, Minimize2, Search, X } from 'lucide-react';
import { formatJSON, minifyJSON } from '../utils/curlParser';

interface JsonEditorProps {
	value: string;
	onChange: (value: string, shouldMinify?: boolean) => void;
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
	const [displayMode, setDisplayMode] = useState<'formatted' | 'minified'>('formatted');
	const [formatFeedback, setFormatFeedback] = useState(false);

	// Sync display mode when value changes using a ref-based previous value check to avoid useEffect cascading renders
	const [lastValue, setLastValue] = useState(value);
	if (value !== lastValue) {
		setLastValue(value);
		setDisplayMode('formatted');
	}

	const isValidJson = useMemo(() => {
		if (!value) return true;
		try {
			JSON.parse(value);
			return true;
		} catch {
			return false;
		}
	}, [value]);

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
		
		if (readOnly) {
			// Toggle between formatted and minified
			setDisplayMode(displayMode === 'formatted' ? 'minified' : 'formatted');
		} else {
			// In edit mode, toggle between formatted and minified
			const formatted = formatJSON(value);
			const minified = minifyJSON(value);
			
			if (value === formatted) {
				// Currently formatted, go to minified
				onChange(minified, true);
			} else {
				// Currently minified or original, go to formatted
				onChange(formatted, false);
			}
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
		
		// Apply display mode transformations for readOnly
		if (readOnly) {
			// Always minify first to get a clean base, then format if needed
			const minified = minifyJSON(value);
			
			if (displayMode === 'formatted') {
				displayValue = formatJSON(minified);
			} else {
				displayValue = minified;
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
			<div className="flex items-center justify-between bg-g pb-1 px-4">
				<div className="flex items-center gap-2">
					<label className="text-xs font-medium">JSON</label>
					{!isValidJson && !readOnly && (
						<span className="text-xs text-warning flex items-center gap-1">
							<AlertCircle className="w-3 h-3" />
							Inválido
						</span>
					)}
				</div>
				<div className="flex items-center gap-2">
					{onSearchChange && (
						<div className="flex items-center gap-1">
							{searchExpanded ? (
								<div className="flex items-center gap-1">
									<input
										type="text"
										value={searchQuery}
										onChange={(e) => onSearchChange(e.target.value)}
										placeholder="Buscar..."
										className="px-2 py-1 text-xs border rounded-md focus:outline-none focus:ring-2 focus:ring-primary w-32"
										autoFocus
									/>
									<button
										type="button"
										onClick={() => {
											setSearchExpanded(false);
											onSearchChange('');
										}}
										className="text-primary hover:text-primary/80"
										title="Cerrar búsqueda"
									>
										<X className="w-4 h-4" />
									</button>
								</div>
							) : (
								<button
									type="button"
									onClick={() => setSearchExpanded(true)}
									className="text-primary hover:text-primary/80"
									title="Buscar"
								>
									<Search className="w-4 h-4" />
								</button>
							)}
						</div>
					)}
					<button
						type="button"
						onClick={handleFormatToggle}
						className="text-primary hover:text-primary/80"
						title={formatFeedback ? (displayMode === 'formatted' ? 'Formateado' : 'Minificado') : (displayMode === 'formatted' ? 'Minificar' : 'Formatear')}
					>
						{formatFeedback ? <Check className="w-4 h-4" /> : (displayMode === 'formatted' ? <Minimize2 className="w-4 h-4" /> : <Code className="w-4 h-4" />)}
					</button>
					<button
						type="button"
						onClick={handleCopy}
						className="text-primary hover:text-primary/80"
						title={copied ? 'Copiado' : 'Copiar'}
					>
						{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
					</button>
				</div>
			</div>
			{readOnly ? (
				<div className="relative">
					<pre className={`w-full ${height} px-2.5 py-1.5 text-xs font-mono whitespace-pre-wrap break-all border rounded-md bg-muted/50 overflow-auto`}>
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
						className={`w-full ${height} px-2.5 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono ${!isValidJson ? 'border-warning/50 focus:ring-warning' : ''}`}
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
