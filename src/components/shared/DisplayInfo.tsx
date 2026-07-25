import { Clock, GitCommit, MessageSquare, Tag, User } from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";
import DayJS from "@/lib/dayjs";
import { cn } from "@/lib/utils";

export const DisplayInfo = ({
	type,
	value,
	maxChar,
	hideIcon,
	hideTooltip,
	className,
	iconSize = 4,
}: Props) => {
	const icon =
		type === "commit"
			? "commit"
			: type === "tag"
				? "tag"
				: type === "dates"
					? "dates"
					: type === "author"
						? "author"
						: "message";
	const iconComponent =
		icon === "commit" ? (
			<GitCommit />
		) : icon === "tag" ? (
			<Tag />
		) : icon === "dates" ? (
			<Clock />
		) : icon === "author" ? (
			<User />
		) : (
			<MessageSquare />
		);
	const iconColor =
		type === "commit"
			? "text-commit"
			: type === "tag"
				? "text-tag"
				: "text-muted-foreground";

	const displayValue =
		value && maxChar && value.length > maxChar
			? `${value.substring(0, maxChar)}...`
			: value;

	if (!value) return "-";

	const tooltip = getTooltipValue({ value, type });
	const hasTooltip = tooltip && !hideTooltip;

	return (
		<div className={`flex items-center gap-1 ${className || ""}`}>
			{!hideIcon && (
				<div
					className={cn(
						iconColor,
						`w-${iconSize} h-${iconSize} flex items-center justify-center`,
					)}
				>
					{iconComponent}
				</div>
			)}
			{hasTooltip ? (
				<Tooltip.Root>
					<Tooltip.Trigger asChild>
						<span
							className={cn(
								"text-sm text-foreground",
								"focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 rounded-md",
							)}
							style={{ cursor: "help" }}
							tabIndex={0}
						>
							{type === "dates" ? DayJS(value).fromNow() : displayValue}
						</span>
					</Tooltip.Trigger>
					<Tooltip.Portal>
						<Tooltip.Content
							className="bg-popover text-popover-foreground border px-2 py-1 text-xs font-medium rounded-md shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-[10000] whitespace-pre-wrap"
							sideOffset={5}
						>
							{tooltip}
							<Tooltip.Arrow className="fill-popover" />
						</Tooltip.Content>
					</Tooltip.Portal>
				</Tooltip.Root>
			) : (
				<span className="text-sm text-foreground">
					{type === "dates" ? DayJS(value).fromNow() : displayValue}
				</span>
			)}
		</div>
	);
};

const getTooltipValue = ({ value, type }: Pick<Props, "value" | "type">) => {
	if (!value) return undefined;
	if (type === "dates") {
		const utcISO = DayJS(value).utc().format("YYYY-MM-DD HH:mm:ss");
		const localISO = DayJS(value).local().format("YYYY-MM-DD HH:mm:ss");
		return `🌎 ${utcISO}\n👩‍💻 ${localISO}`;
	}
	if (type === "message" && value && value.length > 50) {
		return value;
	}
	return undefined;
};

type Props = {
	type: "commit" | "tag" | "dates" | "author" | "message";
	value?: string | null;
	maxChar?: number;
	hideIcon?: boolean;
	hideTooltip?: boolean;
	className?: string;
	iconSize?: number;
};
