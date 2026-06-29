import { useCallback, useState } from "react";
import { Clipboard, ClipboardCheck } from "lucide-react";

interface CopyButtonProps {
	text: string;
	className?: string;
}

export function CopyButton({ text, className }: CopyButtonProps) {
	const [copied, setCopied] = useState(false);

	const handleCopy = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(text);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			// Fallback: silently ignore if clipboard is unavailable
		}
	}, [text]);

	return (
		<button
			onClick={handleCopy}
			title="Copiar al portapapeles"
			aria-label="Copiar al portapapeles"
			className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-accent focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:outline-none ${className}`}
			type="button"
		>
			{copied ? (
				<ClipboardCheck className="w-4 h-4 text-success" />
			) : (
				<Clipboard className="w-4 h-4 text-muted-foreground" />
			)}
		</button>
	);
}
