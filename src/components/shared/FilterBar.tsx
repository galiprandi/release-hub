import type { ReactNode, ComponentType } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface LucideProps {
	className?: string;
	size?: number | string;
	strokeWidth?: number | string;
}

export interface FilterOption {
	value: string;
	label: string;
	icon?: ComponentType<LucideProps>;
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
	className?: string;
	variant?: 'default' | 'tabs';
}

export function FilterBar({
	filters,
	activeFilter,
	onFilterChange,
	searchPlaceholder,
	searchValue,
	onSearchChange,
	rightContent,
	className,
	variant = 'default',
}: FilterBarProps) {
	return (
		<div className={twMerge(clsx("flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4", className))}>
			<div className="flex flex-wrap items-center gap-4">
				<div className={clsx(
					"flex items-center gap-1.5",
					variant === 'tabs' ? "bg-muted/40 p-1 border border-border/60 rounded-lg shadow-sm" : ""
				)}>
					{variant === 'default' && (
						<span className="text-sm font-medium text-muted-foreground mr-1">Filtrar:</span>
					)}
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
								className={clsx(
									"flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1 font-bold uppercase text-xs tracking-tight",
									isActive
										? variant === 'tabs'
											? "bg-background shadow-sm text-foreground"
											: "bg-primary text-primary-foreground shadow-sm"
										: "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
								)}
							>
								{Icon && <Icon className={clsx("w-3.5 h-3.5", isActive ? "text-primary" : "text-muted-foreground")} />}
								<span>{filter.label}</span>
								{filter.count !== undefined && (
									<span className={clsx(
										"px-1.5 py-0.5 rounded-full text-[10px] font-bold",
										isActive ? "bg-primary-foreground/20" : "bg-muted-foreground/20"
									)}>
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
							className="px-3 py-1.5 text-sm bg-background border border-input rounded-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1 transition-all placeholder:text-muted-foreground w-64"
						/>
					</div>
				)}
			</div>

			{rightContent && <div className="flex gap-2">{rightContent}</div>}
		</div>
	);
}
