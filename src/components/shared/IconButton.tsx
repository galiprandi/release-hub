import { cn } from "@/lib/utils";
import * as Tooltip from "@radix-ui/react-tooltip";

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	icon: React.ReactNode;
	tooltip: string;
	active?: boolean;
}

export function IconButton({
	icon,
	tooltip,
	active = false,
	className,
	disabled,
	onClick,
	...props
}: IconButtonProps) {
	return (
		<Tooltip.Root delayDuration={0}>
			<Tooltip.Trigger asChild>
				<button
					type="button"
					onClick={onClick}
					disabled={disabled}
					aria-label={props["aria-label"] || tooltip}
					data-active={active || undefined}
					className={cn(
						"p-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none focus-visible:ring-offset-1",
						active
							? "text-primary bg-primary/10 hover:bg-primary/20"
							: "text-muted-foreground hover:text-foreground hover:bg-muted",
						className
					)}
					{...props}
				>
					{icon}
				</button>
			</Tooltip.Trigger>
			<Tooltip.Portal>
				<Tooltip.Content
					className="bg-popover text-popover-foreground border px-2 py-1 text-xs font-medium rounded-md shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-[10000]"
					sideOffset={5}
				>
					{tooltip}
					<Tooltip.Arrow className="fill-popover" />
				</Tooltip.Content>
			</Tooltip.Portal>
		</Tooltip.Root>
	);
}
