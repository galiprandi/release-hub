import React, { type ReactNode, useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import * as Tooltip from "@radix-ui/react-tooltip";
import html2canvas from "html2canvas";
import {
	Activity,
	BookMarked,
	Blocks,
	Box,
	Boxes,
	Camera,
	Check,
	Copy,
	GitCompare,
	MessageSquare,
	Moon,
	Newspaper,
	RefreshCw,
	Settings,
	Sparkles,
	Sun,
	Terminal as TerminalIcon,
	Send,
} from "lucide-react";
import { FeedbackDialog } from "@/components/shared/FeedbackDialog";
import { SettingsDialog } from "@/components/shared/SettingsDialog";
import { AIChatModal } from "@/components/shared/AIChatModal";
import { GenericSearch } from "@/fetcher/components/GenericSearch";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { BaseDialog } from "@/components/ui/BaseDialog";
import { Terminal } from "@/components/shared/Terminal";
import { useGitUser } from "@/hooks/useGitUser";
import { IconButton } from "@/components/shared/IconButton";

interface PageLayoutProps {
	children: ReactNode;
	header?: {
		title?: ReactNode;
		search?: {
			searchQuery?: string;
			searchFn: (query: string) => void;
			searchShortcuts: string[];
			placeholder?: string;
			results?: unknown[];
			isLoading?: boolean;
			renderResult: (
				item: unknown,
				index: number,
				isSelected: boolean,
			) => React.ReactNode;
			onSelectResult?: (item: unknown) => void;
		};
		searchComponent?: ReactNode;
	};
	actions?: ReactNode[];
	refreshFn?: () => void;
	themeSwitch?: boolean;
	isLoading?: boolean | boolean[];
	footer?: {
		show?: boolean;
		left?: ReactNode;
		right?: ReactNode;
	};
	emptyState?: {
		show?: boolean;
		icon?: ReactNode;
		label?: ReactNode;
		caption?: ReactNode;
		action?: ReactNode;
	};
	showEmptyState?: boolean;
}

export function PageLayout({
	children,
	header,
	actions,
	refreshFn,
	themeSwitch = true,
	isLoading,
	footer,
	emptyState,
	showEmptyState,
}: PageLayoutProps) {
	const [isDark, setIsDark] = useState(true);
	const routerState = useRouterState();
	const pathname = routerState.location.pathname;
	const { data: gitUser } = useGitUser();

	// Determine if any loading state is true
	const isAnyLoading = Array.isArray(isLoading)
		? isLoading.some(Boolean)
		: isLoading;

	useEffect(() => {
		if (isDark) {
			document.documentElement.classList.add("dark");
		} else {
			document.documentElement.classList.remove("dark");
		}
	}, [isDark]);

	return (
		<div className="flex min-h-screen bg-background text-foreground">
			{/* Aside Nav */}
			<aside
				className="w-[50px] h-screen sticky top-0 flex flex-col items-center py-4 bg-background border-r border-border shrink-0"
				aria-label="Navegación principal"
			>
				<div className="p-1.5 rounded-md bg-primary/10 mb-4" aria-hidden="true">
					<Box className="w-6 h-6 text-primary" />
				</div>

				<div className="w-6 h-px bg-border mb-4" aria-hidden="true" />

				<nav
					className="flex flex-col gap-4 flex-1"
					aria-label="Menú de navegación"
				>
					<ul className="flex flex-col gap-4 flex-1">
						<li>
							<NavIcon
								icon={BookMarked}
								label="Repositorios"
								to="/github"
								pathname={pathname}
							/>
						</li>
						<li>
							<NavIcon
								icon={Boxes}
								label="Kubernetes"
								to="/kubernetes"
								pathname={pathname}
							/>
						</li>
						<li>
							<NavIcon
								icon={Blocks}
								label="Docker"
								to="/docker"
								pathname={pathname}
							/>
						</li>
						<li>
							<NavIcon
								icon={Send}
								label="Fetcher"
								to="/fetcher"
								pathname={pathname}
							/>
						</li>
						<li>
							<NavIcon
								icon={GitCompare}
								label="Diff Engine"
								to="/diff"
								pathname={pathname}
							/>
						</li>
						<li>
							<NavIcon
								icon={Activity}
								label="Health Monitor"
								to="/health"
								pathname={pathname}
							/>
						</li>
						<li>
							<TerminalIconModal />
						</li>
						<li>
							<AIChatIcon />
						</li>
					</ul>

					<div className="flex-1" aria-hidden="true" />

					<ul className="flex flex-col gap-4">
						<li>
							<NavIcon
								icon={Newspaper}
								label="Novedades"
								to="/novedades"
								pathname={pathname}
							/>
						</li>
						<li>
							<FeedbackIcon />
						</li>
						<li>
							<SettingsIcon />
						</li>
					</ul>
				</nav>

				<div className="mt-4">
					<a
						href="https://github.com"
						target="_blank"
						rel="noreferrer"
						className="block"
						aria-label="Perfil de usuario en GitHub"
					>
						<img
							src={
								gitUser?.avatar_url ||
								"https://github.com/identicons/jasonlong.png"
							}
							alt="Avatar de usuario"
							className="w-8 h-8 rounded-full border border-border hover:border-primary/60 transition-colors"
						/>
					</a>
				</div>
			</aside>

			{/* Main Content */}
			<main className="flex-1 flex flex-col min-w-0 gap-5">
				{/* Header Bar */}
				{header && (
					<div className="sticky top-0 z-10">
						<header className="h-14 bg-background/80 backdrop-blur-sm border-b border-border flex items-center justify-between px-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
							<nav
								className="flex items-center gap-4"
								aria-label="Navegación de breadcrumb"
							>
								<h1 className="text-sm font-semibold text-muted-foreground">
									{header.title}
								</h1>
							</nav>

							<div className="flex items-center gap-3">
								{header?.searchComponent
									? header.searchComponent
									: header?.search && (
											<GenericSearch
												searchQuery={header.search.searchQuery}
												searchFn={header.search.searchFn}
												searchShortcuts={header.search.searchShortcuts}
												placeholder={header.search.placeholder}
												results={header.search.results}
												isLoading={header.search.isLoading}
												renderResult={header.search.renderResult}
												onSelectResult={header.search.onSelectResult}
											/>
										)}
								{actions?.map((action, index) => (
									// biome-ignore lint/suspicious/noArrayIndexKey: Actions are provided by consumer and may not have unique keys
									<React.Fragment key={index}>{action}</React.Fragment>
								))}
								{refreshFn && (
									<IconButton
										icon={<RefreshCw className="w-4 h-4" />}
										tooltip="Refrescar"
										aria-label="Refrescar"
										onClick={refreshFn}
										className="p-2"
									/>
								)}
								{themeSwitch && (
									<IconButton
										icon={isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
										tooltip={isDark ? "Modo claro" : "Modo oscuro"}
										aria-label={isDark ? "Activar modo claro" : "Activar modo oscuro"}
										onClick={() => setIsDark(!isDark)}
										className="p-2"
									/>
								)}
								<ScreenshotButton />
							</div>
						</header>
						{/* Gradient separator for sticky header */}
						<div
							className="h-4 bg-gradient-to-b from-border/30 to-transparent shrink-0"
							aria-hidden="true"
						/>
					</div>
				)}
				{/* Page Content */}
				<div className="flex flex-col gap-6 px-8 grow">
					{isAnyLoading ? (
						<LoadingSpinner />
					) : showEmptyState ? (
						<EmptyState
							icon={emptyState?.icon}
							label={emptyState?.label}
							caption={emptyState?.caption}
							action={emptyState?.action}
						/>
					) : (
						children
					)}
				</div>
				{/* Footer */}
				{footer?.show && (
					<footer className="mt-auto border-t border-border py-4 px-8 bg-muted/30">
						<div className="flex items-center justify-between text-xs text-muted-foreground">
							<span>{footer?.left}</span>
							<div className="flex items-center gap-4">
								<span className="flex items-center gap-2">
									<InstallButton />
									{footer?.right}
									<span className="font-mono">
										Versión: {import.meta.env.VITE_GIT_COMMIT_HASH || "unknown"}
									</span>
								</span>
							</div>
						</div>
					</footer>
				)}
			</main>
		</div>
	);
}

function NavIcon({
	icon: Icon,
	label,
	active = false,
	to,
	pathname,
}: {
	icon: React.ComponentType<{ className?: string }>;
	label: string;
	active?: boolean;
	to?: string;
	pathname?: string;
}) {
	const isActive = to && pathname ? pathname === to : active;

	const buttonContent = (
		<button
			className={`p-2.5 rounded-lg transition-all focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none ${
				isActive
					? "bg-primary text-primary-foreground shadow-sm"
					: "text-muted-foreground hover:text-foreground hover:bg-muted/60"
			}`}
			aria-label={label}
			aria-current={isActive ? "page" : undefined}
			type="button"
		>
			<Icon className="w-5 h-5" aria-hidden="true" />
		</button>
	);

	const contentWithTooltip = (
		<Tooltip.Root>
			<Tooltip.Trigger asChild>{buttonContent}</Tooltip.Trigger>
			<Tooltip.Portal>
				<Tooltip.Content
					side="right"
					sideOffset={10}
					className="bg-popover text-popover-foreground border px-2.5 py-1.5 rounded shadow-md text-xs font-medium z-50 animate-in fade-in zoom-in-95"
					role="tooltip"
				>
					{label}
					<Tooltip.Arrow className="fill-popover" />
				</Tooltip.Content>
			</Tooltip.Portal>
		</Tooltip.Root>
	);

	if (to) {
		return (
			<Link to={to} preload="intent" className="block">
				{contentWithTooltip}
			</Link>
		);
	}

	return contentWithTooltip;
}

function FeedbackIcon() {
	const [open, setOpen] = useState(false);

	const buttonContent = (
		<button
			onClick={() => setOpen(true)}
			className="p-2.5 rounded-lg transition-all focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none text-muted-foreground hover:text-foreground hover:bg-muted/60"
			aria-label="Feedback"
			type="button"
		>
			<MessageSquare className="w-5 h-5" aria-hidden="true" />
		</button>
	);

	const contentWithTooltip = (
		<Tooltip.Root>
			<Tooltip.Trigger asChild>{buttonContent}</Tooltip.Trigger>
			<Tooltip.Portal>
				<Tooltip.Content
					side="right"
					sideOffset={10}
					className="bg-popover text-popover-foreground border px-2.5 py-1.5 rounded shadow-md text-xs font-medium z-50 animate-in fade-in zoom-in-95"
					role="tooltip"
				>
					Feedback
					<Tooltip.Arrow className="fill-popover" />
				</Tooltip.Content>
			</Tooltip.Portal>
		</Tooltip.Root>
	);

	return (
		<>
			{contentWithTooltip}
			<FeedbackDialog open={open} onOpenChange={setOpen} showTrigger={false} />
		</>
	);
}

function AIChatIcon() {
	const [open, setOpen] = useState(false);
	const [initialFile, setInitialFile] = useState<File | null>(null);

	useEffect(() => {
		const handleOpenWithFile = (e: Event) => {
			const customEvent = e as CustomEvent<{ file: File }>;
			if (customEvent.detail?.file) {
				setInitialFile(customEvent.detail.file);
				setOpen(true);
			}
		};

		window.addEventListener("open-ai-chat-with-file", handleOpenWithFile);
		return () =>
			window.removeEventListener("open-ai-chat-with-file", handleOpenWithFile);
	}, []);

	const handleClose = () => {
		setOpen(false);
		setInitialFile(null);
	};

	const buttonContent = (
		<button
			onClick={() => setOpen(true)}
			className="p-2.5 rounded-lg transition-all focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none text-muted-foreground hover:text-ai hover:bg-ai/10"
			aria-label="Asistente AI"
			type="button"
		>
			<Sparkles className="w-5 h-5" aria-hidden="true" />
		</button>
	);

	const contentWithTooltip = (
		<Tooltip.Root>
			<Tooltip.Trigger asChild>{buttonContent}</Tooltip.Trigger>
			<Tooltip.Portal>
				<Tooltip.Content
					side="right"
					sideOffset={10}
					className="bg-popover text-popover-foreground border px-2.5 py-1.5 rounded shadow-md text-xs font-medium z-50 animate-in fade-in zoom-in-95"
					role="tooltip"
				>
					Asistente AI
					<Tooltip.Arrow className="fill-popover" />
				</Tooltip.Content>
			</Tooltip.Portal>
		</Tooltip.Root>
	);

	return (
		<>
			{contentWithTooltip}
			<AIChatModal
				isOpen={open}
				onClose={handleClose}
				initialFile={initialFile}
			/>
		</>
	);
}

function ScreenshotButton() {
	const [isCapturing, setIsCapturing] = useState(false);

	const handleCapture = async () => {
		setIsCapturing(true);
		try {
			const canvas = await html2canvas(document.body, {
				allowTaint: true,
				useCORS: true,
				logging: false,
				backgroundColor: null,
			});

			canvas.toBlob(async (blob) => {
				if (blob) {
					const file = new File([blob], `screenshot-${Date.now()}.png`, {
						type: "image/png",
					});
					const event = new CustomEvent("open-ai-chat-with-file", {
						detail: { file },
					});
					window.dispatchEvent(event);
				}
			}, "image/png");
		} catch (err) {
			console.error("Failed to capture screenshot:", err);
		} finally {
			setIsCapturing(false);
		}
	};

	return (
		<IconButton
			icon={<Camera className="w-4 h-4" />}
			tooltip="Tomar captura y preguntar"
			aria-label="Tomar captura y preguntar a IA"
			onClick={handleCapture}
			disabled={isCapturing}
			className={isCapturing ? "text-ai animate-pulse" : "hover:text-ai p-2"}
		/>
	);
}

function SettingsIcon() {
	const [open, setOpen] = useState(false);

	const buttonContent = (
		<button
			onClick={() => setOpen(true)}
			className="p-2.5 rounded-lg transition-all focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none text-muted-foreground hover:text-foreground hover:bg-muted/60"
			aria-label="Configuración"
			type="button"
		>
			<Settings className="w-5 h-5" aria-hidden="true" />
		</button>
	);

	const contentWithTooltip = (
		<Tooltip.Root>
			<Tooltip.Trigger asChild>{buttonContent}</Tooltip.Trigger>
			<Tooltip.Portal>
				<Tooltip.Content
					side="right"
					sideOffset={10}
					className="bg-popover text-popover-foreground border px-2.5 py-1.5 rounded shadow-md text-xs font-medium z-50 animate-in fade-in zoom-in-95"
					role="tooltip"
				>
					Configuración
					<Tooltip.Arrow className="fill-popover" />
				</Tooltip.Content>
			</Tooltip.Portal>
		</Tooltip.Root>
	);

	return (
		<>
			{contentWithTooltip}
			<SettingsDialog open={open} onOpenChange={setOpen} showTrigger={false} />
		</>
	);
}

function TerminalIconModal() {
	const [open, setOpen] = useState(false);

	const buttonContent = (
		<button
			onClick={() => setOpen(true)}
			className="p-2.5 rounded-lg transition-all focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none text-muted-foreground hover:text-foreground hover:bg-muted/60"
			aria-label="Terminal"
			type="button"
		>
			<TerminalIcon className="w-5 h-5" aria-hidden="true" />
		</button>
	);

	const contentWithTooltip = (
		<Tooltip.Root>
			<Tooltip.Trigger asChild>{buttonContent}</Tooltip.Trigger>
			<Tooltip.Portal>
				<Tooltip.Content
					side="right"
					sideOffset={10}
					className="bg-popover text-popover-foreground border px-2.5 py-1.5 rounded shadow-md text-xs font-medium z-50 animate-in fade-in zoom-in-95"
					role="tooltip"
				>
					Terminal
					<Tooltip.Arrow className="fill-popover" />
				</Tooltip.Content>
			</Tooltip.Portal>
		</Tooltip.Root>
	);

	return (
		<>
			{contentWithTooltip}
			<BaseDialog
				open={open}
				onOpenChange={setOpen}
				title={
					<div className="flex items-center justify-between w-full pr-8">
						<div className="flex items-center gap-2">
							<TerminalIcon className="w-4 h-4 text-primary" />
							<span>Terminal del Sistema</span>
						</div>
						<div className="flex items-center gap-3">
							<div className="flex items-center gap-1.5">
								<div className="w-1 h-1 rounded-full bg-success animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
								<span className="text-xs font-medium text-muted-foreground">
									Active Session
								</span>
							</div>
							<div className="w-px h-3 bg-border" />
							<span className="text-xs font-medium text-muted-foreground/70 font-mono">
								Local
							</span>
						</div>
					</div>
				}
				maxWidth="max-w-6xl"
				className="w-[90vw] h-[80vh] !p-0"
			>
				<div className="flex-1 min-h-0 bg-zinc-950 rounded-b-xl overflow-hidden border-t border-border">
					<Terminal type="local" className="border-none rounded-none h-full" />
				</div>
			</BaseDialog>
		</>
	);
}

function InstallButton() {
	const [copied, setCopied] = useState(false);
	const installCommand =
		"curl -sSL https://raw.githubusercontent.com/galiprandi/release-hub/main/scripts/install.sh | bash\nrhub";

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(installCommand);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (err) {
			console.error("Failed to copy:", err);
		}
	};

	return (
		<button
			onClick={handleCopy}
			className="flex items-center gap-1.5 px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none"
			type="button"
			aria-label={copied ? "Comando copiado con éxito" : "Copiar comando de instalación al portapapeles"}
		>
			{copied ? (
				<Check className="w-3.5 h-3.5" />
			) : (
				<Copy className="w-3.5 h-3.5" />
			)}
			{copied ? "¡Copiado!" : "Instalar app"}
		</button>
	);
}
