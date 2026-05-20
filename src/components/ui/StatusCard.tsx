import { Loader2, XCircle, X, AlertTriangle, WifiOff } from "lucide-react";

export interface StatusCardProps {
	type: 'loading' | 'error' | 'warn' | 'offline';
	message: string;
	onClose?: () => void;
	onRetry?: () => void;
}

export function StatusCard({ type, message, onClose, onRetry }: StatusCardProps) {
	const styles = {
		loading: {
			borderClass: 'border-gray-200',
			textClass: 'text-gray-600',
			icon: Loader2,
			iconClass: 'animate-spin',
		},
		error: {
			borderClass: 'border-red-200',
			textClass: 'text-red-600',
			icon: XCircle,
			iconClass: '',
		},
		warn: {
			borderClass: 'border-amber-200',
			textClass: 'text-amber-700',
			icon: AlertTriangle,
			iconClass: '',
		},
		offline: {
			borderClass: 'border-gray-300',
			textClass: 'text-gray-500',
			icon: WifiOff,
			iconClass: '',
		},
	};

	const style = styles[type];
	const Icon = style.icon;

	return (
		<div className={`bg-card border-2 ${style.borderClass} rounded-xl p-4 h-[82px] flex items-center justify-between`}>
			<div className="flex items-center gap-2 text-sm">
				<Icon className={`w-4 h-4 ${style.iconClass} ${style.textClass}`} />
				<p className={style.textClass}>{message}</p>
			</div>
			<div className="flex items-center gap-2">
				{onRetry && (
					<button
						type="button"
						onClick={onRetry}
						className={`text-xs px-2 py-1 rounded transition-colors ${
							type === 'error' ? 'bg-red-100 text-red-700 hover:bg-red-200' :
							type === 'warn' ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' :
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
						className="text-muted-foreground hover:text-foreground transition-colors"
						title="Cerrar"
					>
						<X className="w-4 h-4" />
					</button>
				)}
			</div>
		</div>
	);
}
