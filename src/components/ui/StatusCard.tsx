import { Loader2, XCircle, X, AlertTriangle, WifiOff } from "lucide-react";

export interface StatusCardProps {
	type: 'loading' | 'error' | 'warn' | 'offline';
	message: string;
	onClose?: () => void;
	onRetry?: () => void;
}

const FOCUS_RING = "focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none focus-visible:ring-offset-1";

export function StatusCard({ type, message, onClose, onRetry }: StatusCardProps) {
	const styles = {
		loading: {
			borderClass: 'border-border',
			textClass: 'text-muted-foreground',
			icon: Loader2,
			iconClass: 'animate-spin',
		},
		error: {
			borderClass: 'border-destructive/30',
			textClass: 'text-destructive',
			icon: XCircle,
			iconClass: '',
		},
		warn: {
			borderClass: 'border-warning/30',
			textClass: 'text-warning',
			icon: AlertTriangle,
			iconClass: '',
		},
		offline: {
			borderClass: 'border-border',
			textClass: 'text-muted-foreground',
			icon: WifiOff,
			iconClass: '',
		},
	};

	const style = styles[type];
	const Icon = style.icon;

	return (
		<div className={`bg-muted/30 border ${style.borderClass} rounded-md p-4 h-[82px] flex items-center justify-between shadow-sm`}>
			<div className="flex items-center gap-3 text-sm overflow-hidden">
				<div className={`p-2 rounded-lg bg-background/50 border ${style.borderClass}`}>
					<Icon className={`w-4 h-4 shrink-0 ${style.iconClass} ${style.textClass}`} aria-hidden="true" />
				</div>
				<p className={`${style.textClass} font-medium truncate tracking-tight`}>{message}</p>
			</div>
			<div className="flex items-center gap-2 shrink-0">
				{onRetry && (
					<button
						type="button"
						onClick={onRetry}
						className={`text-xs font-medium px-3 py-1.5 rounded-md transition-all focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none focus-visible:ring-offset-1 shadow-sm ${
							type === 'error' ? 'bg-destructive/20 text-destructive hover:bg-destructive/30 border border-destructive/30' :
							type === 'warn' ? 'bg-warning/20 text-warning hover:bg-warning/30 border border-warning/30' :
							'bg-muted text-foreground hover:bg-accent border border-border'
						}`}
					>
						Reintentar
					</button>
				)}
				{onClose && (
					<button
						type="button"
						onClick={onClose}
						className={`text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md ${FOCUS_RING}`}
						aria-label="Cerrar"
						title="Cerrar"
					>
						<X className="w-4 h-4" />
					</button>
				)}
			</div>
		</div>
	);
}
