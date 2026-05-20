import { Loader2, XCircle, X, AlertTriangle, WifiOff } from "lucide-react";

export interface StatusCardProps {
	type: 'loading' | 'error' | 'warn' | 'offline';
	message: string;
	onClose?: () => void;
	onRetry?: () => void;
}

const FOCUS_RING = "focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1";

export function StatusCard({ type, message, onClose, onRetry }: StatusCardProps) {
	const styles = {
		loading: {
			borderClass: 'border-border/50',
			textClass: 'text-muted-foreground',
			icon: Loader2,
			iconClass: 'animate-spin',
		},
		error: {
			borderClass: 'border-destructive/20',
			textClass: 'text-destructive',
			icon: XCircle,
			iconClass: '',
		},
		warn: {
			borderClass: 'border-warning/20',
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
		<div className={`bg-card border-2 ${style.borderClass} rounded-xl p-4 h-[82px] flex items-center justify-between`}>
			<div className="flex items-center gap-2 text-sm overflow-hidden">
				<Icon className={`w-4 h-4 shrink-0 ${style.iconClass} ${style.textClass}`} aria-hidden="true" />
				<p className={`${style.textClass} font-medium truncate`}>{message}</p>
			</div>
			<div className="flex items-center gap-2 shrink-0">
				{onRetry && (
					<button
						type="button"
						onClick={onRetry}
						className={`text-xs px-2 py-1 rounded transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1 ${
							type === 'error' ? 'bg-destructive/10 text-destructive hover:bg-destructive/20' :
							type === 'warn' ? 'bg-warning/10 text-warning hover:bg-warning/20' :
							'bg-muted text-muted-foreground hover:bg-accent'
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
