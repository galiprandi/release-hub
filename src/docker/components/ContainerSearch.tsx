import { Search, X } from 'lucide-react'
import { useRef, useState } from 'react'

interface ContainerSearchProps {
  query: string
  setQuery: (query: string) => void
  placeholder?: string
}

export function ContainerSearch({ query, setQuery, placeholder = "Buscar contenedor..." }: ContainerSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isEditable, setIsEditable] = useState(false)

  const handleClear = () => {
    setQuery('')
    inputRef.current?.focus()
  }

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setIsEditable(true)}
        onBlur={() => setIsEditable(false)}
        placeholder={placeholder}
        className="w-64 pl-9 pr-9 py-1.5 bg-muted/40 border border-border/60 rounded-lg text-[13px] focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:outline-none focus-visible:ring-offset-1 transition-all placeholder:text-muted-foreground/40"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        readOnly={!isEditable}
      />
      {query && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted-foreground/10 rounded-full text-muted-foreground transition-all"
          aria-label="Limpiar búsqueda"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
