import { useState, useRef, useEffect, useMemo } from 'react'
import { Search, Loader2, GitBranch, X, FileCode } from 'lucide-react'
import { useRepoSearch } from '@/hooks/useRepoSearch'
import { useFileSearch, isFileSearchQuery } from '@/hooks/useFileSearch'
import { useUserCollections } from '@/hooks/useUserCollections'
import { useUserReposSummary } from '@/hooks/useUserReposSummary'
import { Link, useNavigate } from '@tanstack/react-router'
import { ActionButton, ACTION_DEFINITIONS } from '@/components/ui/ActionButton'
import * as Tooltip from '@radix-ui/react-tooltip'
import { EmptyState } from '@/components/shared/EmptyState'

interface UnifiedResult {
  id: string
  type: 'repo' | 'file'
  fullName: string
  name: string
  description?: string | null
  updatedAt?: string
  path?: string
  htmlUrl?: string
  repository?: string
}

export function RepoSearch() {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [isEditable, setIsEditable] = useState(false)
  const searchWidth = 'w-[35dvw]'
  const navigate = useNavigate()

  const isFileMode = isFileSearchQuery(query)

  // Load summary for total count
  const { data: summaryData } = useUserReposSummary()

  // Search repos or files depending on query prefix
  const { data: repoSearchData, isLoading: isRepoLoading } = useRepoSearch({
    searchTerm: isFileMode ? '' : query,
  })
  const { data: fileSearchData, isLoading: isFileLoading } = useFileSearch({
    searchTerm: isFileMode ? query : '',
  })

  const isLoading = isFileMode ? isFileLoading : isRepoLoading

  const { toggleFavorite, isFavorite } = useUserCollections()

  // Normalize results to unified type
  const results = useMemo<UnifiedResult[]>(() => {
    if (isFileMode) {
      return (fileSearchData || []).map((item) => ({
        id: `${item.repositoryFullName}:${item.path}`,
        type: 'file' as const,
        fullName: item.repositoryFullName,
        name: item.name,
        path: item.path,
        htmlUrl: item.htmlUrl,
        repository: item.repository,
      }))
    }
    return (repoSearchData?.results || []).map((repo) => ({
      id: repo.fullName,
      type: 'repo' as const,
      fullName: repo.fullName,
      name: repo.name,
      description: repo.description,
      updatedAt: repo.updatedAt,
    }))
  }, [isFileMode, fileSearchData, repoSearchData])

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

  const handleOpenInNewTab = (url: string) => {
    window.open(url, '_blank')
  }

  const handleOpenRepoInNewTab = (fullName: string) => {
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
          const item = results[selectedIndex]
          if (item) {
            if (item.type === 'repo') {
              const [org, name] = item.fullName.split('/')
              navigate({
                to: '/github/$org/$repo',
                params: { org, repo: name },
                search: { view: 'commits' },
              })
            } else if (item.type === 'file' && item.htmlUrl) {
              handleOpenInNewTab(item.htmlUrl)
            }
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
          placeholder={isFileMode
            ? 'Buscar archivo: file:AGENTS.md'
            : `Búsqueda en ${summaryData?.total || 0} repositorios... (Cmd+K)`}
          aria-label="Búsqueda de repositorios"
          className={`${searchWidth} pl-9 pr-14 py-2 bg-muted/30 border border-border rounded-lg text-sm focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:outline-none focus-visible:ring-offset-1 transition-all placeholder:text-muted-foreground/40`}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          name="search-repos-not-credentials"
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
        <div className={`absolute top-full left-0 mt-2 ${searchWidth} bg-popover text-popover-foreground border border-border rounded-md shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100`}>
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
              <p className="text-sm">
                {isFileMode ? 'Buscando archivos...' : 'Cargando información de repositorios...'}
              </p>
            </div>
          ) : !hasResults ? (
            <EmptyState
              className="min-h-0 py-8"
              icon={isFileMode ? (
                <FileCode className="w-5 h-5 text-muted-foreground/40" />
              ) : (
                <GitBranch className="w-5 h-5 text-muted-foreground/40" />
              )}
              label={query.length >= 2 ? 'Sin resultados' : 'Búsqueda de repositorios'}
              caption={query.length >= 2 ? `No se encontraron coincidencias para "${query}"` : 'Ingresa texto para iniciar la búsqueda'}
            />
          ) : (
            <div id="repo-search-results" role="listbox" className="max-h-80 overflow-y-auto">
              {results.map((item, index) => {
                const isSelected = index === selectedIndex

                if (item.type === 'file') {
                  return (
                    <div
                      key={item.id}
                      role="option"
                      aria-selected={isSelected}
                      id={`repo-option-${index}`}
                      className={`group p-3 border-b border-border last:border-b-0 transition-colors ${
                        isSelected ? 'bg-muted' : 'hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <button
                            type="button"
                            onClick={() => {
                              if (item.htmlUrl) handleOpenInNewTab(item.htmlUrl)
                              handleSelect()
                            }}
                            className="block text-left w-full"
                          >
                            <div className="flex items-center gap-2">
                              <FileCode className="w-4 h-4 text-warning shrink-0" />
                              <span className="font-medium text-sm truncate">
                                {item.name}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-warning/10 text-warning border border-warning/20 text-xs font-medium">
                                FILE
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {item.path}
                            </p>
                            <p className="text-xs text-muted-foreground/60 mt-1">
                              {item.fullName}
                            </p>
                          </button>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                          <ActionButton
                            action={ACTION_DEFINITIONS.openGitHub}
                            onClick={() => item.htmlUrl && handleOpenInNewTab(item.htmlUrl)}
                            size="sm"
                          />
                        </div>
                      </div>
                    </div>
                  )
                }

                const isFav = isFavorite(item.fullName)
                const [org, name] = item.fullName.split('/')

                return (
                  <div
                    key={item.id}
                    role="option"
                    aria-selected={isSelected}
                    id={`repo-option-${index}`}
                    className={`group p-3 border-b border-border last:border-b-0 transition-colors ${
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
                              {item.fullName}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 text-xs font-medium">
                              REPO
                            </span>
                          </div>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {item.description}
                            </p>
                          )}
                          {item.updatedAt && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Actualización:{' '}
                              {new Date(item.updatedAt).toLocaleDateString()}
                            </p>
                          )}
                        </Link>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <ActionButton
                          action={isFav ? ACTION_DEFINITIONS.removeFavorite : ACTION_DEFINITIONS.addFavorite}
                          onClick={() => toggleFavorite(item.fullName)}
                          size="sm"
                        />
                        <ActionButton
                          action={ACTION_DEFINITIONS.openGitHub}
                          onClick={() => handleOpenRepoInNewTab(item.fullName)}
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
          <div className="px-3 py-2 bg-muted/30 border-t border-border text-xs text-muted-foreground flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 font-medium">
                <kbd className="px-1.5 py-0.5 rounded bg-background border border-border shadow-sm font-sans">↑↓</kbd> Navegar
              </span>
              <span className="flex items-center gap-1 font-medium">
                <kbd className="px-1.5 py-0.5 rounded bg-background border border-border shadow-sm font-sans">↵</kbd> Seleccionar
              </span>
              <span className="flex items-center gap-1 font-medium">
                <kbd className="px-1.5 py-0.5 rounded bg-background border border-border shadow-sm font-sans">Esc</kbd> Cerrar
              </span>
            </div>
            <span className="font-medium">
              {isFileMode && results.length > 0 && results[0]?.type === 'file'
                ? `${results.length} archivos`
                : `${results.length} resultados`}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
