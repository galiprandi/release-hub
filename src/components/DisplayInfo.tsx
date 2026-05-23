import { Clock, GitCommit, MessageSquare, Tag, User } from "lucide-react";
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
			<span
				className={cn(
					"text-sm text-foreground",
					hasTooltip &&
						"focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm",
				)}
				title={hideTooltip ? undefined : tooltip}
				style={{ cursor: hasTooltip ? "help" : "default" }}
				tabIndex={hasTooltip ? 0 : undefined}
			>
				{type === "dates" ? DayJS(value).fromNow() : displayValue}
			</span>
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
