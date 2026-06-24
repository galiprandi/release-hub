import { type ReactNode } from 'react';

interface EmptyStateProps {
	icon?: ReactNode;
	label?: ReactNode;
	caption?: ReactNode;
	action?: ReactNode;
}

export function EmptyState({ icon, label, caption, action }: EmptyStateProps) {
	return (
		<div className="flex items-center justify-center w-full min-h-[400px]">
			<div className="w-full border rounded-xl p-12 text-center text-muted-foreground bg-muted/20 border-dashed">
				{icon && (
					<div className="flex justify-center mb-6">
						<div className="p-4 rounded-full bg-muted/20 border border-border/40">
							{icon}
						</div>
					</div>
				)}
				{label && (
					<h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground mb-2">
						{label}
					</h3>
				)}
				{caption && <p className="text-sm max-w-xs mx-auto mb-6 opacity-70">{caption}</p>}
				{action}
			</div>
		</div>
	);
}
