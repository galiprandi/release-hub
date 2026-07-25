import { Search, X } from 'lucide-react'
import { useRef, useState } from 'react'
import * as Tooltip from '@radix-ui/react-tooltip'

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
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setIsEditable(true)}
        onBlur={() => setIsEditable(false)}
        placeholder={placeholder}
        className="w-64 pl-9 pr-9 py-1.5 bg-muted/30 border border-border rounded-lg text-[13px] focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none focus-visible:ring-offset-1 transition-all placeholder:text-muted-foreground/70"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        readOnly={!isEditable}
      />
      {query && (
        <Tooltip.Root delayDuration={0}>
          <Tooltip.Trigger asChild>
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted/30 rounded-full text-muted-foreground transition-all focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none focus-visible:ring-offset-1"
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
    </div>
  )
}
