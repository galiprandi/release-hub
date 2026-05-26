import type { DiffMode } from '@/utils/diffEngine';
import { LayoutGrid, Fingerprint, Terminal, FileText } from 'lucide-react';
import { clsx } from 'clsx';

interface DiffControlsProps {
	mode: DiffMode;
	onModeChange: (mode: DiffMode) => void;
}

export function DiffControls({ mode, onModeChange }: DiffControlsProps) {
	const modes: { id: DiffMode; label: string; icon: any }[] = [
		{ id: 'json', label: 'JSON Mode', icon: LayoutGrid },
		{ id: 'jwt', label: 'JWT Mode', icon: Fingerprint },
		{ id: 'curl', label: 'cURL Mode', icon: Terminal },
		{ id: 'text', label: 'Logs/Text', icon: FileText },
	];

	return (
		<div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/60 shadow-sm">
			{modes.map((m) => (
				<button
					key={m.id}
					onClick={() => onModeChange(m.id)}
					className={clsx(
						"flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-tight transition-all",
						mode === m.id
							? "bg-background text-primary shadow-sm ring-1 ring-border/20"
							: "text-muted-foreground hover:text-foreground hover:bg-muted/60"
					)}
				>
					<m.icon className="w-4 h-4" />
					{m.label}
				</button>
			))}
		</div>
	);
}
