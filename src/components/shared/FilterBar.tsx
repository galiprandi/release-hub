import type { ReactNode, ElementType } from 'react';

interface FilterOption {
	value: string;
	label: string;
	icon?: ElementType;
	count?: number;
	description?: string;
}

interface FilterBarProps {
	filters: FilterOption[];
	activeFilter: string;
	onFilterChange: (value: string) => void;
	searchPlaceholder?: string;
	searchValue?: string;
	onSearchChange?: (value: string) => void;
	rightContent?: ReactNode;
}

export function FilterBar({
	filters,
	activeFilter,
	onFilterChange,
	searchPlaceholder,
	searchValue,
	onSearchChange,
	rightContent,
}: FilterBarProps) {
	return (
		<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
			<div className="flex flex-wrap items-center gap-4">
				<div className="flex items-center gap-1 p-1 bg-muted/40 border border-border/60 rounded-lg shadow-sm">
					{filters.map((filter) => {
						const isActive = activeFilter === filter.value;
						const Icon = filter.icon;
						return (
							<button
								key={filter.value}
								type="button"
								onClick={() => onFilterChange(filter.value)}
								aria-pressed={isActive}
								title={filter.description}
								className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-tight rounded-md transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1 ${
									isActive
										? 'bg-background shadow-sm text-foreground'
										: 'text-muted-foreground hover:text-foreground hover:bg-background/50'
								}`}
							>
								{Icon && <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-primary' : ''}`} />}
								<span>{filter.label}</span>
								{filter.count !== undefined && filter.count > 0 && (
									<span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
										isActive ? 'bg-primary/10 text-primary' : 'bg-muted-foreground/20 text-muted-foreground'
									}`}>
										{filter.count}
									</span>
								)}
							</button>
						);
					})}
				</div>

				{onSearchChange && (
					<div className="relative">
						<input
							type="text"
							placeholder={searchPlaceholder}
							value={searchValue}
							onChange={(e) => onSearchChange(e.target.value)}
							className="px-3 py-1.5 text-sm bg-background border border-border/60 rounded-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1 transition-all placeholder:text-muted-foreground w-64 shadow-sm"
						/>
					</div>
				)}
			</div>

			{rightContent && <div className="flex gap-2">{rightContent}</div>}
		</div>
	);
}
