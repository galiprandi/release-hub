import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, Loader2, X } from 'lucide-react'

interface GenericSearchProps<T> {
  searchQuery?: string
  searchFn: (query: string) => void
  searchShortcuts: string[]
  placeholder?: string
  results?: T[]
  isLoading?: boolean
  renderResult: (item: T, index: number, isSelected: boolean) => React.ReactNode
  onSelectResult?: (item: T) => void
  onClear?: () => void
  width?: string
}

export function GenericSearch<T>({
  searchQuery = '',
  searchFn,
  searchShortcuts = ['Cmd+K'],
  placeholder = 'Buscar... (Cmd+K)',
  results = [],
  isLoading = false,
  renderResult,
  onSelectResult,
  onClear,
  width = 'w-[35dvw]'
}: GenericSearchProps<T>) {
  const [query, setQuery] = useState(searchQuery)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [isEditable, setIsEditable] = useState(false)

  const handleSelect = useCallback((item?: T) => {
    if (item && onSelectResult) {
      onSelectResult(item)
    }
    setQuery('')
    setIsOpen(false)
    setSelectedIndex(-1)
  }, [onSelectResult])

  const handleClear = () => {
    setQuery('')
    setSelectedIndex(-1)
    if (onClear) onClear()
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

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Check for configured shortcuts
      for (const shortcut of searchShortcuts) {
        if (shortcut === 'Cmd+K' && (event.metaKey || event.ctrlKey) && event.key === 'k') {
          event.preventDefault()
          setIsOpen(true)
          inputRef.current?.focus()
          return
        }
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
            handleSelect(item)
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, results, selectedIndex, searchShortcuts, handleSelect])

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && isOpen) {
      const selectedElement = document.getElementById(`search-option-${selectedIndex}`)
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
        })
      }
    }
  }, [selectedIndex, isOpen])

  // Sync external searchQuery using key prop instead of effect
  const queryValue = searchQuery !== undefined ? searchQuery : query

  const hasResults = results.length > 0

  return (
    <div ref={containerRef} className="relative">
      {/* Search Input */}
      <div className="relative" role="combobox" aria-expanded={isOpen} aria-haspopup="listbox" aria-controls="search-results">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={queryValue}
          onChange={(e) => {
            setQuery(e.target.value)
            searchFn(e.target.value)
            setIsOpen(true)
            setSelectedIndex(-1)
          }}
          onFocus={() => {
            setIsEditable(true);
            if (query.length >= 2) setIsOpen(true);
          }}
          onBlur={() => setIsEditable(false)}
          placeholder={placeholder}
          aria-label="Búsqueda"
          className={`${width} pl-9 pr-14 py-2 bg-muted rounded-md text-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-offset-1 transition-all`}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          name="generic-search"
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
        <div className={`absolute top-full left-0 mt-2 ${width} bg-popover text-popover-foreground border rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100`}>
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
              <p className="text-sm">Cargando resultados...</p>
            </div>
          ) : !hasResults ? (
            <div className="p-4 text-center text-muted-foreground">
              <p className="text-sm">
                {query.length >= 2
                  ? 'Sin resultados coincidentes'
                  : 'Ingreso de texto para iniciar búsqueda'}
              </p>
            </div>
          ) : (
            <div id="search-results" role="listbox" className="max-h-80 overflow-y-auto">
              {results.map((item, index) => {
                const isSelected = index === selectedIndex
                return (
                  <div
                    key={index}
                    role="option"
                    aria-selected={isSelected}
                    id={`search-option-${index}`}
                    className={`transition-colors ${
                      isSelected ? 'bg-muted' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => handleSelect(item)}
                  >
                    {renderResult(item, index, isSelected)}
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
