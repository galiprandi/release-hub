import React, { useState, useMemo } from "react";
import { CheckCircle, XCircle, ChevronDown, ChevronRight } from "lucide-react";
import { CopyButton } from "./CopyButton";
import type { OSType } from "@/utils/os";

interface CommandOption {
	label: string;
	cmd: string;
	os: OSType | null;
}

interface SetupCardProps {
	name: string;
	description: string;
	isInstalled: boolean;
	isRequired?: boolean;
	version?: string;
	icon: React.ReactNode;
	commands?: CommandOption[];
	detectedOS?: OSType;
}

export function SetupCard({
	name,
	description,
	isInstalled,
	isRequired = true,
	version,
	icon,
	commands = [],
	detectedOS = "unknown",
}: SetupCardProps) {
	const [isOpen, setIsOpen] = useState(true);
	const [showAllOptions, setShowAllOptions] = useState(false);

	const filteredCommands = useMemo(() => {
		if (detectedOS === "unknown" || !commands.length || showAllOptions) {
			return commands;
		}
		const osSpecific = commands.filter((c) => c.os === detectedOS || c.os === null);
		return osSpecific.length > 0 ? osSpecific : commands;
	}, [commands, detectedOS, showAllOptions]);

	if (isInstalled) {
		return (
			<div className="flex items-start gap-3 text-success text-sm border border-success/20 rounded-xl p-4 bg-success/10 shadow-sm transition-all hover:bg-success/20">
				<CheckCircle className="w-5 h-5 mt-0.5" />
				<div className="flex-1">
					<div className="flex items-center gap-2">
						<p className="text-[10px] font-bold uppercase tracking-wider">{name}</p>
						<span className="px-1.5 py-0.5 rounded-md bg-success/20 border border-success/20 text-[10px] font-bold uppercase tracking-wider">
							Instalado
						</span>
					</div>
					<p className="text-muted-foreground text-xs mt-1 leading-relaxed">
						{description}
					</p>
					{version && (
						<p className="text-[10px] font-mono text-muted-foreground/60 mt-2">
							Versión: {version}
						</p>
					)}
					{!isRequired && (
						<p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mt-1">
							(Opcional)
						</p>
					)}
				</div>
			</div>
		);
	}

	const containerStyles = isRequired
		? "border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/15"
		: "border-warning/20 bg-warning/10 text-warning hover:bg-warning/15";

	const iconStyles = isRequired ? "text-destructive" : "text-warning";
	const badgeStyles = isRequired
		? "bg-destructive/20 border-destructive/20"
		: "bg-warning/20 border-warning/20";

	return (
		<div className={`border rounded-xl p-4 shadow-sm transition-all ${containerStyles}`}>
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="w-full flex items-center gap-3 text-left focus-visible:outline-none"
				type="button"
			>
				<XCircle className={`w-5 h-5 flex-shrink-0 ${iconStyles}`} />
				<div className="flex-1">
					<div className="flex items-center gap-2">
						<h2 className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 ${iconStyles}`}>
							{icon}
							{name}
						</h2>
						<span className={`px-1.5 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${badgeStyles}`}>
							{isRequired ? "Requerido" : "Opcional"}
						</span>
					</div>
					<p className="text-xs text-muted-foreground/60 mt-1 leading-relaxed">{description}</p>
				</div>
				{isOpen ? (
					<ChevronDown className="w-4 h-4 text-muted-foreground/60" />
				) : (
					<ChevronRight className="w-4 h-4 text-muted-foreground/60" />
				)}
			</button>
			{isOpen && filteredCommands.length > 0 && (
				<div className="mt-4 bg-muted/10 border border-border/40 p-4 rounded-lg text-sm font-mono space-y-3 text-foreground">
					{filteredCommands.map((c) => (
						<div key={c.cmd}>
							{c.label && <p className="text-muted-foreground"># {c.label}</p>}
							<div className="flex items-center justify-between gap-2 group">
								<p className="flex-1">{c.cmd}</p>
								<CopyButton text={c.cmd} />
							</div>
						</div>
					))}
					{detectedOS !== "unknown" && commands.length > filteredCommands.length && !showAllOptions && (
						<p className="text-xs text-muted-foreground mt-2">
							Comandos para {detectedOS} detectados.{" "}
							<button
								onClick={() => setShowAllOptions(true)}
								className="underline hover:text-foreground"
								type="button"
							>
								Ver todas las opciones
							</button>
						</p>
					)}
				</div>
			)}
		</div>
	);
}
