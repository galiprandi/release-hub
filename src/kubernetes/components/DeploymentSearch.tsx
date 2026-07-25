import { useState, useRef, useEffect, useMemo } from 'react'
import { Search, Loader2, X, Terminal } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { applyCachePolicy } from '@/lib/queryKeys'
import { useUserCollections } from '@/hooks/useUserCollections'
import type { DeploymentInfo } from '@/api/kubectl'
import { ActionButton, ACTION_DEFINITIONS } from '@/components/ui/ActionButton'
import { ItemProjectSelectionDialog } from '@/components/shared/ItemProjectSelectionDialog'
import * as Tooltip from '@radix-ui/react-tooltip'
import { EmptyState } from '@/components/shared/EmptyState'

type DeploymentWithContext = DeploymentInfo & { context: string }

export function DeploymentSearch() {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [isEditable, setIsEditable] = useState(false)
  const searchWidth = 'w-[35dvw]'

  // Debounce the query for namespace search
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 400)
    return () => clearTimeout(timer)
  }, [query])

  // Search deployments by namespace across all contexts in parallel
  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['kubectl', 'search-namespace', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery) return [] as DeploymentWithContext[]
      const { searchDeploymentsByNamespace, getContexts } = await import('@/api/kubectl')
      const contexts = await getContexts()
      if (!contexts || contexts.length === 0) return [] as DeploymentWithContext[]
      return searchDeploymentsByNamespace(debouncedQuery, contexts)
    },
    ...applyCachePolicy('kubectl'),
    enabled: debouncedQuery.length > 0,
  })

  const results = useMemo(() => (searchResults || []).slice(0, 50), [searchResults])

  const { toggleDeploymentFavorite, isDeploymentFavorite } = useUserCollections()
  const [isProjectSelectionOpen, setIsProjectSelectionOpen] = useState(false)
  const [deploymentToAssign, setDeploymentToAssign] = useState<string | null>(null)

  const handleSelect = () => {
    setQuery('')
    setIsOpen(false)
    setSelectedIndex(-1)
  }

  const handleClear = () => {
    setQuery('')
    setSelectedIndex(-1)
    inputRef.current?.focus()
  }

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Keyboard shortcut: Cmd/Ctrl + K to open and keyboard navigation
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault()
        setIsOpen(true)
        inputRef.current?.focus()
      }
      if (event.key === 'Escape') {
        setIsOpen(false)
        setSelectedIndex(-1)
      }

      if (isOpen && results.length > 0) {
        if (event.key === 'ArrowDown') {
          event.preventDefault()
          setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev))
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault()
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev))
        }
        if (event.key === 'Enter' && selectedIndex >= 0) {
          event.preventDefault()
          const deployment = results[selectedIndex]
          if (deployment) {
            toggleDeploymentFavorite(`${deployment.context}/${deployment.namespace}/${deployment.name}`)
            handleSelect()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, results, selectedIndex, toggleDeploymentFavorite])

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && isOpen) {
      const selectedElement = document.getElementById(`deployment-option-${selectedIndex}`)
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
        })
      }
    }
  }, [selectedIndex, isOpen])

  const hasResults = results.length > 0

  const handleManageProjects = (deploymentId: string) => {
    setDeploymentToAssign(deploymentId)
    setIsProjectSelectionOpen(true)
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Search Input */}
      <div className="relative" role="combobox" aria-expanded={isOpen} aria-haspopup="listbox" aria-controls="deployment-search-results">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
            setSelectedIndex(-1)
          }}
          onFocus={() => {
            setIsEditable(true);
            if (query.length >= 2) setIsOpen(true);
          }}
          onBlur={() => setIsEditable(false)}
          placeholder={`Buscar por namespace... (ej: yumi-ticket-control)`}
          aria-label="Búsqueda de deployments"
          className={`${searchWidth} pl-9 pr-14 py-2 bg-muted/30 border border-border rounded-lg text-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1 transition-all hover:bg-muted/50`}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          name="search-deployments"
          readOnly={!isEditable}
        />
        {query && (
          <Tooltip.Root delayDuration={0}>
            <Tooltip.Trigger asChild>
              <button
                type="button"
                onClick={handleClear}
                className={`absolute ${isLoading ? 'right-9' : 'right-3'} top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted-foreground/10 rounded-full text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1 transition-all`}
                aria-label="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                className="bg-popover text-popover-foreground border px-2 py-1 text-xs font-medium rounded-md shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-[10000]"
                sideOffset={5}
              >
                Limpiar búsqueda
                <Tooltip.Arrow className="fill-popover" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        )}
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && (
        <div className={`absolute top-full left-0 mt-2 ${searchWidth} bg-popover text-popover-foreground border rounded-md shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100`}>
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
              <p className="text-sm">Buscando en todos los contextos...</p>
            </div>
          ) : !hasResults ? (
            <EmptyState
              className="min-h-0 py-8"
              icon={<Terminal className="w-5 h-5 text-muted-foreground/40" />}
              label={debouncedQuery.length > 0 ? 'Sin resultados' : 'Búsqueda de deployments'}
              caption={debouncedQuery.length > 0
                ? `Sin deployments en namespace "${debouncedQuery}"`
                : 'Escribe un namespace para buscar'}
            />
          ) : (
            <div id="deployment-search-results" role="listbox" className="max-h-80 overflow-y-auto">
              {results.map((deployment, index) => {
                const deploymentId = `${deployment.context}/${deployment.namespace}/${deployment.name}`
                const isFav = isDeploymentFavorite(deploymentId)
                const isSelected = index === selectedIndex

                return (
                  <div
                    key={deploymentId}
                    role="option"
                    aria-selected={isSelected}
                    id={`deployment-option-${index}`}
                    className={`group p-3 border-b border-border last:border-b-0 transition-colors ${
                      isSelected ? 'bg-muted' : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Terminal className="w-3.5 h-3.5 text-primary/60" />
                          <span className="font-bold tracking-tight text-sm truncate">
                            {deployment.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-medium text-muted-foreground/60">{deployment.namespace}</span>
                          <div className="w-px h-2.5 bg-border/60 mx-0.5" />
                          <span className="text-xs font-medium text-muted-foreground/40 truncate">{deployment.context}</span>
                        </div>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-1.5">
                             <span className="text-xs font-medium text-muted-foreground/40">Ready</span>
                             <span className="px-1.5 py-0.5 rounded bg-muted/30 border border-border text-xs font-mono font-bold text-foreground">
                               {deployment.ready}
                             </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                             <span className="text-xs font-medium text-muted-foreground/40">Up-to-date</span>
                             <span className="px-1.5 py-0.5 rounded bg-muted/30 border border-border text-xs font-mono font-bold text-foreground">
                               {deployment.upToDate}
                             </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                             <span className="text-xs font-medium text-muted-foreground/40">Available</span>
                             <span className="px-1.5 py-0.5 rounded bg-muted/30 border border-border text-xs font-mono font-bold text-foreground">
                               {deployment.available}
                             </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <ActionButton
                          action={ACTION_DEFINITIONS.manageProjects}
                          onClick={() => handleManageProjects(deploymentId)}
                          size="sm"
                        />
                        <ActionButton
                          action={isFav ? ACTION_DEFINITIONS.removeFavorite : ACTION_DEFINITIONS.addFavorite}
                          onClick={() => toggleDeploymentFavorite(deploymentId)}
                          size="sm"
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Footer hint */}
          <div className="px-3 py-2 bg-muted/60 border-t border-border text-xs font-medium uppercase tracking-widest text-muted-foreground/80 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-background border border-border shadow-sm font-sans text-xs">↑↓</kbd> NAVEGAR
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-background border border-border shadow-sm font-sans text-xs">↵</kbd> SELECCIONAR
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-background border border-border shadow-sm font-sans text-xs">ESC</kbd> CERRAR
              </span>
            </div>
            <span className="opacity-60">{results.length} RESULTADOS</span>
          </div>
        </div>
      )}

      {isProjectSelectionOpen && deploymentToAssign && (
        <ItemProjectSelectionDialog
          isOpen={isProjectSelectionOpen}
          onOpenChange={setIsProjectSelectionOpen}
          type="deployment"
          itemId={deploymentToAssign}
        />
      )}
    </div>
  )
}
