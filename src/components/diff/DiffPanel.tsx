import React from 'react';
import { Copy, Check } from 'lucide-react';

export function DiffPanel({
	title,
	value,
	onChange,
	placeholder,
	onScroll,
	scrollRef
}: any) {
	const [copied, setCopied] = React.useState(false);

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(value);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	};

	return (
		<div className="flex flex-col h-full border rounded-xl bg-background shadow-sm overflow-hidden border-border/60">
			<div className="flex items-center justify-between px-4 py-2 border-b bg-muted/20 border-border/60">
				<h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
					{title}
				</h3>
				<button
					onClick={handleCopy}
					className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
					title="Copiar contenido"
				>
					{copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
				</button>
			</div>
			<div className="relative flex-1">
				<textarea
					ref={scrollRef as any}
					onScroll={onScroll}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					placeholder={placeholder}
					className="absolute inset-0 w-full h-full p-4 text-xs font-mono bg-transparent border-none focus:ring-2 focus:ring-primary/20 resize-none z-10 overflow-auto scrollbar-hide"
					spellCheck={false}
				/>
			</div>
		</div>
	);
}
