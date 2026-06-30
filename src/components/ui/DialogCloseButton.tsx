import * as Dialog from "@radix-ui/react-dialog"
import { X } from "lucide-react"

interface DialogCloseButtonProps {
	className?: string
}

export function DialogCloseButton({ className = "" }: DialogCloseButtonProps) {
	return (
		<Dialog.Close asChild>
			<button
				type="button"
				className={`rounded-lg opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:outline-none focus-visible:ring-offset-1 ${className}`}
			>
				<X className="w-4 h-4" />
				<span className="sr-only">Cerrar</span>
			</button>
		</Dialog.Close>
	)
}
