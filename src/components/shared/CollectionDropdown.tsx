import { Check, ChevronDown, type LucideIcon } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface CollectionTab {
	value: string;
	label: string;
	icon: LucideIcon;
	count?: number;
	description?: string;
}

interface CollectionDropdownProps {
	tabs: CollectionTab[];
	activeTab: string;
	onChange: (id: string) => void;
	menuLabel?: string;
	ariaLabel?: string;
}

export function CollectionDropdown({
	tabs,
	activeTab,
	onChange,
	menuLabel = "Colecciones",
	ariaLabel = "Seleccionar colección",
}: CollectionDropdownProps) {
	const active = tabs.find((t) => t.value === activeTab) ?? tabs[0];
	const ActiveIcon = active?.icon;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					aria-label={ariaLabel}
					className="inline-flex items-center gap-2 px-3 py-1.5 bg-muted/30 border border-border rounded-md text-xs font-medium text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
				>
					{ActiveIcon && <ActiveIcon className="w-3.5 h-3.5 text-muted-foreground" />}
					<span>{active?.label ?? menuLabel}</span>
					{active?.count != null && active.count > 0 && (
						<span className="px-1.5 py-0.5 rounded bg-muted text-xs font-medium text-muted-foreground">
							{active.count}
						</span>
					)}
					<ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="w-56">
				<DropdownMenuLabel>{menuLabel}</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{tabs.map((tab) => {
					const Icon = tab.icon;
					const isActive = tab.value === activeTab;
					return (
						<DropdownMenuItem
							key={tab.value}
							onSelect={() => onChange(tab.value)}
							className="justify-between"
						>
							<span className="flex items-center gap-2 min-w-0">
								<Icon className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
								<span className="truncate">{tab.label}</span>
								{tab.count != null && tab.count > 0 && (
									<span className="text-xs text-muted-foreground">
										{tab.count}
									</span>
								)}
							</span>
							{isActive && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
						</DropdownMenuItem>
					);
				})}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
