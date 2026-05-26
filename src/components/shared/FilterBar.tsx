import type { ReactNode } from 'react';

import type { LucideIcon } from 'lucide-react';

interface FilterOption {
	value: string;
	label: string;
	icon?: LucideIcon;
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
	variant?: 'default' | 'tabs';
	label?: string;
}

export function FilterBar({
	filters,
	activeFilter,
	onFilterChange,
	searchPlaceholder,
	searchValue,
	onSearchChange,
	rightContent,
	variant = 'default',
	label = 'Filtrar:',
}: FilterBarProps) {
	return (
		<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
			<div className="flex flex-wrap items-center gap-4">
				<div className="flex items-center gap-2">
					{label && <span className="text-sm font-medium text-muted-foreground">{label}</span>}
					<div className={`flex items-center gap-1.5 ${variant === 'tabs' ? 'bg-muted rounded-lg p-1' : ''}`}>
						{filters.map((filter) => {
							const Icon = filter.icon;
							const isActive = activeFilter === filter.value;
							return (
								<button
									key={filter.value}
									type="button"
									onClick={() => onFilterChange(filter.value)}
									aria-pressed={isActive}
									title={filter.description}
									className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1 font-medium whitespace-nowrap ${
										isActive
											? variant === 'tabs'
												? 'bg-background shadow-sm text-foreground'
												: 'bg-primary text-primary-foreground shadow-sm'
											: variant === 'tabs'
												? 'text-muted-foreground hover:text-foreground hover:bg-background/50'
												: 'bg-muted text-foreground hover:bg-accent hover:text-accent-foreground'
									}`}
								>
									{Icon && <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : ''}`} />}
									{filter.label}
									{filter.count !== undefined && filter.count > 0 && (
										<span className="text-xs bg-muted-foreground/20 px-1.5 py-0.5 rounded-full">
											{filter.count}
										</span>
									)}
								</button>
							);
						})}
					</div>
				</div>

				{onSearchChange && (
					<div className="relative">
						<input
							type="text"
							placeholder={searchPlaceholder}
							value={searchValue}
							onChange={(e) => onSearchChange(e.target.value)}
							className="px-3 py-1.5 text-sm bg-background border border-input rounded-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1 transition-all placeholder:text-muted-foreground w-64"
						/>
					</div>
				)}
			</div>

			{rightContent && <div className="flex gap-2">{rightContent}</div>}
		</div>
	);
}
