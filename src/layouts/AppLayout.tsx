import { type ReactNode } from 'react';
import {
  Github,
  Database,
  Activity,
  Blocks,
  Send,
  Newspaper,
  MessageSquare,
  Settings,
  Search,
  Moon,
  Sun,
  MoreHorizontal
} from 'lucide-react';
import { useState, useEffect } from 'react';
import * as Tooltip from "@radix-ui/react-tooltip";

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  showSearch?: boolean;
  searchPlaceholder?: string;
  headerActions?: ReactNode;
}

export function AppLayout({ 
  children, 
  title = "Dashboard",
  showSearch = true,
  searchPlaceholder = "Buscar... (CMD+K)",
  headerActions
}: AppLayoutProps) {
  const [isDark, setIsDark] = useState(false);

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
          <Github className="w-6 h-6 text-primary" />
        </div>

        <div className="w-6 h-px bg-border/60 mb-4" aria-hidden="true" />

        <nav className="flex flex-col gap-4 flex-1" aria-label="Menú de navegación">
          <ul className="flex flex-col gap-4 flex-1" role="list">
            <li>
              <NavIcon icon={Database} label="Repositorios" active />
            </li>
            <li>
              <NavIcon icon={Activity} label="Kubernetes" />
            </li>
            <li>
              <NavIcon icon={Blocks} label="Docker" />
            </li>
            <li>
              <NavIcon icon={Send} label="Fetcher" />
            </li>
          </ul>

          <div className="flex-1" aria-hidden="true" />

          <ul className="flex flex-col gap-4" role="list">
            <li>
              <NavIcon icon={Newspaper} label="Novedades" />
            </li>
            <li>
              <NavIcon icon={MessageSquare} label="Feedback" />
            </li>
            <li>
              <NavIcon icon={Settings} label="Opciones" />
            </li>
          </ul>
        </nav>

        <div className="mt-4">
          <a href="https://github.com" target="_blank" rel="noreferrer" className="block" aria-label="Perfil de usuario en GitHub">
            <img
              src="https://github.com/identicons/jasonlong.png"
              alt="Avatar de usuario"
              className="w-8 h-8 rounded-full border border-border/60 hover:border-primary/60 transition-colors"
            />
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 gap-5">
        {/* Header Bar */}
        <div className="sticky top-0 z-10">
          <header className="h-14 bg-background/80 backdrop-blur-sm border-b border-border/40 flex items-center justify-between px-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <nav className="flex items-center gap-4" aria-label="Navegación de breadcrumb">
              <h1 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/80">{title}</h1>

              {showSearch && (
                <div className="relative group">
                  <label htmlFor="search-input" className="sr-only">Buscar</label>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                  <input
                    id="search-input"
                    type="search"
                    placeholder={searchPlaceholder}
                    className="h-9 w-64 bg-muted/40 border-none rounded-md px-9 text-sm focus:ring-1 focus:ring-primary/30 transition-all outline-none"
                  />
                </div>
              )}
            </nav>

            <div className="flex items-center gap-3">
              {headerActions}
              <button
                onClick={() => setIsDark(!isDark)}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={isDark ? "Activar modo claro" : "Activar modo oscuro"}
              >
                {isDark ? <Sun className="w-4 h-4" aria-hidden="true" /> : <Moon className="w-4 h-4" aria-hidden="true" />}
              </button>
              <button className="p-2 text-muted-foreground hover:text-foreground transition-colors" aria-label="Más opciones">
                <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </header>
          {/* Gradient separator for sticky header */}
          <div className="h-4 bg-gradient-to-b from-border/30 to-transparent shrink-0" aria-hidden="true" />
        </div>

        {/* Page Content */}
        <div className="flex flex-col gap-6 px-8">
          {children}
        </div>
      </main>
    </div>
  );
}

function NavIcon({ icon: Icon, label, active = false }: { icon: React.ComponentType<{ className?: string }>, label: string, active?: boolean }) {
  return (
    <Tooltip.Provider delayDuration={0}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button 
            className={`p-2.5 rounded-lg transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
              active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
            aria-label={label}
            aria-current={active ? 'page' : undefined}
          >
            <Icon className="w-5 h-5" aria-hidden="true" />
          </button>
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
}
