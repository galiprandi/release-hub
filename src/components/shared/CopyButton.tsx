import { useCallback, useState } from "react";
import { Clipboard, ClipboardCheck } from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
	text: string;
	className?: string;
	tooltip?: string;
	copiedTooltip?: string;
}

export function CopyButton({ text, className, tooltip, copiedTooltip }: CopyButtonProps) {
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
		<Tooltip.Root>
			<Tooltip.Trigger asChild>
				<button
					onClick={handleCopy}
					aria-label={tooltip || "Copiar al portapapeles"}
					className={cn(
						"opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-accent focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:outline-none focus-visible:ring-offset-1",
						className
					)}
					type="button"
				>
					{copied ? (
						<ClipboardCheck className="w-4 h-4 text-success animate-in zoom-in duration-200" />
					) : (
						<Clipboard className="w-4 h-4 text-muted-foreground" />
					)}
				</button>
			</Tooltip.Trigger>
			<Tooltip.Portal>
				<Tooltip.Content
					className="bg-popover text-popover-foreground border px-2 py-1 text-xs font-medium rounded-md shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-[10000]"
					sideOffset={5}
				>
					{copied ? (copiedTooltip || "¡Copiado!") : (tooltip || "Copiar al portapapeles")}
				</Tooltip.Content>
			</Tooltip.Portal>
		</Tooltip.Root>
	);
}
