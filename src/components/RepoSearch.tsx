import { useState, useRef, useEffect, useMemo } from 'react'
import { Search, Star, ExternalLink, Loader2, GitBranch } from 'lucide-react'
import { useUserRepos } from '@/hooks/useUserRepos'
import { useFavorites } from '@/hooks/useFavorites'
import { Link } from '@tanstack/react-router'

export function RepoSearch() {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load all repos from user (via gh CLI) - no org specified to get all accessible repos
  const { data, isLoading } = useUserRepos()

  const { toggleFavorite, isFavorite } = useFavorites()

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

  // Keyboard shortcut: Cmd/Ctrl + K to open
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault()
        setIsOpen(true)
        inputRef.current?.focus()
      }
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSelect = () => {
    setQuery('')
    setIsOpen(false)
  }

  const handleOpenInNewTab = (fullName: string) => {
    window.open(`https://github.com/${fullName}`, '_blank')
  }

  // Filter repos locally based on query
  const results = useMemo(() => {
    const allRepos = data?.results || []
    if (!query || query.length < 2) return allRepos.slice(0, 10) // Show first 10 when no query

    const lowerQuery = query.toLowerCase()
    return allRepos.filter(
      (repo) =>
        repo.name.toLowerCase().includes(lowerQuery) ||
        repo.fullName.toLowerCase().includes(lowerQuery) ||
        (repo.description &&
          repo.description.toLowerCase().includes(lowerQuery))
    )
  }, [data?.results, query])

  const hasResults = results.length > 0

  return (
    <div ref={containerRef} className="relative">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          placeholder={`Buscar en ${data?.results?.length || 0} repos... (Cmd+K)`}
          className="w-[28rem] pl-9 pr-4 py-2 bg-muted rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-96 bg-white border rounded-lg shadow-lg z-50 overflow-hidden">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
              <p className="text-sm">Cargando repositorios...</p>
            </div>
          ) : !hasResults ? (
            <div className="p-4 text-center text-muted-foreground">
              <GitBranch className="w-5 h-5 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {query.length >= 2
                  ? 'No se encontraron repositorios'
                  : 'Escribe para buscar repositorios'}
              </p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {results.map((repo) => {
                const isFav = isFavorite(repo.fullName)
                const [org, name] = repo.fullName.split('/')

                return (
                  <div
                    key={repo.fullName}
                    className="group p-3 hover:bg-muted/50 border-b last:border-b-0 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <Link
                          to="/product/$org/$product"
                          params={{ org, product: name }}
                          search={{ stage: 'staging', event: 'commit' }}
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
                            Actualizado:{' '}
                            {new Date(repo.updatedAt).toLocaleDateString()}
                          </p>
                        </Link>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => toggleFavorite(repo.fullName)}
                          className={`p-1.5 rounded-md transition-colors ${
                            isFav
                              ? 'text-yellow-500 hover:text-yellow-600'
                              : 'text-muted-foreground hover:text-yellow-500 hover:bg-yellow-50'
                          }`}
                          title={
                            isFav
                              ? 'Quitar de favoritos'
                              : 'Agregar a favoritos'
                          }
                        >
                          <Star
                            className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`}
                          />
                        </button>
                        <button
                          onClick={() => handleOpenInNewTab(repo.fullName)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          title="Ver en GitHub"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Footer hint */}
          <div className="px-3 py-2 bg-muted/30 border-t text-xs text-muted-foreground flex items-center justify-between">
            <span>{results.length} resultados</span>
            <span>Esc para cerrar</span>
          </div>
        </div>
      )}
    </div>
  )
}
