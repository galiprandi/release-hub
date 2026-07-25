import type { ReactNode } from 'react';

interface TabOption<T extends string> {
	id: T;
	label: string | ReactNode;
}

interface IndustrialTabsProps<T extends string> {
	options: TabOption<T>[];
	activeId: T;
	onChange: (id: T) => void;
	className?: string;
}

/**
 * IndustrialTabs - Unified tab component following the Linear/Vercel canon.
 * bg-muted/30 container, rounded-md, text-xs font-medium. No uppercase.
 */
export function IndustrialTabs<T extends string>({
	options,
	activeId,
	onChange,
	className = "",
}: IndustrialTabsProps<T>) {
	return (
		<div className={`flex p-1 bg-muted/30 border border-border rounded-md gap-1 items-center ${className}`}>
			{options.map((option) => (
				<button
					key={option.id}
					type="button"
					onClick={() => onChange(option.id)}
					aria-pressed={activeId === option.id}
					className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-all ${
						activeId === option.id
							? 'bg-background shadow-sm text-foreground'
							: 'text-muted-foreground hover:bg-accent hover:text-foreground'
					}`}
				>
					{option.label}
				</button>
			))}
		</div>
	);
}
