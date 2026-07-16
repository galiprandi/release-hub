import * as Dialog from "@radix-ui/react-dialog"
import * as Tooltip from "@radix-ui/react-tooltip"
import { X } from "lucide-react"

interface DialogCloseButtonProps {
	className?: string
}

export function DialogCloseButton({ className = "" }: DialogCloseButtonProps) {
	return (
		<Tooltip.Root delayDuration={0}>
			<Tooltip.Trigger asChild>
				<Dialog.Close asChild>
					<button
						type="button"
						className={`rounded-lg opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:outline-none focus-visible:ring-offset-1 ${className}`}
					>
						<X className="w-4 h-4" />
						<span className="sr-only">Cerrar</span>
					</button>
				</Dialog.Close>
			</Tooltip.Trigger>
			<Tooltip.Portal>
				<Tooltip.Content
					className="bg-popover text-popover-foreground border px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-[10000]"
					sideOffset={5}
				>
					Cerrar
					<Tooltip.Arrow className="fill-popover" />
				</Tooltip.Content>
			</Tooltip.Portal>
		</Tooltip.Root>
	)
}
