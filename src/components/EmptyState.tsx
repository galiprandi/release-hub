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
				{icon && <div className="mb-4">{icon}</div>}
				{label && <h3 className="text-lg font-medium text-foreground mb-1">{label}</h3>}
				{caption && <p className="text-sm max-w-xs mx-auto mb-6">{caption}</p>}
				{action}
			</div>
		</div>
	);
}
