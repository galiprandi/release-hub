import { useState, useRef, useEffect, useMemo } from 'react'
import { Search, Loader2, GitBranch, X } from 'lucide-react'
import { useRepoSearch } from '@/hooks/useRepoSearch'
import { useUserCollections } from '@/hooks/useUserCollections'
import { useUserReposSummary } from '@/hooks/useUserReposSummary'
import { Link, useNavigate } from '@tanstack/react-router'
import { ActionButton, ACTION_DEFINITIONS } from '@/components/ui/ActionButton'

export function RepoSearch() {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [isEditable, setIsEditable] = useState(false)
  const searchWidth = 'w-[35dvw]'
  const navigate = useNavigate()

  // Load summary for total count
  const { data: summaryData } = useUserReposSummary()

  // Search repos on-demand with debounce
  const { data: searchData, isLoading } = useRepoSearch({ searchTerm: query })

  const { toggleFavorite, isFavorite } = useUserCollections()

  // Results from search API
  const results = useMemo(() => {
    return searchData?.results || []
  }, [searchData?.results])

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

  const handleOpenInNewTab = (fullName: string) => {
    window.open(`https://github.com/${fullName}`, '_blank')
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
          const repo = results[selectedIndex]
          if (repo) {
            const [org, name] = repo.fullName.split('/')
            navigate({
              to: '/product/$org/$product',
              params: { org, product: name },
              search: { stage: 'staging', event: 'commit' },
            })
            handleSelect()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, results, selectedIndex, navigate])

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && isOpen) {
      const selectedElement = document.getElementById(`repo-option-${selectedIndex}`)
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
        })
      }
    }
  }, [selectedIndex, isOpen])

  const hasResults = results.length > 0

  return (
    <div ref={containerRef} className="relative">
      {/* Search Input */}
      <div className="relative" role="combobox" aria-expanded={isOpen} aria-haspopup="listbox" aria-controls="repo-search-results">
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
          placeholder={`Búsqueda en ${summaryData?.total || 0} repositorios... (Cmd+K)`}
          aria-label="Búsqueda de repositorios"
          className={`${searchWidth} pl-9 pr-14 py-2 bg-muted rounded-md text-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1 transition-all`}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          name="search-repos-not-credentials"
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
        <div className={`absolute top-full left-0 mt-2 ${searchWidth} bg-popover text-popover-foreground border rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100`}>
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
              <p className="text-sm">Cargando información de repositorios...</p>
            </div>
          ) : !hasResults ? (
            <div className="p-4 text-center text-muted-foreground">
              <GitBranch className="w-5 h-5 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {query.length >= 2
                  ? 'Sin resultados coincidentes'
                  : 'Ingreso de texto para iniciar búsqueda'}
              </p>
            </div>
          ) : (
            <div id="repo-search-results" role="listbox" className="max-h-80 overflow-y-auto">
              {results.map((repo, index) => {
                const isFav = isFavorite(repo.fullName)
                const [org, name] = repo.fullName.split('/')
                const isSelected = index === selectedIndex

                return (
                  <div
                    key={repo.fullName}
                    role="option"
                    aria-selected={isSelected}
                    id={`repo-option-${index}`}
                    className={`group p-3 border-b last:border-b-0 transition-colors ${
                      isSelected ? 'bg-muted' : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <Link
                          to="/github/$org/$repo"
                          params={{ org, repo: name }}
                          search={{ view: 'commits' }}
                          onClick={() => handleSelect()}
                          className="block"
                        >
                          <div className="flex items-center gap-2">
                            <GitBranch className="w-4 h-4 text-primary" />
                            <span className="font-medium text-sm truncate">
                              {repo.fullName}
                            </span>
                          </div>
                          {repo.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {repo.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            Actualización:{' '}
                            {new Date(repo.updatedAt).toLocaleDateString()}
                          </p>
                        </Link>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <ActionButton
                          action={isFav ? ACTION_DEFINITIONS.removeFavorite : ACTION_DEFINITIONS.addFavorite}
                          onClick={() => toggleFavorite(repo.fullName)}
                          size="sm"
                        />
                        <ActionButton
                          action={ACTION_DEFINITIONS.openGitHub}
                          onClick={() => handleOpenInNewTab(repo.fullName)}
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
                <kbd className="px-1.5 py-0.5 rounded bg-background border shadow-sm font-sans">↵</kbd> Seleccionar
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-background border shadow-sm font-sans">Esc</kbd> Cerrar
              </span>
            </div>
            <span>{results.length} resultados</span>
          </div>
        </div>
      )}
    </div>
  )
}
