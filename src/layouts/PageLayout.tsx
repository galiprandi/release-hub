import React, { type ReactNode, useState } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import {
  Box,
  Boxes,
  Blocks,
  Send,
  Moon,
  Sun,
  BookMarked,
  Newspaper,
  MessageSquare,
  Settings,
  RefreshCw,
  Activity,
  GitCompare,
  Sparkles,
  Camera,
  Terminal as TerminalIcon
} from 'lucide-react';
import { useEffect } from 'react';
import * as Tooltip from "@radix-ui/react-tooltip";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { SettingsDialog } from "@/components/SettingsDialog";
import { AIChatModal } from "@/components/AIChatModal";
import { GenericSearch } from "@/components/GenericSearch";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";
import { useGitUser } from "@/hooks/useGitUser";
import { BaseDialog } from "@/components/ui/BaseDialog";
import { Terminal } from "@/components/shared/Terminal";
import html2canvas from 'html2canvas';

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
      renderResult: (item: unknown, index: number, isSelected: boolean) => React.ReactNode;
      onSelectResult?: (item: unknown) => void;
    };
    searchComponent?: ReactNode;
    extra?: ReactNode;
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
  showEmptyState
}: PageLayoutProps) {
  const [isDark, setIsDark] = useState(false);
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const { data: gitUser } = useGitUser();

  // Determine if any loading state is true
  const isAnyLoading = Array.isArray(isLoading) ? isLoading.some(Boolean) : isLoading;

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <div className="flex min-h-screen bg-background text-foreground transition-colors duration-200">
      {/* Aside Nav */}
      <aside className="w-[50px] h-screen sticky top-0 flex flex-col items-center py-4 bg-muted/30 border-r border-border/40 shrink-0" aria-label="Navegación principal">
        <div className="p-1.5 rounded-lg bg-primary/10 mb-4" aria-hidden="true">
          <Box className="w-6 h-6 text-primary" />
        </div>

        <div className="w-6 h-px bg-border/60 mb-4" aria-hidden="true" />

        <nav className="flex flex-col gap-4 flex-1" aria-label="Menú de navegación">
          <ul className="flex flex-col gap-4 flex-1" role="list">
            <li>
              <NavIcon icon={BookMarked} label="Repositorios" to="/github" pathname={pathname} />
            </li>
            <li>
              <NavIcon icon={Boxes} label="Kubernetes" to="/kubernetes" pathname={pathname} />
            </li>
            <li>
              <NavIcon icon={Blocks} label="Docker" to="/docker" pathname={pathname} />
            </li>
            <li>
              <NavIcon icon={Send} label="Fetcher" to="/fetcher" pathname={pathname} />
            </li>
            <li>
              <NavIcon icon={GitCompare} label="Diff Engine" to="/diff" pathname={pathname} />
            </li>
            <li>
              <NavIcon icon={Activity} label="Health Monitor" to="/health" pathname={pathname} />
            </li>
            <li>
              <TerminalIconModal />
            </li>
            <li>
              <AIChatIcon />
            </li>
          </ul>

          <div className="flex-1" aria-hidden="true" />

          <ul className="flex flex-col gap-4" role="list">
            <li>
              <NavIcon icon={Newspaper} label="Novedades" to="/novedades" pathname={pathname} />
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
          <a href="https://github.com" target="_blank" rel="noreferrer" className="block" aria-label="Perfil de usuario en GitHub">
            <img
              src={gitUser?.avatar_url || "https://github.com/identicons/jasonlong.png"}
              alt="Avatar de usuario"
              className="w-8 h-8 rounded-full border border-border/60 hover:border-primary/60 transition-colors"
            />
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 gap-5">
        {/* Header Bar */}
       {header &&   <>
         <div className="sticky top-0 z-10">
         <header className="h-14 bg-background/80 backdrop-blur-sm border-b border-border/40 flex items-center justify-between px-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <nav className="flex items-center gap-4" aria-label="Navegación de breadcrumb">
              <h1 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/80">
                {header.title}
              </h1>
            </nav>

            <div className="flex items-center gap-3">
              {header?.extra}
              {header?.searchComponent ? (
                header.searchComponent
              ) : header?.search && (
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
              {actions && actions.map((action, index) => (
                <React.Fragment key={index}>{action}</React.Fragment>
              ))}
              {refreshFn && (
                <button
                  onClick={refreshFn}
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Refrescar"
                >
                  <RefreshCw className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
               {themeSwitch && (
                <button
                  onClick={() => setIsDark(!isDark)}
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={isDark ? "Activar modo claro" : "Activar modo oscuro"}
                >
                  {isDark ? <Sun className="w-4 h-4" aria-hidden="true" /> : <Moon className="w-4 h-4" aria-hidden="true" />}
                </button>
              )}
              <ScreenshotButton />
            </div>
          </header>
          {/* Gradient separator for sticky header */}
          <div className="h-4 bg-gradient-to-b from-border/30 to-transparent shrink-0" aria-hidden="true" />
        </div>
        </>
        }
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
          <footer className="mt-auto border-t border-border/40 py-4 px-8 bg-muted/30">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{footer?.left}</span>
              <span>{footer?.right}</span>
            </div>
          </footer>
        )}
      </main>
    </div>
  );
}

function NavIcon({ icon: Icon, label, active = false, to, pathname }: { icon: React.ComponentType<{ className?: string }>, label: string, active?: boolean, to?: string, pathname?: string }) {
  const isActive = to && pathname ? pathname === to : active;

  const buttonContent = (
    <button
      className={`p-2.5 rounded-lg transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
        isActive
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
      }`}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon className="w-5 h-5" aria-hidden="true" />
    </button>
  );

  const contentWithTooltip = (
    <Tooltip.Provider delayDuration={0}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          {buttonContent}
        </Tooltip.Trigger>
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
    </Tooltip.Provider>
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
      className="p-2.5 rounded-lg transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none text-muted-foreground hover:text-foreground hover:bg-muted/60"
      aria-label="Feedback"
    >
      <MessageSquare className="w-5 h-5" aria-hidden="true" />
    </button>
  );

  const contentWithTooltip = (
    <Tooltip.Provider delayDuration={0}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          {buttonContent}
        </Tooltip.Trigger>
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
    </Tooltip.Provider>
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

    window.addEventListener('open-ai-chat-with-file', handleOpenWithFile);
    return () => window.removeEventListener('open-ai-chat-with-file', handleOpenWithFile);
  }, []);

  const handleClose = () => {
    setOpen(false);
    setInitialFile(null);
  };

  const buttonContent = (
    <button
      onClick={() => setOpen(true)}
      className="p-2.5 rounded-lg transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none text-muted-foreground hover:text-ai hover:bg-ai/10"
      aria-label="Asistente AI"
    >
      <Sparkles className="w-5 h-5" aria-hidden="true" />
    </button>
  );

  const contentWithTooltip = (
    <Tooltip.Provider delayDuration={0}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          {buttonContent}
        </Tooltip.Trigger>
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
    </Tooltip.Provider>
  );

  return (
    <>
      {contentWithTooltip}
      <AIChatModal isOpen={open} onClose={handleClose} initialFile={initialFile} />
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
          const file = new File([blob], `screenshot-${Date.now()}.png`, { type: 'image/png' });
          const event = new CustomEvent('open-ai-chat-with-file', { detail: { file } });
          window.dispatchEvent(event);
        }
      }, 'image/png');
    } catch (err) {
      console.error('Failed to capture screenshot:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <Tooltip.Provider delayDuration={0}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            onClick={handleCapture}
            disabled={isCapturing}
            className={`p-2 transition-colors ${
              isCapturing ? 'text-ai animate-pulse' : 'text-muted-foreground hover:text-ai'
            }`}
            aria-label="Tomar captura y preguntar a IA"
          >
            <Camera className="w-4 h-4" />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="bottom"
            sideOffset={10}
            className="bg-popover text-popover-foreground border px-2.5 py-1.5 rounded shadow-md text-xs font-medium z-50 animate-in fade-in zoom-in-95"
          >
            Tomar captura y preguntar
            <Tooltip.Arrow className="fill-popover" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

function SettingsIcon() {
  const [open, setOpen] = useState(false);

  const buttonContent = (
    <button
      onClick={() => setOpen(true)}
      className="p-2.5 rounded-lg transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none text-muted-foreground hover:text-foreground hover:bg-muted/60"
      aria-label="Configuración"
    >
      <Settings className="w-5 h-5" aria-hidden="true" />
    </button>
  );

  const contentWithTooltip = (
    <Tooltip.Provider delayDuration={0}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          {buttonContent}
        </Tooltip.Trigger>
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
    </Tooltip.Provider>
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
      className="p-2.5 rounded-lg transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none text-muted-foreground hover:text-foreground hover:bg-muted/60"
      aria-label="Terminal"
    >
      <TerminalIcon className="w-5 h-5" aria-hidden="true" />
    </button>
  );

  const contentWithTooltip = (
    <Tooltip.Provider delayDuration={0}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          {buttonContent}
        </Tooltip.Trigger>
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
    </Tooltip.Provider>
  );

  return (
    <>
      {contentWithTooltip}
      <BaseDialog
        open={open}
        onOpenChange={setOpen}
        title={
          <div className="flex items-center gap-2">
            <TerminalIcon className="w-4 h-4 text-primary" />
            <span>Terminal del Sistema</span>
          </div>
        }
        maxWidth="max-w-6xl"
        className="w-[90vw] h-[80vh] !p-0"
      >
        <div className="flex-1 min-h-0 bg-black rounded-b-lg overflow-hidden">
          <Terminal
            type="local"
            className="border-none rounded-none h-full"
          />
        </div>
      </BaseDialog>
    </>
  );
}
