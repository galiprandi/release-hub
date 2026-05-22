import type { ReactNode } from 'react';

interface FilterOption {
	value: string;
	label: string;
}

interface FilterBarProps {
	filters: FilterOption[];
	activeFilter: string;
	onFilterChange: (value: string) => void;
	searchPlaceholder: string;
	searchValue: string;
	onSearchChange: (value: string) => void;
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
				<div className="flex items-center gap-2">
					<span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Filtrar:</span>
					<div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/60 shadow-sm">
						{filters.map((filter) => (
							<button
								key={filter.value}
								type="button"
								onClick={() => onFilterChange(filter.value)}
								aria-pressed={activeFilter === filter.value}
								className={`px-3 py-1 text-xs rounded-md transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1 font-bold tracking-tight ${
									activeFilter === filter.value
										? 'bg-background text-foreground shadow-sm'
										: 'text-muted-foreground hover:text-foreground hover:bg-background/50'
								}`}
							>
								{filter.label}
							</button>
						))}
					</div>
				</div>

				<div className="relative">
					<input
						type="text"
						placeholder={searchPlaceholder}
						value={searchValue}
						onChange={(e) => onSearchChange(e.target.value)}
						className="px-3 py-1.5 text-sm bg-background border border-input rounded-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1 transition-all placeholder:text-muted-foreground w-64 shadow-sm"
					/>
				</div>
			</div>

			{rightContent && <div className="flex gap-2">{rightContent}</div>}
		</div>
	);
}
