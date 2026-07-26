import { Loader2 } from "lucide-react";
import { type ReactNode } from "react";

interface LoadingSpinnerProps {
	label?: ReactNode;
	caption?: ReactNode;
	className?: string;
}

export function LoadingSpinner({ label, caption, className }: LoadingSpinnerProps) {
	return (
		<div className={`flex items-center justify-center ${className || "py-12"}`} id="loading-spinner">
			<div className="flex flex-col items-center gap-4">
				<Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
				{label && <p className="text-muted-foreground text-sm">{label}</p>}
				{caption && <p className="text-muted-foreground text-xs">{caption}</p>}
			</div>
		</div>
	);
}
