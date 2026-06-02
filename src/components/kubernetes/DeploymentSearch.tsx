import { useState, useRef, useEffect, useMemo } from 'react'
import { Search, Loader2, X, Terminal } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { applyCachePolicy } from '@/lib/queryKeys'
import { useUserCollections } from '@/hooks/useUserCollections'
import type { DeploymentInfo } from '@/api/kubectl'
import { ActionButton, ACTION_DEFINITIONS } from '@/components/ui/ActionButton'
import { DeploymentProjectSelectionDialog } from './DeploymentProjectSelectionDialog'

export function DeploymentSearch() {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [isEditable, setIsEditable] = useState(false)
  const searchWidth = 'w-[35dvw]'

  // Search deployments on-demand with debounce
  const { data: allDeployments, isLoading, refetch } = useQuery({
    queryKey: ['kubectl', 'all-deployments-search'],
    queryFn: async () => {
      const { getContexts, getDeployments } = await import('@/api/kubectl')
      const contexts = await getContexts()
      if (!contexts || contexts.length === 0) return []

      const deploymentsByContext = await Promise.all(
        contexts.map(async (ctx) => {
          try {
            const deployments = await getDeployments(undefined, ctx)
            return { context: ctx, deployments }
          } catch {
            return { context: ctx, deployments: [] }
          }
        })
      )

      return deploymentsByContext.flatMap(({ context: ctx, deployments }) =>
        deployments.map((d: DeploymentInfo) => ({ ...d, context: ctx }))
      )
    },
    ...applyCachePolicy('kubectl'),
    enabled: false,
  })

  // Filter deployments based on query
  const results = useMemo(() => {
    if (!query || !allDeployments) return []
    const lowerQuery = query.toLowerCase()
    return allDeployments.filter(d => 
      d.name.toLowerCase().includes(lowerQuery) ||
      d.namespace.toLowerCase().includes(lowerQuery) ||
      `${d.namespace}/${d.name}`.toLowerCase().includes(lowerQuery)
    ).slice(0, 50) // Limit to 50 results
  }, [query, allDeployments])

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
            if (!allDeployments) refetch();
            if (query.length >= 2) setIsOpen(true);
          }}
          onBlur={() => setIsEditable(false)}
          placeholder={`Búsqueda de deployments... (Cmd+K)`}
          aria-label="Búsqueda de deployments"
          className={`${searchWidth} pl-9 pr-14 py-2 bg-muted/40 rounded-lg text-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1 transition-all`}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          name="search-deployments"
          readOnly={!isEditable}
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className={`absolute ${isLoading ? 'right-9' : 'right-3'} top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted-foreground/10 rounded-full text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1 transition-all`}
            aria-label="Limpiar búsqueda"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && (
        <div className={`absolute top-full left-0 mt-2 ${searchWidth} bg-popover text-popover-foreground border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100`}>
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
              <p className="text-sm">Cargando deployments...</p>
            </div>
          ) : !hasResults ? (
            <div className="p-4 text-center text-muted-foreground">
              <Terminal className="w-5 h-5 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {query.length >= 2
                  ? 'Sin resultados coincidentes'
                  : 'Ingreso de texto para iniciar búsqueda'}
              </p>
            </div>
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
                    className={`group p-3 border-b last:border-b-0 transition-colors ${
                      isSelected ? 'bg-muted' : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Terminal className="w-4 h-4 text-primary" />
                          <span className="font-medium text-sm truncate">
                            {deployment.namespace}/{deployment.name}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {deployment.context}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Ready: {deployment.ready} • Up-to-date: {deployment.upToDate}
                        </p>
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
          <div className="px-3 py-2 bg-muted/30 border-t text-[10px] text-muted-foreground flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-background border shadow-sm font-sans">↑↓</kbd> Navegar
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-background border shadow-sm font-sans">↵</kbd> Agregar
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-background border shadow-sm font-sans">Esc</kbd> Cerrar
              </span>
            </div>
            <span>{results.length} resultados</span>
          </div>
        </div>
      )}

      {isProjectSelectionOpen && deploymentToAssign && (
        <DeploymentProjectSelectionDialog
          isOpen={isProjectSelectionOpen}
          onOpenChange={setIsProjectSelectionOpen}
          deploymentId={deploymentToAssign}
        />
      )}
    </div>
  )
}
